const { randomUUID } = require("crypto");

const Extensions = require("../../../../../core/class/Extensions.class");
const ApiError = require("../../../../../core/exceptions/ApiError");

const connection = require('../../../../../core/db/connection');

const ProcessingClass = require("../Processing.class");

const CubeQueryBuilderClass = require("../../../../metadata-cubes-query");
const CubesClass = require("../../../../metadata-cubes/services/metadata/Cubes.class");

const ProcessingModel = require("../models/Processing.model");

const { stringToUUID, decart } = require("../../../../utils/services");

const constants = require("../../../constants");

const Processing = new ProcessingClass();

const ORDER_DIR = 'DESC';

const JOIN_TYPE = 'LEFT';

const BATCH_SIZE = 100_000;

/**
 * @typedef {import('../../../../../db/rls/types/WhereOptions').WhereOptions} WhereOptions
 * @typedef {import("../../../../../db/rls/types/WhereOptions").TAggField} TAggField
 * @typedef {import("../Processing.class").ProcessingOptionsI} ProcessingOptionsI
 * @typedef {import("../../../../../db/rls/types/WhereOptions").TField} TField
 * @typedef {import("../Processing.class").ProcessingTreeI} ProcessingTreeI
 * @typedef {import('sequelize').Transaction} Transaction
 * @typedef {import("../Processing.class").RefI} RefI
 */

class CalculationProcessingClass extends Extensions {
    /**
     * @public
     * 
     * @param {string} [id] - id записи которую хотите просчитать
     * 
     * @returns {Promise<{ result: boolean }>}
     */
    async calculate(id) {
        const where = { status: constants.Statuses.pending };
        if (id) where.id = id;

        const processing = await ProcessingModel.findOne({ where, raw: true });

        if (!processing) return { result: false };

        const transactionRow = await connection.transaction();
        const transaction = await connection.transaction();

        try {
            await ProcessingModel.update({ status: constants.Statuses.in_progress }, { where: { id: processing.id } }, { transaction: transactionRow });

            const { cube_id: cubeId, layer_id: layerId, processing_id: processingId, date } = processing;

            const tableInfo = await Processing.tableInfo(Processing, processingId);

            const { options, measures, dimensions } = await this.generateOptions({ layerId, date, tableInfo });

            const meta = new CubesClass();

            const [info, layerTableInfo] = await Promise.all([meta.info(meta, cubeId), meta.tableInfo(meta, cubeId)]);

            const qb = new CubeQueryBuilderClass({ id: layerId, info, tableInfo: layerTableInfo, isProcessing: false });

            options.batchSize = BATCH_SIZE;

            const { generators } = await qb.readGenerator(layerId, options, this.prepareLayer(layerTableInfo.Infoservices[layerId]));

            if (!generators.length) return { result: true };

            for await (const rows of generators) {
                for await (const value of rows) {
                    await this.processRows({ rows: value, measures, dimensions, processing });
                }
            }

            await ProcessingModel.update({ status: constants.Statuses.resolved }, { where: { id: processing.id } }, { transaction: transactionRow });

            await transaction.commit();
            await transactionRow.commit();

            return { result: true };
        } catch (e) {
            await transaction.rollback();
            await transactionRow.rollback();

            await ProcessingModel.update({ status: constants.Statuses.rejected }, { where: { id: processing.id } });

            throw e;
        }
    }

    /**
     * @private
     * 
     * @param {{ 
     *   processing: { date: Date, layer_id: string, processing_id: string },
     *   rows: object[],
     *   measures: { func: string, field: string, alias: string }[],
     *   dimensions: string[],
     *   transaction?: Transaction,
     * }} param0 
     */
    async processRows({ processing, rows, measures, dimensions, transaction }) {
        dimensions.sort();

        const { processing_id: processingId, layer_id: layerId, date } = processing;

        const result = rows.map((row) => this.generateBody({ row, date, layerId, processingId, measures, dimensions }));

        const meta = new ProcessingClass();

        const matrix = [];
        const values = [];

        for (const { matrixBody, valueBody } of result) {
            matrix.push(matrixBody);
            values.push(valueBody);
        }

        matrix.length && await meta.bulkCreate(processingId, matrix, { transaction, conflict: { fields: ['hash_id'], action: 'ignore' } });
        values.length && await meta.bulkCreateValues(processingId, values, { transaction, conflict: { fields: ['hash_id', 'layer_id', 'date'], action: 'ignore' } });

        return { result: true };
    }

    /**
     * @private
     * 
     * @param {{ row: object, date: Date, layerId: string, processingId: string, measures: { func: string, field: string, alias: string }[], dimensions: string[] }} param0 
     */
    generateBody({ row, date, layerId, processingId, measures, dimensions }) {
        /** @type {string} */
        let id = '';

        /** @type {object} */
        const matrixBody = {};

        /** @type {object} */
        const valueBody = {
            layer_id: layerId,
            delivery_id: processingId
        };

        for (const key of dimensions) {
            id += row[key];
            matrixBody[key] = row[key];
        }

        for (const key of measures) {
            valueBody[key.alias] = row[key.alias];
        }

        /** @type {string} */
        const hashId = stringToUUID(id);

        matrixBody.hash_id = hashId;

        valueBody.hash_id = hashId;
        valueBody.date = date;
        valueBody.id = randomUUID();

        return { matrixBody, valueBody };
    }

    /**
     * @private
     * 
     * @param {{ layerId: string, date: Date, tableInfo: ProcessingTreeI }} date 
     */
    async generateOptions({ layerId, date, tableInfo }) {
        /** @type {TField[]} */
        const attributes = [];
        const dimensions = [];
        const measures = [];
        const timeDimension = tableInfo.TimeDimension.nameField;

        for (const field in tableInfo.Dimensions) {
            const dimension = tableInfo.Dimensions[field];
            attributes.push(dimension.nameField);

            if (dimension.nameField !== tableInfo.TimeDimension.nameField) {
                dimensions.push(dimension.nameField);
            }
        }

        for (const field in tableInfo.Measures) {
            const measure = tableInfo.Measures[field];

            measure.aggFuncs.forEach((func) => {
                /** @type {TAggField} */
                const measureField = {
                    field: measure.nameField,
                    alias: `${measure.nameField}${constants.delimeter}${func}`,
                    func
                };

                attributes.push(measureField);
                measures.push(measureField);
            });
        }

        if (!timeDimension) {
            throw ApiError.BadRequest('Не указано измерение времени');
        }

        /** @type {string[]} */
        const group = [];

        attributes.forEach(attr => typeof attr !== 'object' && group.push(attr));

        const where = { [timeDimension]: date, };

        const aggfunc = {};

        const order = [...dimensions, ...measures].map((item) => [item.alias || item, ORDER_DIR]);

        const values = measures.map((i) => i.field);

        const settings = {
            attributes,
            columns: [],
            index: [],
            aggfunc,
            values,
            order,
        };

        measures.forEach((item) => {
            aggfunc[item.field] ||= [];

            aggfunc[item.field].push({
                ...item,
                name: item.func,
                layer: { layer: { manifest: { settings: { ref: { value: layerId } } } } }
            });
        });

        const options = {
            where,
            group,
            order,
            layerId,
            settings,
            attributes,
            withOutRefs: true,
            withOutCount: true,
        };

        return { options, measures, dimensions };
    }

    /**
     * @public
     * 
     * @param {*} id 
     */
    async matrix(id) {
        const processing = await ProcessingModel.findOne({ where: { id }, raw: true });
        if (!processing) return { result: false };

        const transaction = await connection.transaction();

        try {
            const { cube_id: cubeId, layer_id: layerId, processing_id: processingId, date } = processing;

            const tableInfo = await Processing.tableInfo(Processing, processingId);

            const matrix = await this.generateMatrix({ layerId, date, tableInfo });

            const arr = await this.generateMatrixOptions({ layerId, date, tableInfo, matrix });

            for (const item of arr) {
                const { options, measures, dimensions } = item;

                const meta = new CubesClass();

                const [info, tableInfo] = await Promise.all([meta.info(meta, cubeId), meta.tableInfo(meta, cubeId)]);

                const qb = new CubeQueryBuilderClass({ id: layerId, info, tableInfo, isProcessing: false });

                options.batchSize = BATCH_SIZE;

                const { generators } = await qb.readGenerator(layerId, options, this.prepareLayer(tableInfo.Infoservices[layerId]));

                if (!generators.length) break;

                for await (const rows of generators) {
                    for await (const value of rows) {
                        await this.processRows({ rows: value, measures, dimensions, processing });
                    }
                }
            }

            await transaction.commit();

            return { result: true };
        } catch (e) {
            await transaction.rollback();

            throw e;
        }
    }

    /**
     * @private
     * 
     * @param {object} tableInfo 
     */
    prepareLayer(tableInfo) {
        for (const key in tableInfo.Field) {
            const val = tableInfo.Field[key];

            val.joinType = JOIN_TYPE;
        }

        return tableInfo;
    }

    /**
     * @private
     * 
     * @param {{ layerId: string, date: Date, tableInfo: ProcessingTreeI }} date
     */
    generateMatrix({ tableInfo }) {
        const keys = Object
            .values(tableInfo.Matrix)
            .map((item) => ({ field: item.nameField, maxLevel: item.maxLevel }))
            .sort((a, b) => a.field.localeCompare(b.field));

        const prepMatrix = keys.reduce((acc, { maxLevel }) => {
            acc.push(new Array(maxLevel || 1).fill(0).map((_, i) => i - 1));

            return acc;
        }, []);

        const matrix = decart(prepMatrix)
            .flat(keys.length - 1)
            .map((row) =>
                row.map((level, index) => {
                    const field = keys[index].field;

                    return { field, level };
                })
            );

        return matrix;
    }

    /**
     * @private
     * 
     * @param {{ layerId: string, date: Date, tableInfo: ProcessingTreeI, matrix: { field: string, level: number }[][] }} date 
     */
    async generateMatrixOptions({ layerId, date, tableInfo, matrix }) {
        const dimensions = [];
        const measures = [];
        const timeDimension = tableInfo.TimeDimension.nameField;

        for (const field in tableInfo.Dimensions) {
            const dimension = tableInfo.Dimensions[field];
            if (dimension.nameField !== tableInfo.TimeDimension.nameField) {
                dimensions.push(dimension.nameField);
            }
        }

        const aggfunc = {};
        for (const field in tableInfo.Measures) {
            const measure = tableInfo.Measures[field];

            measure.aggFuncs.forEach((func) => {
                const field = measure.nameField;
                const alias = `${measure.nameField}${constants.delimeter}${func}`;

                /** @type {TAggField} */
                const measureField = { field, alias, func };

                measures.push(measureField);

                aggfunc[field] ||= [];
                aggfunc[field].push({
                    ...measureField,
                    name: func,
                    layer: { layer: { manifest: { settings: { ref: { value: layerId } } } } }
                });
            });
        }

        if (!timeDimension) {
            throw ApiError.BadRequest('Не указано измерение времени');
        }

        const where = { [timeDimension]: date, };

        const values = measures.map((i) => i.field);

        const data = matrix.map((row) => {
            const localWhere = row.reduce(
                (acc, { field, level }) => {
                    acc[field] = { ['__level__']: level };
                    return acc;
                },
                {}
            );

            const attributes = row.map(({ field }) => field);

            const order = [...attributes, ...measures].map((item) => [item.alias || item, ORDER_DIR]);

            const settings = {
                attributes: [...attributes, ...measures],
                systemWhere: localWhere,
                columns: attributes,
                where,
                index: [],
                aggfunc,
                values,
                order,
            };

            const options = {
                where,
                order,
                layerId,
                settings,
                columns: attributes,
                withOutRefs: true,
                withOutCount: true,
                systemWhere: localWhere,
                attributes: [...attributes, ...measures],
            };

            return { options, measures, dimensions };
        });

        return data;
    }
}

module.exports = CalculationProcessingClass;
