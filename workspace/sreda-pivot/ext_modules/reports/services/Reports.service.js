const ReportsClass = require('../../metadata-reports/services/Reports.service');
const { randomUUID } = require('crypto');
const MemorySave = require("../../../core/services/memory-save");
const Extensions = require('../../../core/class/Extensions.class');
const ApiError = require('../../../core/exceptions/ApiError');
const { sleep, hop } = require('../../utils/services');

/**
 * @typedef {import("sequelize").FindOptions} SequelizeFindOptions
 */

const ReportsService = new ReportsClass();

class ReportService extends Extensions {
    async getAnswerKey(answerId) {
        return `reportsAnswer_${answerId}`;
    }

    /**
     * Логгер
     * @private
     * 
     * @param {object} meta 
     * @param {string} msg 
     * @returns {void}
     */
    async console(msg, meta) {
        // SREDA-overload
    }

    /**
     * @param {string} id
     * @param {SequelizeFindOptions} params
     * @param {object} options
     */
    async get(id, params, options) {
        const answerId = randomUUID();

        let result = { answerId, status: 'wait', params, table: {}, totalRows: 0 };

        const answerKey = await this.getAnswerKey(answerId);
        await MemorySave.set(answerKey, result, { isLocal: false, ttl: sreda.env?.PIVOT_ANSWER_TTL || 1000 * 60 * 5 });

        result = (await Promise.race([this._get(result, id, params, options), sleep(1_000)])) ?? result;

        if (result?.status === 'error') {
            throw ApiError.ServerError('Ошибка при формировании отчеты', [result.errors], { answerId });
        }

        return result;
    }

    async prepare(params) {
        /** @type {string[]} */
        const columns = params.columns.map(({ name }) => name);

        const fields = {};
        for (let i = 0; i < params.columns.length; i++) {
            const column = params.columns[i];
            const children = [];
            (column.child || []).forEach((column) => {
                column.name && children.push(column.name);
            });

            if (children.length) {
                fields[column.name] ||= {};
                fields[column.name].children = children;
            }
        }

        const layers = {};
        params.layers.forEach((layer) => {
            if (layer?.ref) {
                layers[layer.name] = { ...layer, ref: layer?.ref };
            }
        });

        const calcColumns = params.values
            .map(({ child, name }) => {
                if (child?.length) {
                    return child.map(({ sqlName: func }) => {
                        return { alias: `${name}:->:${func}`, field: name, func };
                    });
                }

                return { alias: `${name}:->:COUNT`, field: name, func: 'COUNT' };
            })
            .flat();

        /** @type {Record<string, string | string[] | object>} */
        return {
            isMask: false,
            layers,
            fields,
            where: params.where,
            order: Object.values(params.order ?? []).flat(1),
            limit: params?.limit ?? 20_000,
            offset: params?.offset ?? 0,
            attributes: columns.concat(calcColumns),
            group: calcColumns.length > 0 ? columns : [],
        };
    }

    async table(id, json) {
        await this.console(`Формируем таблицу`);

        return await ReportsService.read(id, json);
    }

    async postprocess({ treeObject, result }, json) {
        const Dimensions = structuredClone(treeObject.Dimensions);
        const gRefs = {};
        const columns = [...json.attributes];
        if (Object.keys(json.layers).length > 1) {
            columns.push('layer');

            Dimensions.layer = { name: 'Слои', description: 'Слои', field: 'layer' };

            gRefs.layer = Object.fromEntries(
                Object.keys(json.layers)
                    .map(name => [name, json.layers[name].description])
            );
        }

        const gRefFields = {};
        let totalRows = 0;
        const data = result.map(({ rows, refs, refFields, count }) => {
            const _gRefFields = Object.fromEntries(
                Object.keys(refFields)
                    .filter(key => hop(refFields, key))
                    .map(key => [key, refFields[key]])
            )
            Object.assign(gRefFields, _gRefFields);

            Object.keys(refs).forEach((field) => {
                gRefs[field] = { ...gRefs[field], ...refs[field] };
            });

            totalRows += count;

            return rows.map(row =>
                columns.map(col => {
                    let key = col;
                    if (Array.isArray(col)) {
                        key = col[0];
                    } else if (typeof col === 'object') {
                        key = col.alias;
                    }
                    return row[key];
                })
            );
        }).flat();

        return {
            table: {
                data,
                columns,
                index: [],
            },
            totalRows,
            refs: gRefs,
            refFields: gRefFields,
            treeObject: {
                Measures: structuredClone(treeObject.Measures),
                Dimensions
            }
        };
    }

    /**
     * @protected
     *
     * @param {string} id
     * @param {object} params
     * @param {object} options
     */
    async _get(result, id, params, options) {
        try {
            const json = await this.prepare(params);

            const _result = await this.table(id, json);

            const table = await this.postprocess(_result, json);

            await this.console('Закончили формировать таблицу!');

            result = {
                ...result,
                status: 'ok',
                table: table.table,
                refs: table.refs,
                refFields: table.refFields,
                totalRows: table.totalRows,
                treeObject: table.treeObject
            };
        } catch (e) {
            const CubesClass = require('../../metadata-cubes/services/metadata/Cubes.class');
            if (CubesClass.isRecoverableQueryError(e)) {
                result = {
                    ...result,
                    status: 'ok',
                    table: { data: [], columns: [] },
                    refs: {},
                    refFields: {},
                    totalRows: 0,
                    warnings: [e.message || String(e)],
                };
            } else {
                result = {
                    ...result,
                    status: 'error',
                    message: e.message,
                    stack: e.stack,
                    errors: [],
                    payload: {
                        answerId: result.answerId
                    }
                };
            }
        } finally {
            const answerKey = await this.getAnswerKey(result.answerId);
            await MemorySave.set(answerKey, result, { isLocal: false, ttl: sreda.env?.PIVOT_ANSWER_TTL || 1000 * 60 * 5 });
        }

        if (result.status === 'error') {
            result.status = 500;
            throw result;
        }

        return result;
    }

    async getTableDataResults(id, answerId, options) {
        const answerKey = await this.getAnswerKey(answerId);

        const result = await MemorySave.get(answerKey, { isLocal: false });
        if (!result) {
            throw ApiError.BadRequest('Не найден статус формирования отчета. Попробуйте еще раз.', [], { answerId });
        }

        if (result.status === 'error') {
            result.status = 500;
            throw result;
        }

        // if (result.status !== 'wait') {
        //     await MemorySave.deleteFromMemory(answerKey, { isLocal: false });
        // }

        return result;
    }
}

module.exports = ReportService;
