const ApiError = require('../../../../core/exceptions/ApiError');
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');
const ConnectorClass = require('../../../metadata-connector/services/metadata/Connector.class');

const constants = require('../../constants');

const { isEmptyObject, arrToMap } = require('../../../utils/services');
const { randomUUID } = require('crypto');

const Measures = require('./shared/Measures.class');
const Dimensions = require('./shared/Dimensions.class');
const MatrixClass = require('./shared/Matrix.class');

const cubeConstants = require('../../../metadata-cubes/constants');

/**
 * @typedef {object} ProcessingOptionsI
 * @property {TField[]} attributes
 * @property {string[]} group
 * @property {WhereOptions} where
 * @property {boolean} returning
 * @property {Transaction} transaction
 */

/**
 * @typedef {object} ProcessingTreeI
 * @property {Record<string, ProcessingKeyI>} Keys
 * @property {Record<string, ProcessingFieldI>} FieldsGUID
 * @property {Record<string, ProcessingMeasuresI>} Measures
 * @property {Record<string, ProcessingDimensionsI>} Dimensions
 * @property {Record<string, ProcessingTabularPartsI>} TabularParts
 * @property {Record<string, ProcessingMatrixI>} Matrix
 * @property {Record<string, RefI>} Infoservices
 * @property {ProcessingDimensionsI} TimeDimension
 */

/**
 * @typedef {object} RefI
 * @property {string} value
 * @property {string} link
 */

/**
 * @typedef {object} ProcessingTabularPartsI
 * @property {{ FieldsGUID: Record<string, ProcessingFieldI>, Keys: Record<string, ProcessingKeyI> }} info
 * @property {string} name
 * @property {string} description
 * @property {string} table
 */

/**
 * @typedef {object} ProcessingKeyI
 * @property {string} name
 * @property {Record<string, Record<string, string>>} fields
 * @property {{ primarykey?: boolean, unique?: boolean }} [settings]
 */

/**
 * @typedef {object} ProcessingFieldI
 * @property {string} field
 * @property {string} name
 * @property {string} description
 * @property {string} id
 * @property {boolean} [increment]
 * @property {boolean} [notnull]
 * @property {string} type
 */

/**
 * @typedef {object} ProcessingDimensionsI
 * @property {string} id
 * @property {boolean} onoff
 * @property {string} type
 * @property {string} nameField
 * @property {"none" | "date" | "account"} dimensionType
 */

/**
 * @typedef {object} ProcessingMatrixI
 * @property {string} id
 * @property {boolean} onoff
 * @property {string} nameField
 * @property {number} maxLevel
 */

/**
 * @typedef {object} ProcessingMeasuresI
 * @property {string} id
 * @property {boolean} onoff
 * @property {string} nameField
 * @property {string[]} aggFuncs
 */

/**
 * @typedef {object} BodyI
 * @property {string} id
 * @property {string} cube_id
 * @property {string} settings
 * @property {string} status
 * @property {Date} date
 */

/**
 * @typedef {import('../../../../db/rls/types/WhereOptions').TField} TField
 * @typedef {import('sequelize').Transaction} Transaction
 * @typedef {import('../../../metadata-cmp/db/models/metadata').IMetadata} IMetadata
 * @typedef {import('../../../../db/rls/types/WhereOptions').WhereOptions} WhereOptions
 */

class ProcessingClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Processing';
        this.id = constants[name].id;
        this.component = constants[name].component;


        this.childrenCRUD = ['r', 'u', 'd', 'rls'];

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c', 'rls'],
            routes: constants[name].routes,
            parent: props?.parent,
        };
    }

    /**
     * @public
     * 
     * @param {*} innerResult 
     * @param {*} functionParams 
     * @returns 
     */
    async subTreeAfter(innerResult, functionParams) {
        const item = functionParams._args[0];
        const options = functionParams._args[1];

        const promise = new ProcessingClass({ owner_id: item.id, parent: item }).tree(options)

        innerResult ||= [];
        innerResult.push(await promise);

        return innerResult
    }

    /**
     * @public
     * 
     * @param {ProcessingClass} meta 
     * @param {string} id 
     * @param {{ markdel?: 0 | 1 | [0, 1]; transaction?: Transaction }} [options] 
     * 
     * @returns {Promise<ProcessingTreeI>}
     */
    async tableInfo(meta, id, options) {
        const { transaction } = options ?? {};

        const [{ parents, children }, item] = await Promise.all([
            meta.getFamilyTree(id, { transaction }),
            this.getItem(id, { transaction })
        ]);

        return this.generateTableInfo({ parents, children, item });
    }

    /**
     * @public
     * 
     * @param {any} _ 
     * @param {{ options: { parent: IMetadata, children: IMetadata[], id: string }}} functionParams 
     */
    async processingTableInfoDecorate(_, functionParams) {
        const options = functionParams._args[1];
        const id = options.id;

        const meta = new ProcessingClass({ id });

        const [{ parents, children }, item] = await Promise.all([
            meta.getFamilyTree(id, {}),
            this.getItem(id, {})
        ]);

        return this.generateTableInfo({ parents, children, item });
    }

    /**
     * TODO
     * 
     * @public
     * 
     * @param {string} id 
     * @param {object} inputOptions 
     */
    async query(id, inputOptions) {
        // const options = structuredClone(inputOptions || {});

        const meta = new ProcessingClass({ id });

        const [item] = await Promise.all([meta.getItem(id, { ...inputOptions }), this.tableInfo(meta, id, inputOptions)]);

        const { table, onoff } = item.manifest.settings;
        if (onoff) {
            throw ApiError.AccessRestricted(`Процессинг ${table} заблокирован для запросов ${item?.name}`);
        }

        const { connectorData } = await this.getConnector(item);

        const schema = connectorData.manifest.settings.schema;

        const sql = `select * from "${schema}"."${table}" matrix inner join "${schema}"."${table + '_value'}" "val" on "matrix"."hash_id" = "val"."hash_id" where "layer_id" = '${id}';`;

        const query = {
            table: sql,
            alias: 'processing',
        }

        return { query }
    }

    /**
     * @param {string} infoserviceId 
     * @param {string} processingId 
     * @returns {Promise<string>}
     */
    async table(infoserviceId, processingId) {
        const meta = new ProcessingClass({ id: processingId });

        const item = await meta.getItem(processingId);

        const { table } = item.manifest.settings;

        const { connectorData } = await this.getConnector(item);

        const schema = connectorData.manifest.settings.schema;

        const sql = `select * from "${schema}"."${table}" matrix inner join "${schema}"."${table + '_value'}" "val" on "matrix"."hash_id" = "val"."hash_id" where "layer_id" = '${infoserviceId}';`;

        return sql;
    }

    /**
     * @public
     * 
     * @param {*} item 
     * @param {*} options 
     */
    async subTree(item, options = {}) {
        const children = [];

        const subTree = [Measures, Dimensions, MatrixClass]

        const InfoserviseList = await Promise.all(
            subTree.map(entity => new entity({ owner_id: item.id, parent: this.props.parent }).tree(options))
        );

        children.push(...InfoserviseList);

        return children;
    }

    /**
     * @public
     * 
     * @param {string} id 
     * @param {object} inputOptions 
     */
    async read(id, inputOptions) {
        const options = structuredClone(inputOptions || {});

        const meta = new ProcessingClass({ id });

        const [item, treeObject] = await Promise.all([meta.getItem(id, { ...inputOptions }), this.tableInfo(meta, id, inputOptions)]);

        const { table, onoff } = item.manifest.settings;
        if (onoff) {
            throw ApiError.AccessRestricted(`Процессинг ${table} заблокирован для запросов ${item?.name}`);
        }

        const { connector } = await this.getConnector(item);
        if (!connector) {
            throw ApiError.BadRequest(`Не указан коннектор`);
        }

        const attributes = Object.values(treeObject.FieldsGUID).map((item) => item.field);

        if (!options.attributes?.length) {
            options.attributes = attributes;
        }

        const [rows, count] = await Promise.all([
            connector.findAll(table, options),
            !options.withOutCount ? connector.count(table, options) : -1,
        ]);

        const cols = Object.values(treeObject.FieldsGUID);

        return {
            rows,
            cols,
            refs: {},
            refFields: {},
            count,
            offset: options.offset ?? 0,
            limit: options.limit,
            options,
            metadata: { ...item, treeObject },
        };
    }

    /**
     * @public
     *
     * @param {string} id
     * @param {object} body
     * @param {{ returning?: boolean, transaction?: Transaction }} [options]
     * @returns {Promise<{ result: boolean }>}
     */
    async create(id, body, options = {}) {
        return this.bulkCreate(id, [body], options);
    }

    async bulkCreate(id, values, options = {}) {
        const { returning, transaction, conflict } = options;

        const meta = new ProcessingClass({ id });

        const [treeObject, item] = await Promise.all([
            meta.tableInfo(meta, id, { transaction }),
            meta.getItem(id, { transaction })
        ]);

        const { table } = item.manifest.settings;

        const { connector } = await this.getConnector(item);

        const bodies = values.map((value) => this.parseBody(value, treeObject));

        let data = { result: true }
        if (bodies.length) {
            data = await connector.bulkCreate(table, bodies, { returning, transaction, conflict });
        }

        return data;
    }

    /**
     * @public
     *
     * @param {string} id
     * @param {object} body
     * @param {{ returning?: boolean, transaction?: Transaction, confilct?: object }} [options]
     * @returns {Promise<{ result: boolean, data: any }>}
     */
    async createValue(id, body, options = {}) {
        return await this.bulkCreateValues(id, [body], options);
    }

    /**
     * @public
     *
     * @param {string} id
     * @param {object[]} values
     * @param {{ returning?: boolean, transaction?: Transaction, conflict?: object }} [options]
     * @returns {Promise<{ result: boolean, data: any }>}
     */
    async bulkCreateValues(id, values, options) {
        const { returning, transaction, conflict } = options;

        const meta = new ProcessingClass({ id });

        const item = await meta.getItem(id);

        const { table } = item.manifest.settings;

        const valueTable = `${table}_value`;

        const { connector } = await this.getConnector(item);

        const data = await connector.bulkCreate(valueTable, values, { returning, transaction, conflict });

        return data;
    }

    /**
     * @public
     * 
     * @param {string} id
     * @returns
     */
    async model(id) {
        const meta = new ProcessingClass({ id });
        const item = await meta.getItem(id);

        const { table } = item.manifest.settings;
        const { connector } = await this.getConnector(item);

        const tableNames = [
            table,
            `${table}_value`,
        ];

        const result = {};
        for (const table of tableNames) {
            result[table] = await connector.model(table);
        }

        return result;
    }

    /**
     * @public
     * 
     * @param {string} id 
     * @param {object} fieldsSettings 
     * 
     * @returns {Promise<{ result: boolean[] }>}
     */
    async synch(id, fieldsSettings) {
        const meta = new ProcessingClass({ id });

        const [
            item,
            treeObject
        ] = await Promise.all([
            meta.getItem(id),
            meta.tableInfo(meta, id, {})
        ]);

        if (isEmptyObject(treeObject.Dimensions) || isEmptyObject(treeObject.Measures)) {
            throw ApiError.BadRequest(`Не описаны данные о мерах и измерениях`);
        }

        const { table } = item.manifest.settings;
        const { connector } = await this.getConnector(item);

        const fields = arrToMap(Object.values(treeObject.FieldsGUID), 'field');

        const Tables = {
            [table]: {
                Fields: fields,
                fieldsSettings: fieldsSettings[table].table,
                Keys: treeObject.Keys,
            }
        };

        for (const TBName in treeObject.TabularParts) {
            const fields = arrToMap(
                Object.values(treeObject.TabularParts[TBName].info.FieldsGUID),
                'field'
            );

            Tables[TBName] = {
                Fields: fields,
                fieldsSettings: fieldsSettings[TBName].table,
                Keys: treeObject.TabularParts[TBName].info.Keys,
            };
        }

        const result = [];
        for (const table in Tables) {
            const data = await connector.synch(table, Tables[table]);
            result.push(data);
        }

        return { result };
    }

    /**
     * @public
     * 
     * @param {string} id 
     * @returns {Promise<{ result: boolean }>}
     */
    async drop(id) {
        const meta = new ProcessingClass({ id });

        const [item, treeObject] = await Promise.all([meta.getItem(id), meta.tableInfo(meta, id, {})]);

        const { connector } = await this.getConnector(item);

        const { table } = item.manifest.settings;

        const TabularPartsData = Object.keys(treeObject.TabularParts);
        const Tables = [table, ...TabularPartsData];

        for (const table of Tables) {
            await connector.drop(table);
        }

        return { result: true };
    }

    /**
     * @private
     * 
     * @param {BodyI} body 
     * @param {ProcessingTreeI} treeObject 
     */
    parseBody(body, treeObject) {
        body.id ||= randomUUID();

        const res = {};

        const fields = arrToMap(Object.values(treeObject.FieldsGUID), 'field');

        Object.keys(body).forEach((key) => {
            if (!fields[key]) return;

            res[key] = body[key];
        });

        return res;
    }

    /**
     * @private
     * 
     * @param {string} cubeId 
     * @returns {Promise<Record<string, RefI>>}
     */
    async getCubeInfoservices(cubeId) {
        const infoserviceList = await this.getChildren(cubeId, cubeConstants.Infoservices.id);

        /** @type {RefI[]} */
        const metaArr = infoserviceList.map(item => JSON.parse(item.manifest).settings.ref);

        return arrToMap(metaArr, 'value');
    }

    /**
     * @private
     * 
     * получить коннектор
     *
     * @param {any} item
     */
    async getConnector(item) {
        let connectorId = item.manifest.settings.connector;
        connectorId = typeof connectorId === 'object' ? connectorId.value : connectorId;

        const Connector = new ConnectorClass();
        const { connector, connectorData } = await Connector.getConnector(connectorId);

        return { connector, connectorData };
    }

    /**
     * @private
     * 
     * @param {{ parents: IMetadata[], children: Record<string, IMetadata[]>, item: IMetadata }} param0 
     * @returns {Promise<ProcessingTreeI>}
     */
    async generateTableInfo({ parents, children, item }) {
        const { table } = item.manifest.settings;

        const InfoservicesPromise = this.getCubeInfoservices(item.owner_id);

        const valueTable = `${table}_value`;

        /** @type {Record<string, ProcessingDimensionsI>} */
        const Dimensions = {};
        /** @type {Record<string, ProcessingMeasuresI>} */
        const Measures = {};

        /** @type {Record<string, ProcessingMatrixI>} */
        const Matrix = {};

        /** @typedef {Record<string, ProcessingKeyI>} */
        const Keys = {
            PK: {
                name: 'PK',
                fields: { hash_id: { field: 'hash_id', }, },
                settings: { primarykey: true, },
            },
        };

        /** @type {Record<string, ProcessingFieldI>} */
        const FieldsGUID = {
            hash_id: {
                field: "hash_id",
                name: "hash_id",
                description: "hash_id",
                id: "hash_id",
                notnull: true,
                type: 'UUID',
            }
        };

        const valueFields = {
            id: {
                field: "id",
                name: "id",
                description: "id",
                id: "id",
                notnull: true,
                defaultValue: 'UUID',
                type: 'UUID',
            },
            hash_id: {
                field: "hash_id",
                name: "hash_id",
                description: "hash_id",
                id: "hash_id",
                notnull: true,
                type: 'UUID',
            },
            layer_id: {
                field: "layer_id",
                name: "layer_id",
                description: "layer_id",
                id: "layer_id",
                notnull: true,
                type: 'UUID',
            },
            delivery_id: {
                field: "delivery_id",
                name: "delivery_id",
                description: "delivery_id",
                id: "delivery_id",
                notnull: true,
                type: 'UUID',
            },
            date: {
                field: "date",
                name: "date",
                description: "date",
                id: "date",
                notnull: true,
                type: 'DATE',
            },
        };

        const valueInfo = {
            FieldsGUID: valueFields,
            Keys: {
                PK: {
                    name: 'PK',
                    fields: { id: { id: 'id' } },
                    settings: { primarykey: true, },
                },
                main: {
                    name: 'main',
                    fields: {
                        hash_id: { field: 'hash_id' },
                        layer_id: { field: 'layer_id' },
                        date: { field: 'date' },
                    },
                    settings: { primarykey: false, unique: true },
                }
            }
        };

        /** @type {Record<string, ProcessingTabularPartsI>} */
        const TabularParts = {
            [valueTable]: {
                name: valueTable,
                description: valueTable,
                table: valueTable,
                info: valueInfo
            }
        };

        for (const child of parents) {
            if (child.class === 'ProcessingDimensionsList') {
                const fieldInfo = child.manifest.settings;

                Dimensions[fieldInfo.nameField] = {
                    id: child.id,
                    onoff: fieldInfo.onoff,
                    type: fieldInfo.type,
                    nameField: fieldInfo.nameField,
                    dimensionType: fieldInfo.dimensionType,
                };

                if (fieldInfo.dimensionType !== 'date') {
                    FieldsGUID[child.id] = {
                        id: child.id,
                        type: fieldInfo.type,
                        name: fieldInfo.nameField,
                        field: fieldInfo.nameField,
                        description: fieldInfo.nameField,
                    };
                }
            }

            if (child.class === 'ProcessingMeasuresList') {
                const fieldInfo = child.manifest.settings;

                const arr = children[child.id] || [];

                const aggFuncs = arr.map((item) => item.manifest.settings.aggrFunc);

                Measures[fieldInfo.nameField] = {
                    id: child.id,
                    onoff: fieldInfo.onoff,
                    nameField: fieldInfo.nameField,
                    aggFuncs,
                }

                aggFuncs.forEach((func) => {
                    const field = `${fieldInfo.nameField}${constants.delimeter}${func}`;

                    valueFields[field] = {
                        field: field,
                        name: field,
                        description: field,
                        id: field,
                        increment: false,
                        notnull: false,
                        type: 'FLOAT'
                    };
                })
            }

            if (child.class === 'ProcessingMatrix') {
                const fieldInfo = child.manifest.settings;

                Matrix[fieldInfo.nameField] = {
                    id: child.id,
                    onoff: fieldInfo.onoff,
                    nameField: fieldInfo.nameField,
                    maxLevel: fieldInfo.maxLevel,
                }
            }
        }

        const Infoservices = await InfoservicesPromise;

        const TimeDimension = Object.values(Dimensions).find((item) => item.dimensionType === 'date');

        return {
            Keys,
            Matrix,
            Measures,
            Dimensions,
            FieldsGUID,
            TabularParts,
            Infoservices,
            TimeDimension,
        };
    }
}

module.exports = ProcessingClass;
