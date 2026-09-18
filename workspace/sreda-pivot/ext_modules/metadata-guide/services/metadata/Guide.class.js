/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');
const ConnectorClass = require('../../../metadata-connector/services/metadata/Connector.class');
const httpContext = require('../../../../core/services/http-context');
const RlsCoreServiceClass = require('../../../rls-core/services/RlsCore.service');
const RlsCoreService = new RlsCoreServiceClass();

/** LOCAL * */
const SysFieldsClass = require('./shared/SysFields.class');
const FieldsClass = require('./shared/Fields.class');
const IndexesClass = require('./shared/Indexes.class');
const KeysClass = require('./shared/Keys.class');
const FormsClass = require('./shared/Forms.class');
const TabularPartsClass = require('./shared/TabularParts.class');
const RefsClass = require('../../../metadata-logic/refs.class');
const Refs = new RefsClass();

const WhereFormaterClass = require('../../../meta-where-formatter/index');
const WhereFormater = new WhereFormaterClass();

const crypto = require('crypto');

const ApiError = require('../../../../core/exceptions/ApiError');

const constants = require('../../constants');

const { isEmptyObject, mergeDeep } = require('../../../utils/services');

const MetaObjectServerCode = require('../../../meta-object-server-code/services/metaObjectServerCode');

const QueueAgent = require('../../../QueueAgent');
const TransactionAgent = require('../../../TransactionAgent');

class GuideClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Guide';

        this.id = constants[name].id;
        this.component = constants[name].component;

        this.childrenCRUD = ['r', 'u', 'd', 'rls'];

        this.props = {
            id: props?.id ?? this.id,
            owner_id: this.id, // '00000000-0000-0000-0000-000000000000',
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c', 'u', 'rls'],
            routes: constants[name].routes,
        };

        this.errorMessages = {
            read: {
                onBeforeLoad: 'Блокировка ПередЧтением справочника',
                onAfterLoad: 'Блокировка ПослеЧтения справочника',
            },
            update: {
                onBeforeSave: 'Блокировка ПередЗаписью справочника',
                onAfterSave: 'Блокировка ПослеЗаписи справочника',
            },
            create: {
                onBeforeSave: 'Блокировка ПередЗаписью справочника',
                onAfterSave: 'Блокировка ПослеЗаписи справочника',
            },
            delete: {
                onBeforDelte: 'Блокировка ПередУдалением справочника',
                onAfterDelete: 'Блокировка ПослеУдаления справочника',
            },
            markdel: {
                onBeforeMarkDelete: 'Блокировка ПередПометкойНаУдаление справочника',
                onAfterMarkDelete: 'Блокировка ПослеПометкиНаУдаление справочника',
            },
        };
    }

    async subTree(item, options) {
        return Promise.all([
            new SysFieldsClass({ owner_id: item.id }).tree(options),
            new FieldsClass({ owner_id: item.id }).tree(options),
            new TabularPartsClass({ owner_id: item.id, parent: item }).tree(options),
            new FormsClass({ owner_id: item.id, parent: item }).tree(options),
            new IndexesClass({ owner_id: item.id, parent: item }).tree(options),
            new KeysClass({ owner_id: item.id, parent: item }).tree(options),
        ]);
    }

    async tableTabularPartsInfo(meta, id) {
        const tabularParts = new TabularPartsClass({ id });
        return tabularParts.tableInfo(tabularParts, id);
    }

    /**
     * @param {GuideClass} meta
     * @param {string} id
     * @returns
     */
    async tableInfo(meta, id) {
        const { parents, children } = await meta.getFamilyTree(id);

        const Fields = {};
        const FieldsGUID = {};
        const SysFields = {};
        const SysFieldsGUID = {};
        const Keys = {};
        const KeysGUID = {};
        const Indexes = {};
        const TabularParts = {};
        const TabularPartsGUID = {};
        const Refs = {};

        for (let i = 0; i < parents.length; i++) {
            const child = parents[i];

            if (child.class === 'TabularParts') {
                const TabularPartsChildren = await this.tableTabularPartsInfo(meta, child.id);

                const fieldInfo = child.manifest.settings;
                TabularParts[fieldInfo.table] = {
                    id: child.id,
                    name: child.name,
                    description: child.description,
                    table: fieldInfo.table,
                    info: TabularPartsChildren,
                };
                TabularPartsGUID[child.id] = TabularParts[fieldInfo.table];
            }

            if (child.class === 'SysFields') {
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
                    len: fieldInfo.length,
                    unique: fieldInfo.unique,
                    default: fieldInfo.default,
                    show: fieldInfo.showfield,
                    multiRef,
                    multiRefFields: await this.getCompositeFields(multiRef, fieldInfo.nameField),
                    editing: fieldInfo.editing ?? true, //Для существующих полей если не указан атрибут
                };

                if (fieldInfo.nameField === 'parent') {
                    Fields[fieldInfo.nameField].ref = {
                        link: this.id,
                        value: id,
                    };
                    Refs[fieldInfo.nameField] = Fields[fieldInfo.nameField];
                }

                FieldsGUID[child.id] = Fields[fieldInfo.nameField];
                if (FieldsGUID[child.id].multiRefFields.length > 0) {
                    Refs[fieldInfo.nameField] = Fields[fieldInfo.nameField];
                }

                SysFields[fieldInfo.nameField] = Fields[fieldInfo.nameField];
                SysFieldsGUID[child.id] = Fields[fieldInfo.nameField];
            }
            if (child.class === 'Fields') {
                const fieldInfo = child.manifest.settings;
                const ref = fieldInfo.ref !== '0' ? fieldInfo.ref : undefined;

                const multiRef = fieldInfo.multiRef || [];

                Fields[fieldInfo.nameField] = {
                    field: fieldInfo.nameField,
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    increment: fieldInfo.increment ?? false,
                    notnull: fieldInfo.notnull ?? false,
                    type: fieldInfo.type,
                    len: fieldInfo.length,
                    precision: fieldInfo.precision,
                    ref,
                    virtual: fieldInfo.virtual ?? false,
                    unique: fieldInfo.unique,
                    show: fieldInfo.showfield,
                    value: fieldInfo.virtual ? fieldInfo.fnfield : fieldInfo.nameField,
                    multiRef,
                    multiRefFields: await this.getCompositeFields(multiRef, fieldInfo.nameField),
                    editing: fieldInfo.editing ?? true, //Для существующих полей если не указан атрибут
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

        for (let i = 0; i < parents.length; i++) {
            const child = parents[i];

            if (child.class === 'Keys') {
                const childKeys = children[child.id] || [];
                // const keyManifest = child.manifest;
                const keyField = {};
                for (const key of childKeys) {
                    const keyName = key.manifest.name;
                    const keyGUID =
                        typeof key.manifest.settings.ref === 'object'
                            ? key.manifest.settings.ref.value
                            : key.manifest.settings.ref;
                    const { field } = FieldsGUID[keyGUID];
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
                KeysGUID[child.id] = Keys[child.name];
            }

            if (child.class === 'Indexes') {
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
            SysFields,
            SysFieldsGUID,
            Keys,
            KeysGUID,
            Indexes,
            TabularParts,
            TabularPartsGUID,
            Refs,
        };
    }

    analizeWhereTabulars(inputWhere, tabularPartsNames) {
        let result = {
            where: undefined,
            tabWhere: {},
        };

        if (Array.isArray(inputWhere)) {
            let newWhere = inputWhere.map((item) => {
                const { where, tabWhere } = this.analizeWhereTabulars(item, tabularPartsNames);
                result.tabWhere = { ...result.tabWhere, ...tabWhere }; //мне кажется тут ошибка, если придут 2 условия они перетрутся
                return where; //(typeof item === "object" && Object.keys(item).length === 0) ? undefined : item;
            });
            newWhere = newWhere.filter((item) => item !== undefined);
            // resWhere = {...resWhere,  where: newWhere };
            result.where = newWhere;
        } else if (typeof inputWhere === 'object' && inputWhere !== null) {
            // const keyForDel = [];
            Object.keys(inputWhere).forEach((key) => {
                if (key.indexOf('.') !== -1) {
                    //Есть что-то похожее на таб часть
                    const arrKey = key.split('.');
                    const tabName = arrKey[0];
                    if (tabularPartsNames.includes(tabName)) {
                        if (!result[tabName]) result.tabWhere[tabName] = [];
                        result.tabWhere[tabName].push({
                            [arrKey[1]]: structuredClone(inputWhere[key]),
                        }); //structuredClone(where)
                    }
                } else {
                    const { where, tabWhere } = this.analizeWhereTabulars(
                        inputWhere[key],
                        tabularPartsNames
                    );
                    result.tabWhere = { ...result.tabWhere, ...tabWhere }; //мне кажется тут ошибка, если придут 2 условия они перетрутся
                    if (!result.where) result.where = {};
                    result.where[key] = where;
                }
            });
            // keyForDel.forEach(key=>delete where[key]);
        } else {
            result.where = inputWhere;
        }

        return result;
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

    async addTransformIdField(row, refs, PKFields, template) {
        if (row.id && row.name) {
            if (!refs.id) refs.id = {};
            if (template) {
                let view = template;
                for (let field of PKFields) {
                    const value = row[field];
                    view = view
                        .replaceAll(`[[${field}]]`, value)
                        .replaceAll(`[[ ${field} ]]`, value);
                    refs.id[row.id] = view;
                }
            } else {
                const view = row[PKFields[0]];
                refs.id[row.id] = view;
            }
        }
        return row;
    }

    // Не стоит деструктуризировать options, потому что теряется ссылка на refs
    async addTabularPartsToRow(row, options) {
        row.TabularParts = {};
        // options.refs.TabularParts = {};
        const TabularPartsInstance = new TabularPartsClass({ owner_id: options.id });
        for (const tabularPartsGUID in options.treeObject.TabularPartsGUID) {
            const TabularPart = options.treeObject.TabularPartsGUID[tabularPartsGUID];
            const toptions = {
                where: { owner: row.id },
                withOutRefs: options.withOutRefs,
            };
            const { rows: trows, refs: trefs } = await TabularPartsInstance.getData(
                options.connector,
                options.treeObject,
                tabularPartsGUID,
                toptions
            );
            row.TabularParts[TabularPart.table] = trows;
            options.refs = mergeDeep(options.refs, trefs);
        }
        return row;
    }

    /* !!! CRUD !!! */

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
        const result = connector.synch(table, options);
        return result;
    }

    /**
     * @param {string} id
     * @param {object} inputOptions
     * @param {object} params Дополнительные параметры запроса
     * @param {object} [params.transaction] Транзакция
     * @returns
     */
    async read(id, inputOptions = {}) {
        const guide = new GuideClass({ id });
        const [treeObject, item] = await Promise.all([
            guide.tableInfo(guide, id),
            guide.getItem(id),
        ]);

        const beforeLoad = await MetaObjectServerCode.onBeforeLoad(treeObject, item, inputOptions);
        if (beforeLoad?.result === false) {
            // Именно проверка на false, чтобы не прошел undefine
            throw (
                beforeLoad.error ?? { status: 409, message: this.errorMessages.read.onBeforeLoad }
            );
        }

        const withHierarchy =
            inputOptions.withHierarchy !== undefined ? inputOptions.withHierarchy : true; //ТОЛЬКО НЕ УДАЛЯЙТЕ ЭТО !== undefined, если inputOptions.withHierarchy будет false он станет true

        const PARENT_FIELD = 'parent';
        const CODE_FIELD = 'id';
        const PARENT_ID = '00000000-0000-0000-0000-000000000000';

        const options = structuredClone(inputOptions || {});
        options.where ||= {};

        const mitem = await guide.item(item);

        const { table, hierarchical, rls } = item.manifest.settings;
        const { connector } = await this.getConnector(item);

        /**
         * Формируем иерархию
         */
        let hierarchySettings = {};
        if (hierarchical && withHierarchy) {
            const parentField = treeObject.Fields[PARENT_FIELD];

            if (!parentField) {
                throw ApiError.BadRequest(
                    `Отсутствует родительское поле иерархии (${PARENT_FIELD})`
                );
            }

            const codeField = treeObject.Fields[CODE_FIELD];

            if (!codeField) {
                throw ApiError.BadRequest(`Отсутствует ключевое поле иерархии (${CODE_FIELD})`);
            }

            const parentFilter = { $eq: PARENT_ID };

            //TODO Охренительный костыль после Пашиной доработки по композитным полям :)
            let flatWhere = WhereFormater.flat({ ...options.where });
            flatWhere = WhereFormater.compressFlat(flatWhere);

            if (!flatWhere[parentField.field]) {
                options.where[parentField.field] = parentFilter;
            }

            hierarchySettings = {
                on: true,
                parentFilter: parentFilter,
                parentField: parentField,
                codeField: codeField,
            };
        }

        // Получим поля которые нужны для ref поля id
        let PKFields = [];
        const PK = Object.values(treeObject.Keys).filter((key) => key.settings.primarykey)[0]; //Первичный ключ должен быть только один
        const viewField = PK?.settings?.fieldview?.value;
        let template = PK?.settings?.templateview;
        if (viewField) {
            PKFields.push(treeObject.FieldsGUID[viewField].field);
        } else if (PK?.settings?.templateview && PK?.settings?.templateview?.trim() !== '') {
            //Это шаблон
            const reg = /\[\[\s*(?<field>[-_a-z0-9]+)\s*\]\]/gimu;
            const array = [...template.matchAll(reg)];
            PKFields = [...array.map((item) => item.groups.field)];
        } else {
            PKFields.push('name');
        }

        if (!options.attributes) {
            options.attributes = [];
            for (const fieldName in treeObject.Fields) {
                const field = treeObject.Fields[fieldName];
                options.attributes.push(field.virtual ? [field.value, field.field] : field.field);
            }
        } else {
            if (!options.attributes.includes('id')) options.attributes.push('id');
            PKFields.forEach((attr) => {
                if (!options.attributes.includes(attr)) options.attributes.push(attr);
            });
        }

        if (!options.order) {
            options.order = [['code', 'ASC']];
        }

        if (rls) {
            options.rls = rls;
            options.table = table;
        }

        const { metaAccessWhere } = options;
        if (!isEmptyObject(metaAccessWhere) && !options.withOutMetaWhere) {
            options.where = { ['$and']: [options.where, metaAccessWhere] };
        }

        const tabularPartsNames = Object.keys(treeObject.TabularParts);
        const { where: newWhere, tabWhere } = this.analizeWhereTabulars(
            options.where,
            tabularPartsNames
        );
        let tabularFilter = Object.keys(tabWhere).length > 0;
        if (tabularFilter) {
            //Есть условия по таб частям
            options.where = newWhere;
        }

        let [rows, count] = await Promise.all([
            guide.findAll(connector, table, { ...options }),
            options.withOutCount ? -1 : guide.count(connector, table, { ...options }),
        ]);

        if (tabularFilter) {
            // Как бы избавиться от этого цикла
            const owners = rows.map((row) => row.id);

            const TabularPartsInstance = new TabularPartsClass({ owner_id: id });

            for (const tabName in tabWhere) {
                const TabularPart = treeObject.TabularParts[tabName];

                let twhere = {};
                tabWhere[tabName].forEach((item) => {
                    twhere = { ...twhere, ...item };
                });

                const toptions = {
                    where: {
                        ...twhere,
                        owner: owners,
                    },
                    attributes: ['owner'],
                    group: ['owner'],
                };
                let { rows: trows, refs: trefs } = await TabularPartsInstance.getData(
                    connector,
                    treeObject,
                    TabularPart.id,
                    toptions
                );
                if (trows) {
                    trows = trows.map((row) => row.owner);
                } else trows = [];

                // Уберем неподходящие строки
                rows = rows.filter((row) => trows.includes(row.id));
            }
        }

        let refs = {};

        const funcs = [async (row) => this.addTransformIdField(row, refs, PKFields, template)];

        if (options.withTabularParts) {
            funcs.push(async (row) => {
                return await this.addTabularPartsToRow(row, {
                    connector,
                    id,
                    treeObject,
                    refs,
                    withOutRefs: options.withOutRefs,
                });
            });
        }

        rows = await this.mutableRows(rows, funcs);

        if (!options.withOutRefs && rows.length > 0) {
            const attr = Object.keys(rows[0]).filter((item) => item !== 'TabularParts');
            const refsForLoad = {};
            attr.forEach((field) => {
                if (treeObject.Refs[field]) {
                    refsForLoad[field] = treeObject.Refs[field];
                }
            });

            const localRefs = await Refs.getAllRefs(refsForLoad, rows);
            refs = mergeDeep(localRefs, refs);
        }

        const cols = Object.values(treeObject.Fields);

        const result = {
            rows,
            cols,
            refs,
            refFields: refs,
            count,
            hierarchy: hierarchySettings,
            offset: options.offset ?? 0,
            limit: options.limit,
            options,
            metadata: { ...mitem, ...item, treeObject },
        };

        const afterLoad = await MetaObjectServerCode.onAfterLoad(treeObject, item, options, result);
        if (afterLoad?.result === false) {
            // Именно проверка на false, чтобы не прошел undefine
            throw afterLoad.error ?? { status: 409, message: this.errorMessages.read.onAfterLoad };
        }

        return result;
    }

    async bulkUpdate(id, body, options = {}) {
        const queue = new QueueAgent();
        const result = [];
        for (const item of body) {
            const res = await this.update(id, item, { ...options, queue });
            result.push(res);
        }
        await queue.commit();
        return result;
    }

    async update(id, body, inputOptions = {}) {
        let { returning, transaction, queue } = inputOptions;

        const guide = new GuideClass({ id });
        const treeObject = await guide.tableInfo(guide, id);
        const item = await guide.getItem(id);

        if (body.markdel !== undefined) {
            const beforeMarkDelete = await MetaObjectServerCode.onBeforeMarkDelete(
                treeObject,
                item,
                body
            );
            if (beforeMarkDelete?.result === false) {
                // Именно проверка на false, чтобы не прошел undefine
                throw (
                    beforeMarkDelete.error ?? {
                        status: 409,
                        message: this.errorMessages.markdel.onBeforeMarkDelete,
                    }
                );
            }
        }

        const beforeSave = await MetaObjectServerCode.onBeforeSave(treeObject, item, body);
        if (beforeSave?.result === false) {
            // Именно проверка на false, чтобы не прошел undefine
            const message = beforeSave.error ?? this.errorMessages.update.onBeforeSave;
            let err = new ApiError(409, message, beforeSave.errors);
            throw err;
        }

        const { table, rls } = item.manifest.settings;
        const { connector } = await this.getConnector(item);

        let localTransaction = false;
        if (!transaction) {
            const transactionAgent = new TransactionAgent(connector);
            transaction = await transactionAgent.transaction();
            localTransaction = true;
        }

        delete body.createdAt;
        delete body.updatedAt;
        delete body.createdUser;

        // Установку пользователя нужно перенести в отдельный абстрактный класс
        const sessionStorage = httpContext.get('sessionStorage');
        const user = sessionStorage ? { ...sessionStorage.user } : { id: undefined };
        const updatedUser = user.id;

        const values = { ...body, updatedUser };

        let docId = values['id'];
        if (!docId) throw 'Не передан id записи для обновления';
        delete values['id'];

        // Установка значений по умолчанию
        Object.keys(values).forEach((name) => {
            const val = values[name];
            if (val === null || val === undefined) {
                if (treeObject.Fields[name].notnull && treeObject.Fields[name].default) {
                    values[name] = treeObject.Fields[name].default;
                }
            }
        });

        const options = {
            where: {
                id: docId,
            },
            returning,
            transaction,
            queue,
        };

        if (rls) {
            options.rls = rls;
            options.table = table;
        }

        //Сохраняем в сторонку данные по табличным частям
        let saveTabularParts = false;
        let TabularParts;
        if (values.TabularParts) {
            saveTabularParts = true;
            TabularParts = structuredClone(values.TabularParts);
            delete values.TabularParts;
        }

        let data;
        try {
            //Сохраняем шапку
            data = await guide.dataUpdate(connector, table, values, options);

            //Если таб части были, сохраняем их
            if (saveTabularParts) {
                const TabularPartsInstance = new TabularPartsClass({ owner_id: id });

                for (let tbName in TabularParts) {
                    const tabular = treeObject.TabularParts[tbName].id;
                    await TabularPartsInstance.deleteByOwner(id, tabular, docId, {
                        transaction,
                        connector,
                    });

                    const tbData = TabularParts[tbName];
                    let rows = [];
                    let rowIndex = 0;
                    for (const row of tbData) {
                        rowIndex++;
                        if (!row['rank']) row['rank'] = rowIndex;
                        row['owner'] = docId;
                        rows.push(row);
                    }
                    await TabularPartsInstance.bulkCreate(id, tabular, rows, {
                        transaction,
                        connector,
                        queue,
                    });
                }
            }

            localTransaction && (await transaction.commit());
        } catch (err) {
            localTransaction && (await transaction.rollback());
            throw err;
        }

        const result = { result: data };

        if (body.markdel !== undefined) {
            const afterMarkDelete = await MetaObjectServerCode.onAfterMarkDelete(
                treeObject,
                item,
                body,
                result
            );
            if (afterMarkDelete?.result === false) {
                // Именно проверка на false, чтобы не прошел undefine
                throw (
                    afterMarkDelete.error ?? {
                        status: 409,
                        message: this.errorMessages.markdel.onAfterMarkDelete,
                    }
                );
            }
        }

        const afterSave = await MetaObjectServerCode.onAfterSave(treeObject, item, body, result);
        if (afterSave?.result === false) {
            // Именно проверка на false, чтобы не прошел undefine
            throw (
                afterSave.error ?? { status: 409, message: this.errorMessages.update.onAfterSave }
            );
        }

        return result;
    }

    /**
     * Метод множественного создания строк таблицы документов.
     * @param {string} id Идентификатор документа
     * @param {object[]} body Тело запроса
     * @param {object} [options] Список дополнительных опций
     * @param {object} [options.transaction] Транзакция
     * @param {object} [options.returning] returning
     * @param {number} [options.size] Количество строк для одновременной записи
     * @returns {Promise<array>}
     */
    async bulkCreate(id, body, options = {}) {
        let { returning, transaction, size = 1_000 } = options;
        const guide = new GuideClass({ id });
        const treeObject = await guide.tableInfo(guide, id);
        const item = await guide.getItem(id);

        const beforeSave = await MetaObjectServerCode.onBeforeSave(treeObject, item, body);
        if (beforeSave?.result === false) {
            // Именно проверка на false, чтобы не прошел undefine
            throw (
                beforeSave.error ?? { status: 409, message: this.errorMessages.create.onBeforeSave }
            );
        }

        const { table } = item.manifest.settings;
        const { connector } = await this.getConnector(item);

        let localTransaction = false;
        if (!transaction) {
            const transactionAgent = new TransactionAgent(connector);
            transaction = await transactionAgent.transaction();
            localTransaction = true;
        }

        const sessionStorage = httpContext.get('sessionStorage');
        const user = sessionStorage ? { ...sessionStorage.user } : { id: undefined };
        const createdUser = user.id;
        const updatedUser = user.id;

        const sysFields = Object.keys(treeObject.SysFields);
        const required = this.getRequired(treeObject.Fields);

        let values;
        try {
            values = body.map((bodyItem) => {
                const value = { ...bodyItem, createdUser, updatedUser };
                Object.keys(value).forEach((key) => {
                    if (value[key] === '') {
                        delete value[key];
                    }
                });

                const errors = [];

                required.forEach((key) => {
                    if (treeObject.Fields[key].increment) {
                        delete value[key];
                    }

                    let defaultValue = treeObject.Fields[key]?.default ?? '';
                    //defaultValue = `${defaultValue}`.trim() ?? '';
                    if ('string' == typeof defaultValue) defaultValue = defaultValue.trim();

                    if (!value[key] && defaultValue !== '') {
                        switch (defaultValue) {
                            case 'UUID': {
                                value[key] = crypto.randomUUID();
                                break;
                            }
                            case 'NOW': {
                                value[key] = new Date()
                                    .toISOString()
                                    .slice(0, 19)
                                    .replace('T', ' ');
                                break;
                            }
                            default: {
                                value[key] = defaultValue;
                            }
                        }
                    }

                    if (!value[key] && !sysFields.includes(key)) {
                        errors.push({
                            code: 1,
                            message: `Не заполнен обязательный параметр ${key}`,
                        });
                    }
                });

                if (errors.length > 0) {
                    throw new ApiError(500, 'Ошибка сохранения', errors);
                }

                return value;
            });

            let start = 0;

            while (start <= values.length) {
                let data = values.slice(start, start + size);
                let trows = {};
                data = data.map(async (item) => {
                    //Установим принудительно id
                    let docId = item?.id ?? crypto.randomUUID();
                    item.id = docId;

                    //TODO нужно доделать и сохранять табчасти сразу при получении с фронта
                    let saveTabularParts = false;
                    let TabularParts;
                    if (item.TabularParts) {
                        saveTabularParts = true;
                        TabularParts = structuredClone(item.TabularParts);
                        delete item.TabularParts;
                    }

                    if (saveTabularParts) {
                        for (let tbName in TabularParts) {
                            const tbData = TabularParts[tbName];

                            // const queueTB = new QueueAgent();
                            trows[tbName] ||= [];
                            let rowIndex = 0;
                            for (const row of tbData) {
                                rowIndex++;
                                if (!row['rank']) row['rank'] = rowIndex;
                                row['owner'] = docId;
                                trows[tbName].push(row);
                            }
                            // queueTB.commit();
                        }
                    }

                    return item;
                });

                data = await Promise.all(data);
                await guide.dataBulkCreate(connector, table, data, { transaction });

                const dataTb = {};
                const TabularPartsInstance = new TabularPartsClass({ owner_id: id });
                for (const tbName in treeObject.TabularParts) {
                    const tabular = treeObject.TabularParts[tbName].id;
                    dataTb[tbName] = await TabularPartsInstance.bulkCreate(
                        id,
                        tabular,
                        trows[tbName],
                        { returning, transaction, connector }
                    );
                }

                if (returning) {
                    const ownerTb = {};
                    Object.keys(treeObject.TabularParts).forEach((tbName) => {
                        dataTb[tbName].forEach((tbrow) => {
                            const owner = tbrow.owner;
                            if (!ownerTb[owner]) ownerTb[owner] = {};
                            if (!ownerTb[owner][tbName]) ownerTb[owner][tbName] = [];
                            ownerTb[owner][tbName].push(tbrow);
                        });
                    });

                    data.forEach((item) => {
                        const owner = item.id;
                        if (!item['TabularParts']) item['TabularParts'] = ownerTb[owner];
                    });
                }

                start += size;
            }

            localTransaction && (await transaction.commit());
        } catch (err) {
            localTransaction && (await transaction.rollback());
            throw err;
        }

        const afterSave = await MetaObjectServerCode.onAfterSave(treeObject, item, body, values);
        if (afterSave?.result === false) {
            // Именно проверка на false, чтобы не прошел undefine
            throw (
                afterSave.error ?? { status: 409, message: this.errorMessages.create.onAfterSave }
            );
        }

        return values;
    }

    async create(id, body, options = {}) {
        const [result] = await this.bulkCreate(id, [body], options);
        return result;

        // const { returning = true, transaction } = options;

        // const guide = new GuideClass({ id });
        // const treeObject = await guide.tableInfo(guide, id);
        // const item = await guide.getItem(id);

        // const beforeSave = await MetaObjectServerCode.onBeforeSave(treeObject, item, body);
        // if (beforeSave?.result === false) { // Именно проверка на false, чтобы не прошел undefine
        //     throw beforeSave.error ?? { status: 409, message: "Блокировка ПередЗаписью документов"}
        // }

        // const { table, rls } = item.manifest.settings;
        // const { connector } = await this.getConnector(item);

        // const sessionStorage = httpContext.get('sessionStorage');
        // const user = sessionStorage ? { ...sessionStorage.user } : { id: undefined };
        // const createdUser = user.id;
        // const updatedUser = user.id;
        // const values = { ...body, createdUser, updatedUser };
        // values['id'] = crypto.randomUUID(); //id - всегда первичный ключ

        // Object.keys(values).forEach((key) => {
        //     if (values[key] === '') {
        //         delete values[key];
        //     }
        // });

        // const errors = [];
        // const sysFields = Object.keys(treeObject.SysFields);
        // const required = await this.getRequired(treeObject.Fields);
        // required.forEach((key) => {
        //     if (treeObject.Fields[key].increment) {
        //         delete values[key];
        //     }

        //     let defaultValue = treeObject.Fields[key]?.default ?? '';
        //     defaultValue = `${defaultValue}`.trim();
        //     if (!values[key] && defaultValue !== '') {
        //         switch (defaultValue) {
        //             case 'UUID': {
        //                 values[key] = crypto.randomUUID();
        //                 break;
        //             }
        //             case 'NOW': {
        //                 values[key] = new Date().toISOString().slice(0, 19).replace('T', ' ');
        //                 break;
        //             }
        //             default: {
        //                 values[key] = defaultValue;
        //             }
        //         }
        //     }

        //     if (!values[key] && !sysFields.includes(key)) {
        //         errors.push({
        //             code: 1,
        //             message: `Не заполнен обязательный параметр ${key}`,
        //         });
        //     }
        // });
        // if (errors.length > 0) {
        //     throw new ApiError(500, 'Ошибка сохранения', errors);
        // }

        // //TODO нужно доделать и сохранять табчасти сразу при получении с фронта
        // let saveTabularParts = false;
        // let TabularParts;
        // if (values.TabularParts) {
        //     saveTabularParts = true;
        //     TabularParts = structuredClone(values.TabularParts);
        //     delete values.TabularParts;
        // }

        // //Установим принудительно id
        // let docId = values.id;

        // const data = await guide.dataCreate(connector, table, values, { returning, transaction });
        // if (data.result && rls && !options.customRls) {
        //     const userPermissions = await RlsCoreService.getAccessUser();
        //     await RlsCoreService.setUserPermissions(table, data.data.id, ['view', 'read', 'write'], userPermissions);
        // }

        // if (saveTabularParts) {
        //     const TabularPartsInstance = new TabularPartsClass({ owner_id: id });
        //     for (let tbName in TabularParts) {
        //         const tabular = treeObject.TabularParts[tbName].id;
        //         const tbData = TabularParts[tbName];

        //         // const queueTB = new QueueAgent();
        //         let rows = [];
        //         let rowIndex = 0;
        //         for (const row of tbData) {
        //             rowIndex++
        //             if (!row['rank']) row['rank'] = rowIndex;
        //             row['owner'] = docId;
        //             rows.push(row);
        //         }
        //         await TabularPartsInstance.bulkCreate(id, tabular, rows, { transaction, connector });
        //         // queueTB.commit();
        //     }
        // }

        // const result = data;

        // const afterSave = await MetaObjectServerCode.onAfterSave(treeObject, item, body, result);
        // if (afterSave?.result === false) { // Именно проверка на false, чтобы не прошел undefine
        //     throw afterSave.error ?? { status: 409, message: "Блокировка ПослеЗаписи документов" }
        // }

        // return result;
    }

    async delete(id, body, serviceOptions = {}) {
        let { transaction } = serviceOptions;

        const guide = new GuideClass({ id });
        const treeObject = await guide.tableInfo(guide, id);
        const item = await guide.getItem(id);

        const beforeDelete = await MetaObjectServerCode.onBeforeDelete(treeObject, item, body);
        if (beforeDelete?.result === false) {
            // Именно проверка на false, чтобы не прошел undefine
            throw (
                beforeDelete.error ?? {
                    status: 409,
                    message: this.errorMessages.delete.onBeforeDelete,
                }
            );
        }

        const { table, rls } = item.manifest.settings;
        const { connector } = await this.getConnector(item);

        let localTransaction = false;
        if (!transaction) {
            const transactionAgent = new TransactionAgent(connector);
            transaction = await transactionAgent.transaction();
            localTransaction = true;
        }

        let table_id = body['id'];
        let where = {
            id: table_id,
        };
        if (!table_id) throw 'Не передан id записи для удаления';

        let result;
        try {
            const TabularPartsInstance = new TabularPartsClass({ owner_id: id });
            for (const tabularPartsGUID in treeObject.TabularPartsGUID) {
                await TabularPartsInstance.deleteByOwner(id, tabularPartsGUID, where.id, {
                    transaction,
                    connector,
                });
            }

            /**
             * пытаемся удалить
             * если успешно чистим досупы
             * если нет пытаемся маркдельнуть
             */
            const data = await guide.dataDelete(connector, table, {
                where,
                rls,
                table,
                transaction,
            });
            if (rls && data) {
                await RlsCoreService.delPermissionsByTableId(table, table_id, { transaction });
            }
            if (!data && treeObject.Fields?.markdel) {
                await guide.dataUpdate(
                    connector,
                    table,
                    { markdel: true },
                    { where, rls, table, transaction }
                );
            }

            result = { result: data };
            localTransaction && (await transaction.commit());
        } catch (err) {
            localTransaction && (await transaction.rollback());
            throw err;
        }

        const afterDelete = await MetaObjectServerCode.onAfterDelete(
            treeObject,
            item,
            body,
            result
        );
        if (afterDelete?.result === false) {
            // Именно проверка на false, чтобы не прошел undefine
            throw (
                afterDelete.error ?? {
                    status: 409,
                    message: this.errorMessages.delete.onAfterDelete,
                }
            );
        }

        return result;
    }

    async synch(id, fieldsSettings) {
        const guide = new GuideClass({ id });
        const item = await guide.getItem(id);
        const { table } = item.manifest.settings;
        const treeObject = await guide.tableInfo(guide, id);

        const { connector } = await this.getConnector(item);

        const Tables = {};
        Tables[table] = {
            Fields: treeObject.Fields,
            fieldsSettings: fieldsSettings[table].table,
            Keys: treeObject.Keys,
        };

        let result = [];
        const data = await guide.dataSynch(connector, table, Tables[table]);
        result.push(data);

        const TabularPartsInstance = new TabularPartsClass({ owner_id: id });
        for (const tbName in treeObject.TabularParts) {
            const tabular = treeObject.TabularParts[tbName].id;

            const res = await TabularPartsInstance.synch(id, tabular, fieldsSettings);
            result.push(res);
        }

        return { result };
    }

    async drop(id) {
        //
        const meta = new GuideClass({ id });
        const item = await meta.getItem(id);
        const { table } = item.manifest.settings;
        const treeObject = await meta.tableInfo(meta, id);

        const { connector, connectorData } = await this.getConnector(item);

        const TabularParts = Object.keys(treeObject.TabularParts);
        const Tables = [table, ...TabularParts];

        const result = [];

        for (const table of Tables) {
            const data = await connector.drop(table);
            result.push(data);
        }
        return { result };
    }

    /**
     * @param {string} id
     * @returns
     */
    async model(id) {
        //
        const meta = new GuideClass({ id });
        const item = await meta.getItem(id);
        const { table } = item.manifest.settings;
        const treeObject = await meta.tableInfo(meta, id);

        const { connector, connectorData } = await this.getConnector(item);

        const TabularParts = Object.keys(treeObject.TabularParts);
        const Tables = [table, ...TabularParts];

        const result = {};
        for (const table of Tables) {
            let nowFields = {};
            try {
                nowFields = await connector.model(table);
            } catch (e) {
                // На тот случай если нет такой таблицы
                console.log(e);
            }
            result[table] = nowFields;
        }

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
}

module.exports = GuideClass;
