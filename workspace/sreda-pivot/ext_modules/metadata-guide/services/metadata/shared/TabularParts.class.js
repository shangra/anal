const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const TabularSysFieldsClass = require('./TabularSysFields.class');
const TabularFieldsListClass = require('./TabularFieldsList.class');
const RefsClass = require('../../../../metadata-logic/refs.class');
const Refs = new RefsClass();
const ConnectorClass = require('../../../../metadata-connector/services/metadata/Connector.class');
const crypto = require('crypto');
const constants = require('../../../constants');
const ApiError = require('../../../../../core/exceptions/ApiError');

const httpContext = require('../../../../../core/services/http-context');

const { mergeDeep } = require('../../../../utils/services');

const QueueAgent = require('../../../../QueueAgent');
const TransactionAgent = require('../../../../TransactionAgent');

/**
 * @typedef {import("sequelize").Transaction} ITransaction
 * @typedef {import('../../../../metadata-cmp/services/metadata/source/type').default} LevelClassI
 */

/**
 * @class
 * @implements {LevelClassI}
 */
class TabularPartsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'TabularParts';

        this.id = constants[name].id;
        this.component = constants[name].component;
        this.owner_id = props.owner_id;

        this.props = {
            id: props?.id ?? this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c', 's'],
            routes: constants[name].routes,
            parent: props.parent,
        };
    }

    async subTree(item, options = {}) {
        const children = [];

        const TabularSysFields = await new TabularSysFieldsClass({
            owner_id: item.id,
            parent: this.props.parent,
        }).tree(options);
        children.push(TabularSysFields);

        const TabularFieldsList = await new TabularFieldsListClass({
            owner_id: item.id,
            parent: this.props.parent,
        }).tree(options);
        children.push(TabularFieldsList);

        return children;
    }

    async tableInfo(meta, id) {
        const children = await meta.getOwnerChildren(id);

        /** @type {Record<string, object & { notNull: boolean }>} */
        const Fields = {};
        /** @type {Record<string, object & { notNull: boolean }>} */
        const FieldsGUID = {};
        const Refs = {};

        for (const child of children) {
            if (child.class === 'TabularSysFields') {
                const fieldInfo = child.manifest.settings;

                const multiRef = fieldInfo.multiRef || [];

                Fields[fieldInfo.nameField] = {
                    field: fieldInfo.nameField,
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    increment: fieldInfo.increment ?? false,
                    notnull: fieldInfo.notnull ?? false,
                    type: fieldInfo.type,
                    default: fieldInfo.default,
                    show: fieldInfo.showfield,
                    len: fieldInfo.length,
                    multiRef,
                    multiRefFields: await this.getCompositeFields(multiRef, fieldInfo.nameField),
                    editing: fieldInfo.editing ?? true,
                };
                FieldsGUID[child.id] = Fields[fieldInfo.nameField];
            }
            if (child.class === 'TabularFieldsList') {
                const fieldInfo = child.manifest.settings;
                const ref = fieldInfo.ref !== '0' ? fieldInfo.ref : undefined;

                const multiRef = fieldInfo.multiRef || [];

                Fields[fieldInfo.nameField] = {
                    id: child.id,
                    field: fieldInfo.nameField,
                    name: child.name,
                    description: child.description,
                    increment: fieldInfo.increment ?? false,
                    notnull: fieldInfo.notnull ?? false,
                    type: fieldInfo.type,
                    ref,
                    show: fieldInfo.showfield,
                    len: fieldInfo.length,
                    precision: fieldInfo.precision,
                    multiRef,
                    multiRefFields: await this.getCompositeFields(multiRef, fieldInfo.nameField),
                    editing: fieldInfo.editing ?? true,
                };
                FieldsGUID[child.id] = Fields[fieldInfo.nameField];
                if (ref) {
                    Refs[fieldInfo.nameField] = Fields[fieldInfo.nameField];
                }
                if (FieldsGUID[child.id].multiRefFields.length > 0) {
                    Refs[fieldInfo.nameField] = Fields[fieldInfo.nameField];
                }
            }
        }

        return {
            Fields,
            FieldsGUID,
            Refs,
        };
    }

    async getData(connector, treeObject, tabularGUID, options = {}) {
        const treeObjectTabular = treeObject.TabularPartsGUID[tabularGUID];
        const { table } = treeObjectTabular;

        const tabularMeta = new TabularPartsClass({ id: tabularGUID }); //tabular:

        if (!options.attributes) {
            options.attributes = [];
            for (const fieldName in treeObjectTabular.info.Fields) {
                options.attributes.push(fieldName);
            }
        }

        if (!options.group) {
            if (!options.order) {
                options.order = [['rank', 'ASC']];
            }
        }

        let rows = await tabularMeta.findAll(connector, table, { ...options });

        let refs = {};
        if (!options.withOutRefs && rows.length > 0) {
            const refsForLoad = {};
            Object.keys(rows[0]).forEach((field) => {
                if (treeObject.Refs[field]) {
                    refsForLoad[field] = treeObject.Refs[field];
                }
            });

            const localRefs = await Refs.getAllRefs(refsForLoad, rows);
            refs = mergeDeep(localRefs, refs);
        }

        if (rows.length > 0) {
            if (!options.withOutRefs) {
                refs = (
                    await Refs.getRefs({
                        rows,
                        options,
                        treeObject: treeObject.TabularPartsGUID[tabularGUID].info,
                    })
                ).refs;
            }
        }

        return {
            rows,
            refs,
        };
    }

    async mutableRows(rows = [], funcs = []) {
        const result = [];
        for (let row of rows) {
            for (let func of funcs) {
                row = await func(row);
            }
            result.push(row);
        }
        return result;
    }

    /* CRUD */

    async findAll(connector, table, options) {
        const result = await connector.findAll(table, { ...options });
        return result;
    }
    async count(connector, table, options) {
        const result = await connector.count(table, { ...options });
        return result;
    }
    async dataCreate(connector, table, values, options) {
        const result = await connector.create(table, values, options);
        return result;
    }
    async dataDelete(connector, table, options) {
        const appendOptions = { transaction: options.transaction }; //Нужно удалить из всей
        const result = await connector.delete(table, options, appendOptions);
        return result;
    }
    async dataUpdate(connector, table, values, options) {
        const result = await connector.update(table, values, options);
        return result;
    }
    async dataBulkCreate(connector, table, values, options) {
        const result = await connector.bulkCreate(table, values, options);
        return result;
    }
    async dataSynch(connector, table, options) {
        const result = await connector.synch(table, options);
        return result;
    }

    async read(id, tabular, inputOptions = {}) {
        const options = JSON.parse(JSON.stringify(inputOptions));
        let { connector, documentMeta, treeObject } = options;

        const tabularMeta = new TabularPartsClass({ id: tabular, owner_id: id });
        const tabularItem = await tabularMeta.getItem(tabular);
        const tabularMItem = await tabularMeta.item(tabularItem);

        // if (!documentMeta) {
        //     //Для обратной совместимости записи в таб.часть без шапки
        //     const DocumentsClass = require('../Documents.class');
        //     documentMeta = new DocumentsClass({ id });
        //     const item = await documentMeta.getItem(id);

        //     if (!connector) {
        //         connector = (await this.getConnector(item)).connector;
        //     }
        // }

        if (!treeObject) {
            treeObject = await documentMeta.tableInfo(documentMeta, id);
        }

        const treeObjectTabular = treeObject.TabularPartsGUID[tabular];

        const { rows, refs } = await this.getData(connector, treeObject, tabular, options);

        const cols = Object.values(treeObjectTabular.info.Fields);
        const count = rows.length;

        return {
            rows,
            cols,
            refs,
            count,
            offset: options.offset ?? 0,
            limit: options.limit,
            options,
            metadata: { ...tabularMItem, ...tabularItem, treeObject: treeObjectTabular.info },
        };
    }

    async update(id, tabular, body, inputOptions = {}) {
        let { returning, transaction } = inputOptions;

        const tabularParts = new TabularPartsClass({ id: tabular, owner_id: id });
        // const treeObject = await meta.tableInfo(meta, tabular);
        const item = await tabularParts.getItem(id);
        const itemTabular = await tabularParts.getItem(tabular);
        const { table } = itemTabular.manifest.settings;

        const { connector } = inputOptions.connector ? inputOptions : await this.getConnector(item);

        if (!transaction) {
            const transactionAgent = new TransactionAgent(connector);
            transaction = await transactionAgent.transaction();
        }

        const sessionStorage = httpContext.get('sessionStorage');
        const user = sessionStorage ? { ...sessionStorage.user } : { id: undefined };
        const updatedUser = user.id;

        const values = { ...body, updatedUser };
        const options = {
            transaction,
            returning,
            where: {
                id: values.id,
            },
        };

        const data = await tabularParts.dataUpdate(connector, table, values, options);
        return { result: data };
    }

    /**
     * Метод создания записей в табличных частях документов ДЗО.
     * @param {string} id Уникальный идентификатор родительских метаданных
     * @param {string} tabular Уникальный идентификатор табличной части
     * @param {any[]} items Массив строк для записи
     * @param {object} [options] Дополнительные опции
     * @param {boolean} [options.returning] Флаг того будет ли запрос возвращать вставленные строки
     * @param {object} [options.transaction] Транзакция
     * @param {number} [options.size] Кол-во загружаемых за раз строк
     * @returns {Promise<array>}
     * @override
     */
    async bulkCreate(id, tabular, items, inputOptions = {}) {
        let { transaction, size = 1_000 } = inputOptions;

        let result = [];
        if (!items?.length) {
            return result;
        }

        const tabularParts = new TabularPartsClass({ id: tabular, owner_id: id });
        const treeObject = await tabularParts.tableInfo(tabularParts, tabular);
        const [item, itemTabular] = await Promise.all([
            tabularParts.getItem(id),
            tabularParts.getItem(tabular),
        ]);

        const { table } = itemTabular.manifest.settings;

        const { connector } = inputOptions.connector ? inputOptions : await this.getConnector(item);

        if (!transaction) {
            const transactionAgent = new TransactionAgent(connector);
            transaction = await transactionAgent.transaction();
        }

        const sessionStorage = httpContext.get('sessionStorage');
        const user = sessionStorage ? { ...sessionStorage.user } : { id: undefined };
        const createdUser = user.id;
        const updatedUser = user.id;

        const allValues = items.map((body) => {
            const values = { ...body, createdUser, updatedUser };
            if (!values.id) {
                values.id = crypto.randomUUID();
            }
            delete values['code']; //опачки!!! если не удалять это поле, то не сохраняются старые + новые поля

            Object.keys(values).forEach((key) => {
                if (values[key] === '' && !values[key]) {
                    delete values[key];
                }
            });

            const errors = [];
            const required = this.getRequired(treeObject.Fields);
            required.forEach((key) => {
                if (values[key] === undefined) {
                    errors.push({
                        code: 1,
                        message: `Не заполнен обязательный параметр ${key}`,
                    });
                }
            });
            if (errors.length > 0) {
                throw new ApiError(500, 'Ошибка сохранения', errors);
            }

            return values;
        });

        let start = 0;
        while (start <= allValues.length) {
            let data = allValues.slice(start, start + size);
            if (!data.length) break;
            await tabularParts.dataBulkCreate(connector, table, data, { transaction });
            start += size;
        }
        return allValues;
    }

    /**
     * @param {string} id
     * @param {string} tabular
     * @param {object} body
     * @param {{ returning?: boolean, transaction?: ITransaction, queue: any }} [param3]
     * @returns {Promise<object>}
     */
    async create(id, tabular, body, options = {}) {
        const [result] = await this.bulkCreate(id, tabular, [body], options);
        return result;
    }

    async delete(id, tabular, body, inputOptions = {}) {
        let { transaction } = inputOptions;

        const tabularParts = new TabularPartsClass({ id: tabular, owner_id: id });
        const [item, itemTabular] = await Promise.all([
            tabularParts.getItem(id),
            tabularParts.getItem(tabular),
        ]);

        const { table } = itemTabular.manifest.settings;

        const { connector } = inputOptions.connector ? inputOptions : await this.getConnector(item);

        if (!transaction) {
            const transactionAgent = new TransactionAgent(connector);
            transaction = await transactionAgent.transaction();
        }

        const errors = [];
        const values = { ...body };
        const where = {
            id: values.id,
        };

        if (errors.length > 0) {
            throw new ApiError(500, 'Ошибка сохранения', errors);
        }

        const data = await tabularParts.dataDelete(connector, table, { where, transaction });
        return { result: data };
    }

    async deleteByOwner(id, tabular, owner, inputOptions = {}) {
        let { transaction } = inputOptions;

        const tabularParts = new TabularPartsClass({ id: tabular, owner_id: id });
        const [item, itemTabular] = await Promise.all([
            tabularParts.getItem(id),
            tabularParts.getItem(tabular),
        ]);

        const { table } = itemTabular.manifest.settings;

        const { connector } = inputOptions.connector ? inputOptions : await this.getConnector(item);

        if (!transaction) {
            const transactionAgent = new TransactionAgent(connector);
            transaction = await transactionAgent.transaction();
        }

        const errors = [];
        const where = {
            owner,
        };

        if (errors.length > 0) {
            throw new ApiError(500, 'Ошибка сохранения', errors);
        }

        const data = await tabularParts.dataDelete(connector, table, { where, transaction });
        return { result: data };
    }

    async synch(id, tabular, fieldsSettings, options = {}) {
        let { transaction } = options;

        const tabularParts = new TabularPartsClass({ id: tabular, owner_id: id });
        const treeObject = await tabularParts.tableInfo(tabularParts, tabular);
        const [item, itemTabular] = await Promise.all([
            tabularParts.getItem(id),
            tabularParts.getItem(tabular),
        ]);

        const { table } = itemTabular.manifest.settings;

        const { connector } = options.connector ? options : await this.getConnector(item);

        const Tables = {};
        Tables[table] = {
            Fields: treeObject.Fields,
            fieldsSettings: fieldsSettings[table].table,
            Keys: treeObject.Keys ?? {
                PK: {
                    name: 'PK',
                    fields: {
                        id: {
                            field: 'id',
                        },
                    },
                    settings: {
                        primarykey: true,
                    },
                },
            },
        };

        const result = await tabularParts.dataSynch(connector, table, Tables[table]);
        return result;
    }

    /**
     * получить коннектор
     * @param {any} item
     */
    async getConnector(item) {
        let connectorId = item.manifest.settings.connector;
        connectorId = typeof connectorId === 'object' ? connectorId.value : connectorId;

        const Connector = new ConnectorClass();
        const { connector, connectorData } = await Connector.getConnector(connectorId);

        return { connector, connectorData };
    }

    async getCompositeFields(multiRef, field) {
        return [];
    }

    /**
     * @param {Record<string, IField>} fields
     */
    async generateSyncField(fields) {
        return fields;
    }
}

module.exports = TabularPartsClass;
