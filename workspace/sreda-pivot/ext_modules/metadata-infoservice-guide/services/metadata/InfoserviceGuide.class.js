const { uniqueValues, isNil } = require('../../../utils/services');
/** GLOBAL * */
const ApiError = require('../../../../core/exceptions/ApiError');
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');
const ConnectorClass = require('../../../metadata-connector/services/metadata/Connector.class');
const { isEmptyObject } = require('../../../utils/services');

/** LOCAL * */
const FieldsClass = require('./shared/Fields.class');
const IndexesClass = require('./shared/Indexes.class');
const KeysClass = require('./shared/Keys.class');

const RefsClass = require('../../../metadata-logic/refs.class');
const Refs = new RefsClass();

const constants = require('../../constants');

/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').Ifrom} Ifrom
 * @typedef {import('sequelize').WhereOptions} WhereOptions
 * @typedef {import('../../../metadata-cmp/services/metadata/source/type/index').default} LevelClassI
 */

/**
 * @implements {LevelClassI}
 */
class InfoServiceGuidClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'InfoserviceGuide';

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
            // parent: props.parent,
        };
    }

    async subTree(item, options = {}) {
        return Promise.all([
            new FieldsClass({ owner_id: item.id }).tree(options),
            new IndexesClass({ owner_id: item.id, parent: item }).tree(options),
            new KeysClass({ owner_id: item.id, parent: item }).tree(options),
        ]);
    }

    console(msg, meta) {
        let dd = new Date();
        console.log(
            `------- ${dd.getMinutes()}:${dd.getSeconds()}.${dd.getMilliseconds()} --------`,
            msg
        );
    }

    // NEW FACTURE
    /**
     * @param {LevelClassI} meta
     * @param {string} id
     * @returns
     */
    async tableInfo(meta, id) {
        const { parents, children } = await meta.getFamilyTree(id);

        const Fields = {};
        const FieldsGUID = {};
        const Keys = {};
        const KeysGUID = {};
        const Indexes = {};
        const Refs = {};

        const AllFields = {};
        const AllFieldsGUID = {};

        for (let i = 0; i < parents.length; i++) {
            const child = parents[i];

            if (child.class === 'Fields') {
                const fieldInfo = child.manifest?.settings;
                if (!fieldInfo || !fieldInfo.nameField) {
                    continue;
                }
                const ref = fieldInfo.ref !== '0' ? fieldInfo.ref : undefined;

                AllFields[fieldInfo.nameField] = {
                    field: fieldInfo.nameField,
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    type: fieldInfo.type,
                    off: fieldInfo.onoff ?? false,
                    ref,
                    virtual: fieldInfo.virtual ?? false,
                    value: fieldInfo.virtual ? fieldInfo.fnfield : fieldInfo.nameField,
                };
                AllFieldsGUID[child.id] = JSON.parse(
                    JSON.stringify(AllFields[fieldInfo.nameField])
                );

                if (!fieldInfo.onoff) {
                    Fields[fieldInfo.nameField] = JSON.parse(
                        JSON.stringify(AllFields[fieldInfo.nameField])
                    );
                    FieldsGUID[child.id] = JSON.parse(JSON.stringify(Fields[fieldInfo.nameField]));
                    if (ref) {
                        Refs[fieldInfo.nameField] = JSON.parse(
                            JSON.stringify(Fields[fieldInfo.nameField])
                        );
                    }
                }
            }
        }

        for (let i = 0; i < parents.length; i++) {
            const child = parents[i];

            if (child.class === 'Keys') {
                const childKeys = children[child.id] || [];
                // const keyManifest = child.manifest;
                const keyField = {};
                for (const key of childKeys) {
                    const keyName = key.manifest.name;

                    let keyGUID = key.manifest.settings.ref;
                    keyGUID = keyGUID?.key ?? keyGUID;
                    keyGUID = typeof keyGUID === 'object' ? keyGUID.value : keyGUID;

                    if (!AllFieldsGUID[keyGUID]) {
                        throw ApiError.BadRequest(
                            `Не удалось найти поле ключа (${keyName}) Справочника Инфосервисов`
                        );
                    }

                    const { field } = AllFieldsGUID[keyGUID];

                    keyField[field] = {
                        field,
                        name: keyName,
                        description: key.manifest.description,
                        value: key.manifest.settings.ref,
                    };
                }

                Keys[child.name] = {
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    fields: keyField,
                    settings: child.manifest.settings,
                };

                KeysGUID[child.id] = JSON.parse(JSON.stringify(Keys[child.name]));
            } else if (child.class === 'Indexes') {
                const childIndexes = children[child.id] || [];
                // const keyManifest = child.manifest;
                const indexField = {};
                for (const index of childIndexes) {
                    const keyName = index.manifest.name;
                    indexField[keyName] = {
                        name: keyName,
                        description: index.manifest.description,
                        value: index.manifest.settings.ref,
                    };
                }

                Indexes[child.name] = {
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    fields: indexField,
                };
            }
        }
        return {
            Fields,
            FieldsGUID,
            Keys,
            KeysGUID,
            Indexes,
            Refs,
            AllFields,
            AllFieldsGUID,
        };
    }

    /**
     * @param {string} id
     * @param {object} inputOptions
     * @returns
     */
    async query(id, inputOptions = {}) {
        const options = structuredClone(inputOptions);

        const meta = new InfoServiceGuidClass({ id });

        const [treeObject, item] = await Promise.all([this.tableInfo(meta, id), this.getItem(id)]);

        const { connector } = await this.getConnector(item);

        const { table, sqlalias, hierarchy, fieldhierarchy, fieldhierarchydefault, onoff, blockMessage = '', hierarchyLevels } =
            item.manifest.settings;

        if (onoff) {
            throw ApiError.ResourseBlocked(
                blockMessage || `Таблица ${table} заблокирована для запросов ${item?.name}`
            );
        }

        this.console(`Формируем иерархию по таблице ${table}`);

        const defaultOptions = this.toJSON(item.manifest.settings?.filter || '{}');

        const readOptions = { ...options };

        //------------чтобы не городить кучу условий закинем необходимые для формирования поля в дерево-------------
        const readHierarchy = readOptions.hierarchy ?? defaultOptions.hierarchy;
        const parentFieldId = fieldhierarchy?.value ?? fieldhierarchy;
        const isHierarchy = readHierarchy && parentFieldId;
        const defaultOrder = (defaultOptions.order || []).map(([key]) => key);

        //получим атрибуты нижнего уровня включая все необходимые для обработки пользовательских настроек
        const subAttributes = [].concat(readOptions.attributes || [], defaultOrder);

        //----------------------формирования основной выборки колонок-----------------------------------------------
        const { cols, fields, primaryKey, parentField, viewField } = this.getColumns(
            treeObject,
            subAttributes,
            parentFieldId
        );
        //----------------------формирования основной выборки колонок-----------------------------------------------

        const { metaAccessWhere } = options;
        if (!isEmptyObject(metaAccessWhere)) {
            if (!defaultOptions.where) {
                defaultOptions.where = metaAccessWhere;
            } else {
                defaultOptions.where = { ['$and']: [defaultOptions.where, metaAccessWhere] };
            }
        }

        // Создаем окружение
        let from = this.getSubQuery(table, sqlalias);
        from = await this.findSQL(connector, from, {
            attributes: cols,
            ...defaultOptions,
            order: [],
        });

        if (!readOptions.attributes?.length) {
            readOptions.attributes = [...cols];
        }

        if (!readOptions.group?.length) {
            readOptions.group = readOptions.attributes.map((item) =>
                Array.isArray(item) ? item[1] : item
            );
        }

        if (viewField) {
            readOptions.attributes.push(viewField.field);
            readOptions.group.push(viewField.field);
        }

        if (!readOptions.limit) {
            // options.limit = 500;
        }

        if (!readOptions.where) {
            readOptions.where = {};
        }

        let hierarchySettings = {};
        if (hierarchy && isHierarchy && defaultOptions.hierarchy && readHierarchy) {
            if (!readOptions.where[parentField.field] && !this.hasIlike(readOptions.where)) {
                readOptions.where[parentField.field] = isNil(fieldhierarchydefault)
                    ? { $is: null }
                    : { $eq: fieldhierarchydefault };
            }

            const configuredLevels = Number(hierarchyLevels);
            hierarchySettings = {
                on: true,
                parentFilter: readOptions.where[parentField.field],
                parentField: parentField,
                codeField: primaryKey,
                viewField,
                hideNestedIfEqual: Boolean(item.manifest.settings?.hideNestedIfEqual),
                maxLevel: Number.isFinite(configuredLevels) && configuredLevels > 0 ? configuredLevels : undefined,
            };
        }

        const query = await this.findSQL(connector, from, { ...readOptions, order: [] });

        this.console(`Делаем запрос для построения иерархии по таблице ${table}`, {
            query: query?.table || query,
        });

        const aliases = readOptions.attributes.map((item) =>
            Array.isArray(item) ? item[1] : item
        );

        // ========================  обработка сортировок  ===================================
        const mappedOrder =
            !readOptions.order?.length && !readOptions.withOutOrder
                ? defaultOptions.order?.reduce((acc, [key, dir]) => {
                      acc[key] = dir;
                      return acc;
                  }, {})
                : {};

        if (!isEmptyObject(mappedOrder)) {
            readOptions.order ||= [];
            aliases.forEach(
                (item) => mappedOrder[item] && readOptions.order.push([item, mappedOrder[item]])
            );
        }
        // ========================  обработка сортировок  ===================================

        return {
            table,
            query,
            aliases,
            connector,
            treeObject,
            hierarchySettings,
            cols: fields,
            readOptions,
            preQuery: from,
            metadata: { ...item, treeObject },
        };
    }

    /**
     * @param {string} id
     * @param {object} inputOptions
     * @returns
     */
    async read(id, inputOptions) {
        const options = JSON.parse(JSON.stringify(inputOptions || {}));

        const {
            cols,
            table,
            query,
            aliases,
            preQuery,
            metadata,
            connector,
            treeObject,
            readOptions,
            hierarchySettings,
        } = await this.query(id, options);

        this.console(`Делаем запрос для построения иерархии по таблице ${table}`, {
            query: query?.table || query,
        });

        const promiseFindAll = connector.findAll(preQuery, { ...readOptions, attributes: aliases });
        const promiseCount = !options.withOutCount
            ? connector.count(preQuery, { ...readOptions, attributes: aliases })
            : -1;

        let rows = await promiseFindAll;
        const count = await promiseCount;

        if (hierarchySettings.hideNestedIfEqual) {
            rows = await this.hideNestedEqualToParent(rows, {
                connector,
                preQuery,
                viewField: hierarchySettings.viewField,
                parentField: hierarchySettings.parentField,
                primaryKey: hierarchySettings.codeField,
            });
        }

        this.console(`Получили данные иерархии по таблице ${table}`);

        const refsForLoad = {};
        readOptions.attributes.forEach((field) => {
            if (treeObject.Refs[field]) {
                refsForLoad[field] = treeObject.Refs[field];
            }
        });

        const refs = !options.withOutRefs ? await Refs.getAllRefs(refsForLoad, rows) : {};

        this.console(`Получили ответ по запросу по иерархичному справочнику ${table}`);

        return {
            rows,
            cols,
            refs,
            count,
            query: query.table.slice(0, -1),
            options: inputOptions,
            hierarchy: hierarchySettings,
            limit: readOptions.limit ?? 0,
            offset: readOptions.offset ?? 0,
            metadata,
        };
    }

    /**
     * @private
     *
     * @param {IConnector} connector
     * @param {Ifrom | string} from
     * @param {*} options
     * @returns {Promise<Ifrom>}
     */
    async findSQL(connector, from, options) {
        const SQL = await connector.findSQL(from, options);
        return {
            // table: SQL.replace(/\;/g, ''),
            table: SQL,
            alias: /** @type {Ifrom} */ (from)?.alias || /** @type {string} */ (from),
        };
    }

    /**
     * @private
     *
     * @param {object} treeObject
     * @param {string[]} attributes
     * @param {string} parentFieldId
     * @returns
     */
    getColumns(treeObject, attributes, parentFieldId) {
        const cols = [];
        const fields = {};

        const [{ fields: keys, viewId }] = this.getPkAndViewId(treeObject.Keys || {});
        // не поддерживает составные ключи
        const [key] = keys;

        const primaryKey = treeObject.AllFields[key];
        const viewField = treeObject.AllFieldsGUID[viewId];
        const parentField = treeObject.AllFieldsGUID[parentFieldId];

        uniqueValues([
            key,
            ...(attributes || []),
            ...Object.keys(treeObject.Fields),
            parentField?.field,
            viewField?.field,
        ]).forEach((fieldName) => {
            const fName = Array.isArray(fieldName) ? fieldName[1] : fieldName;
            const field = treeObject.AllFields[fName];

            if (!field) {
                cols.push(fieldName);

                return;
            }

            fields[field.field] = field;
            cols.push(field.value === field.field ? field.field : [field.value, field.field]);
        });

        return {
            fields: Object.values(fields),
            cols: uniqueValues(cols.filter(Boolean)),
            viewField,
            primaryKey,
            parentField,
        };
    }

    /**
     *
     * @param {string} table
     * @param {string} sqlalias
     * @returns {Ifrom | string}
     */
    getSubQuery(table, sqlalias) {
        /** @type {Ifrom | string} */
        let from = table;
        if (sqlalias && sqlalias.trim() !== '') {
            from = {
                table: sqlalias,
                alias: table,
            };
        }

        return from;
    }

    /**
     * Скрыть дочерние строки, имя которых совпадает с именем родителя.
     *
     * @param {object[]} rows
     * @param {{ connector: IConnector, preQuery: Ifrom | string, viewField?: object, parentField?: object, primaryKey?: object }} params
     * @returns {Promise<object[]>}
     */
    async hideNestedEqualToParent(rows, { connector, preQuery, viewField, parentField, primaryKey }) {
        if (!rows?.length || !viewField?.field || !parentField?.field || !primaryKey?.field) {
            return rows;
        }

        const parentIds = uniqueValues(rows.map((row) => row[parentField.field]).filter((value) => !isNil(value)));
        if (!parentIds.length) {
            return rows;
        }

        const parents = await connector.findAll(preQuery, {
            attributes: [primaryKey.field, viewField.field],
            where: { [primaryKey.field]: parentIds },
            withOutCount: true,
        });
        const parentNames = {};
        (parents || []).forEach((parent) => {
            parentNames[parent[primaryKey.field]] = parent[viewField.field];
        });

        return rows.filter((row) => {
            const parentId = row[parentField.field];
            if (isNil(parentId)) {
                return true;
            }
            const parentName = parentNames[parentId];
            if (isNil(parentName)) {
                return true;
            }
            return String(row[viewField.field] ?? '') !== String(parentName ?? '');
        });
    }

    hasIlike(where) {
        for (const key in where) {
            if (key === '$iLike' && where[key] !== '%%') return true;

            if (Array.isArray(where[key])) {
                if (where[key].some((val) => this.hasIlike(val))) {
                    return true;
                }
            } else if (typeof where[key] === 'object') {
                if (this.hasIlike(where[key])) return true;
            }
        }

        return false;
    }

    /**
     * Настройки иерархии справочника для запросов куба.
     *
     * @param {string} id
     * @param {object} [tableInfo]
     */
    async getSettings(id, tableInfo) {
        const info = tableInfo || (await this.tableInfo(this, id));
        const item = await this.getItem(id);
        const settings = item?.manifest?.settings || {};
        const { table, onoff, blockMessage = '', fieldhierarchy, fieldhierarchydefault, hierarchyLevels } = settings;

        if (onoff) {
            throw ApiError.ResourseBlocked(
                blockMessage || `Таблица ${table} заблокирована для запросов ${item?.name}`
            );
        }

        const { AllFields, AllFieldsGUID, Keys } = info;
        const [{ fields: keys = [], viewId } = {}] = this.getPkAndViewId(Keys || {});
        const [key] = keys;
        const parentFieldId = fieldhierarchy?.value ?? fieldhierarchy;
        const configured = Number(hierarchyLevels);

        return {
            IdField: AllFields[key],
            ParentField: AllFieldsGUID[parentFieldId],
            ViewField: AllFieldsGUID[viewId],
            fieldhierarchydefault: isNil(fieldhierarchydefault)
                ? { $is: null }
                : { $eq: fieldhierarchydefault },
            maxLevel: Number.isFinite(configured) && configured > 0 ? configured : 20,
        };
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
}

module.exports = InfoServiceGuidClass;
