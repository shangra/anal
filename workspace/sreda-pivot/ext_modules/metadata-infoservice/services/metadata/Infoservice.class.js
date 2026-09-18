/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');

/** LOCAL * */
const MetadataClass = require('../../../metadata-cmp/services/Metadata.service');
const ForeignKeysClass = require('./shared/ForeignKeys.class');
const IndexesClass = require('./shared/Indexes.class');
const FieldsClass = require('./shared/Fields.class');
const KeysClass = require('./shared/Keys.class');

const ConnectorClass = require('../../../metadata-connector/services/metadata/Connector.class');

const InfoServiceGuidClass = require('../../../metadata-infoservice-guide/services/metadata/InfoserviceGuide.class');
const GlobalService = require('../../../../core/services/Global.service');
const ApiError = require('../../../../core/exceptions/ApiError');

const { isNil, mergeDeep } = require('../../../utils/services');
const LitePattern = require('lite-pattern');

const WhereFormaterClass = require('./shared/utils/WhereFormater.class');
const WhereFormater = new WhereFormaterClass();

const Metadata = new MetadataClass();

const QueryBuilderClass = require('./query/Query.class');
const Factory = require('./select/Factory.class');
const SelectClass = require('./select/Select.class');
const AccountClass = require('./matrix/account/Account.class');

/**
 * @typedef {string | { link: string, value: string }} Link
 * @typedef {{ table: string, alias: string }} Ifrom
 * @typedef {import('../../../metadata-cmp/services/metadata/source/type').default} LevelClassI
 */

class InfoserviceClass extends LevelClass {
    constructor(props) {
        super(props);

        this.id = 'b44b4843-f919-4362-b95c-4c354b2505bd';
        this.component = 'Infoservice';
        this.childrenCRUD = ['r', 'u', 'd', 'rls'];

        this.props = {
            id: this.id,
            owner_id: '00000000-0000-0000-0000-000000000000',
            class_id: this.id,
            class: this.component,
            name: 'Инфосервисы',
            description: 'Инфосервисы',
            crud: ['c', 'rls'],
            routes: 'metadata/infoservice',
        };
    }

    /**
     * @public
     *
     * @param {*} item
     * @param {*} options
     * @returns
     */
    async subTree(item, options) {
        return Promise.all([
            new FieldsClass({ owner_id: item.id, parent: item }).tree(options),
            new IndexesClass({ owner_id: item.id, parent: item }).tree(options),
            new KeysClass({ owner_id: item.id, parent: item }).tree(options),
            new ForeignKeysClass({ owner_id: item.id, parent: item }).tree(options),
        ]);
    }

    // NEW FACTURE
    /**
     * @public
     *
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
        const ForeignKeys = {};
        const ForeignKeysGUID = {};
        const Indexes = {};
        const Refs = {};

        const AllFields = {};
        const AllFieldsGUID = {};

        for (let i = 0; i < parents.length; i++) {
            const child = parents[i];

            if (child.class === 'Fields') {
                const fieldInfo = child.manifest.settings;
                const ref = `${fieldInfo.ref}` !== '0' ? fieldInfo.ref : undefined;
                const foreignkey =
                    `${fieldInfo.foreignkey}` !== '0' ? fieldInfo.foreignkey : undefined;

                const off = fieldInfo.onoff ?? false;

                AllFields[fieldInfo.nameField] = {
                    field: fieldInfo.nameField,
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    type: fieldInfo.type,
                    hierarchy: fieldInfo.hierarchy ?? false,
                    subtotal: fieldInfo.subtotal ?? false,
                    virtual: fieldInfo.virtual ?? false,
                    calculated: fieldInfo.calculated ?? false,
                    value: fieldInfo.virtual ? fieldInfo.fnfield : fieldInfo.nameField,
                    foreignkey,
                    accountRef: fieldInfo.accountRef,
                    ref: foreignkey ?? ref,
                    refOrderField: fieldInfo.refOrderField,
                    refOrderDirection: fieldInfo.refOrderDirection,
                    SQLQueryFormat: fieldInfo.SQLQueryFormat,
                    isOrderOn: fieldInfo.isOrderOn,
                    useWith: fieldInfo.useWith,
                };

                AllFieldsGUID[child.id] = JSON.parse(
                    JSON.stringify(AllFields[fieldInfo.nameField])
                );

                if (!off) {
                    Fields[fieldInfo.nameField] = JSON.parse(
                        JSON.stringify(AllFields[fieldInfo.nameField])
                    );
                    FieldsGUID[child.id] = Fields[fieldInfo.nameField];
                    if (ref) {
                        Refs[fieldInfo.nameField] = JSON.parse(
                            JSON.stringify(Fields[fieldInfo.nameField])
                        );

                        if (AllFields[fieldInfo.nameField]) {
                            Refs.useWith = AllFields[fieldInfo.nameField].useWith;
                        }

                        if (AllFields[fieldInfo.nameField]) {
                            Refs.useView = AllFields[fieldInfo.nameField].useView;
                        }

                        const meta = await Metadata.getInstance(ref, {}, InfoserviceClass);

                        if (ref?.value) {
                            Refs[fieldInfo.nameField].treeObject = await meta.tableInfo(
                                meta,
                                ref.value
                            );
                        }
                    }
                    if (foreignkey) {
                        Refs[fieldInfo.nameField] = JSON.parse(
                            JSON.stringify(Fields[fieldInfo.nameField])
                        );

                        const meta = await Metadata.getInstance(ref, {}, InfoserviceClass);

                        if (ref?.value) {
                            Refs[fieldInfo.nameField].treeObject = await meta.tableInfo(
                                meta,
                                ref.value
                            );
                        }
                    }
                }
            }
        }

        const promise = parents.map(async (child) => {
            if (child.class === 'Keys') {
                const childKeys = children[child.id] || [];

                const keyField = {};
                for (let i = 0; i < childKeys.length; i++) {
                    const key = childKeys[i];

                    const keyName = key.manifest.name;
                    const keyGUID =
                        typeof key.manifest.settings.ref === 'object'
                            ? key.manifest.settings.ref.value
                            : key.manifest.settings.ref;
                    if (!AllFieldsGUID[keyGUID]) {
                        throw ApiError.BadRequest(
                            `Не удалось найти поле ключа (${keyName}) инфосервиса`
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
                const childIndexes = children[child.id];
                // const keyManifest = child.manifest;
                const indexField = {};
                for (let i = 0; i < childIndexes.length; i++) {
                    const index = childIndexes[i];

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
        });

        await Promise.all(promise);

        for (const child of parents) {
            if (child.class === 'ForeignKeys') {
                if (
                    child.manifest?.settings?.key &&
                    child.manifest?.settings?.guide &&
                    child.manifest?.settings?.guideKey
                ) {
                    const value =
                        typeof child.manifest.settings.key === 'object'
                            ? child.manifest.settings.key.value
                            : child.manifest.settings.key;
                    const key = JSON.parse(JSON.stringify(KeysGUID[value]));
                    const alias = Object.keys(key.fields).join('_');
                    const field = `CONCAT(${Object.keys(key.fields).join(", '::' ,")})`;
                    ForeignKeys[child.name] = {
                        name: child.name,
                        description: child.description,
                        id: child.id,
                        key,
                        guide: child.manifest.settings.guide,
                        guideKey: child.manifest.settings.guideKey,
                        alias,
                        field,
                    };
                    ForeignKeysGUID[child.id] = JSON.parse(JSON.stringify(ForeignKeys[child.name]));
                }
            }
        }

        return {
            Fields,
            FieldsGUID,
            Keys,
            KeysGUID,
            ForeignKeys,
            ForeignKeysGUID,
            Indexes,
            Refs,
        };
    }

    /**
     * @private
     *
     * @param {{ id: Link, key?: Link }} param0
     * @param {string[]} PKsData
     * @param {string[]} [fieldList]
     * @returns
     */
    async readRef({ id, key }, PKsData, fieldList = []) {
        // TODO работает только с ключами 1 к 1, не поддерживает составные ключи
        const resultRef = {};
        const resultFields = {};
        const localKey = typeof key === 'object' ? key.value : key;

        const meta = await Metadata.getInstance(id, {}, InfoServiceGuidClass); // new TableClass({ id });
        const idValue = typeof id === 'object' ? id.value : id;
        // const meta = new InfoServiceGuidClass({ id: id });
        const treeObject = await meta.tableInfo(meta, idValue);

        /** @type {string | string[]} */
        let view;
        /** @type {string | string[]} */
        let viewAlias;

        const PKs = [];
        for (const keyName in treeObject.Keys) {
            const guidKey = treeObject.Keys[keyName];
            const findKey = !localKey ? guidKey.settings.primarykey : guidKey.id === localKey; // Если не ищем какой-то особенный ключ, то ищем только первичный
            if (findKey) {
                PKs.push(guidKey);

                if (guidKey.settings.templateview && guidKey.settings.templateview.trim() !== '') {
                    let template = guidKey.settings.templateview;
                    const reg = /\[\[\s*(?<field>[-_a-z0-9]+)\s*\]\]/gimu;
                    const array = [...guidKey.settings.templateview.matchAll(reg)];
                    array.forEach((value) => {
                        template = template.replaceAll(value[0], `'&&${value.groups.field}&&'`);
                    });
                    template = `'${template}'`.split('&&');
                    viewAlias = 'view';
                    view = [`CONCAT(${template.join(' , ')})`, viewAlias];
                } else if (guidKey.settings.fieldview) {
                    const fieldView =
                        typeof guidKey.settings.fieldview === 'object'
                            ? guidKey.settings.fieldview.value
                            : guidKey.settings.fieldview;

                    // если поле отключено, то его в FieldsGUID не будет, только в AllFieldsGUID
                    // ... то не будем использовать PK при отображении в качестве фоллбэка,
                    // но с другой стороны поле-то отключено, значит и использовать мы его не можем?..
                    // было:
                    // view = treeObject.FieldsGUID[fieldView]?.field;
                    // теперь:
                    view =
                        treeObject.AllFieldsGUID?.[fieldView]?.field ??
                        treeObject.FieldsGUID[fieldView]?.field;

                    viewAlias = view;
                }
            }
        }

        const PK = Object.keys(PKs[0].fields);
        const PKAlias = Object.keys(PKs[0].fields).join('_');
        const PKField =
            PK.length > 1 ? `CONCAT(${Object.keys(PKs[0].fields).join(", '::' ,")})` : PK[0];

        const PKAttribute = PK.length > 1 ? [PKField, PKAlias] : PKField;
        const PKWhere = PK.length > 1 ? `$sql(${PKField})` : PKField;
        let attributes = [];
        if (!view) view = PKField; // если не нашли, что использовать, используем просто ключ
        if (!viewAlias) view = PKField;
        attributes.push(view);

        attributes = [...new Set([...attributes, ...fieldList])];

        if (attributes.length > 0) {
            const options = {
                attributes: [...new Set([...attributes, PKAttribute])],
                where: {
                    [PKWhere]: PKsData,
                },
                hierarchy: false,
                withOutCount: true,
                withOutRefs: true,
                withOutOrder: true,
            };

            /** @type {{rows: object[]}} */
            const { rows } = await meta.read(idValue, options);

            rows.forEach((item) => {
                resultRef[item[PKAlias]] = item[/** @type {string} */ (viewAlias)];
                const fields = {};
                attributes.forEach((attr) => (fields[attr] = item[/** @type {string} */ (attr)]));
                resultFields[item[PKAlias]] = fields;
            });
        } else {
            PKsData.forEach((item) => (resultRef[item] = item));
        }

        return { ref: resultRef, fields: resultFields, viewField: viewAlias };
    }

    /**
     * @private
     *
     * Собирает значения из rows в refs.
     *
     * @param {Object} refs - Ссылки.
     * @param {Object} rows - Строки.
     */
    async getRefValues(refs, rows) {
        const refsData = {};
        Object.keys(refs).forEach((key) => (refsData[key] = {}));
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            for (const fieldAlias in refs) {
                const value = row[fieldAlias];
                if (!isNil(value)) {
                    refsData[fieldAlias][value] = (refsData[fieldAlias][value] ?? 0) + 1;
                }
            }
        }

        return refsData;
    }

    /**
     * @private
     *
     * из массива данных вытаскиваем уже имеющиеся записи полей
     * маркером поля является __
     * в результате формируются ref и refFields
     *
     * @param {Record<string, any>} refsToParse
     * @param {object[]} rows
     * @returns
     */
    async getAllLocalRefs(refsToParse, rows) {
        const refs = {};
        const refFields = {};

        rows.forEach((row) => {
            for (const key in refsToParse) {
                const viewField = refsToParse[key];

                refs[key] ||= {};
                refs[key][row[key]] = row[`${key}__${viewField}`];

                refFields[key] ||= {};

                for (const rowKey in row) {
                    const check = rowKey.startsWith(`${key}__`);

                    refFields[key] ||= {};

                    if (check) {
                        const attr = rowKey.replace(`${key}__`, '');

                        refFields[key][row[key]] ||= {};
                        refFields[key][row[key]][attr] = row[rowKey];
                    }
                }
            }
        });

        return {
            refs,
            refFields,
            viewField: {},
        };
    }

    /**
     * @private
     *
     * Формирование refs из данных rows.
     *
     * @param {unknown} refs - Ссылки.
     * @param {unknown} rows - Строки.
     *
     * @returns {Promise<Object>}
     */
    async getAllRefs(refs, rows) {
        this.console(`Получаем ссылки по данным`);

        const refData = await this.getRefValues(refs, rows);
        const fieldsData = {};
        const viewField = {};

        const result = { refs: refData, fields: fieldsData, viewField };
        const refKeys = Object.keys(refs);

        if (!refKeys.length) return result;

        const promise = refKeys.map(async (key) => {
            const refItem = refs[key];

            try {
                if (refItem.foreignkey) {
                    const idGuide = refItem.ref;
                    const PK = Object.keys(refData[key]);
                    const resultReadRef = await this.readRef(idGuide, PK);

                    refData[key] = resultReadRef.ref;
                } else if (
                    refItem.ref &&
                    (typeof refItem.ref === 'string' || typeof refItem.ref === 'object')
                ) {
                    const idGuide = refItem.ref;
                    const PK = Object.keys(refData[key]);

                    const resultReadRef = await this.readRef(
                        { id: idGuide },
                        PK,
                        refItem.fieldChildren
                    );
                    refData[key] = resultReadRef.ref;
                    fieldsData[key] = resultReadRef.fields;
                    viewField[key] = resultReadRef.viewField;
                }
            } catch (e) {
                throw ApiError.BadRequest(
                    `Не смогли получить данные по ссылке ${refItem.name}: ${e.message}`,
                    []
                );
            }
        });

        await Promise.all(promise);

        return result;
    }

    /**
     * @private
     *
     * Формирует самый нижний подзапрос на основе пользовательских фильтров.
     * Если первый параметр не проходит по внутренему условию возвращает только второй.
     *
     * @param {string | any } sqlalias - Алиасы SQL.
     * @param {Object} table - Табличные данные.
     *
     * @returns {Object} - Обхект с пользовательским запросом.
     */
    getUserQuery(sqlalias, table, options) {
        let userQuery;

        if (sqlalias && sqlalias.trim() !== '') {
            userQuery = {
                table: sqlalias,
                alias: table,
            };
        }
        return userQuery ?? table;
    }

    /**
     * Предикат/парсер для JSON строки
     * (Проверка может пропустить такую строку: '12345')
     *
     * @param {string} data - данные для проверки.
     *
     * @returns {Object} - Предположительно объект после парсинга.
     */
    toJSON(data) {
        let result = {};
        try {
            result = JSON.parse(data);
        } catch (e) {
            // Ничего не делаем, считаем это нормальным
        }
        return result;
    }

    /**
     * @private
     *
     * @param {*} fieldName
     * @param {*} treeObject
     * @returns
     */
    async getLinkForForeignKeys(fieldName, treeObject) {
        const fieldLink = structuredClone(treeObject.Refs[fieldName]); // {...treeObject.Refs[fieldName]};
        if (fieldLink.foreignkey) {
            const foreignKeyGuid =
                typeof fieldLink.foreignkey === 'object'
                    ? fieldLink.foreignkey.value
                    : fieldLink.foreignkey;
            const foreignKey = treeObject.ForeignKeysGUID[foreignKeyGuid];
            fieldLink.ref = {
                id: foreignKey.guide,
                key: foreignKey.guideKey,
            };
        }
        return fieldLink;
    }

    /**
     * Логгер
     *
     * @private
     *
     */
    console(msg, meta) {
        let dd = new Date();
        console.log(
            `------- ${dd.getMinutes()}:${dd.getSeconds()}.${dd.getMilliseconds()} --------`,
            msg
        );
    }

    /**
     * Достает срез данных.
     *
     * @param {string} id - ID инфосервиса.
     * @param {Object} inputOptions - Пользовательские опции.
     *
     * @returns {Promise<Object>}  - Данные из БД.
     */
    async read(id, inputOptions) {
        // Возможно это преобразование стоит переместить на уровень мидлваров или контроллеров
        const options = JSON.parse(JSON.stringify(inputOptions));

        this.console(`Получаем данные по id: ${id}`);

        /** @type {LevelClassI} */
        const meta = new InfoserviceClass({ id });

        const [item, treeObject] = await Promise.all([meta.getItem(id), this.tableInfo(meta, id)]);

        treeObject.Meta = item;

        const { table, onoff, sqlalias, filter: preFilter, blockMessage = '' } = item.manifest.settings;

        if (onoff) {
            throw ApiError.ResourseBlocked(
                blockMessage || `Таблица ${table} заблокирована для запросов в инфосервисе ${item?.name}`
            );
        }

        const { connector } = await this.getConnector(item);

        const calculatedField = {};
        const refsForLoad = {};
        const cols = [];

        //Отделим фильтры для справочников и для агрегатов
        const { dictionaryParams, whereParams } = WhereFormater.getDictionaryParams(options.where);
        options.where = whereParams;

        for (const key in options.systemWhere ?? {}) {
            if (!treeObject.Refs[key] && options.systemWhere[key]?.__parent__ !== undefined) {
                options.systemWhere[key] = options.systemWhere[key]?.__parent__;
            }
        }

        this.console(
            `Получили ограничение доступов: ${JSON.stringify(
                options?.metaAccessWhere ?? {},
                null,
                2
            )}`
        );

        options.dictionaryWhere = WhereFormater.dictionary(dictionaryParams ?? {});

        const flatWhere = WhereFormater.flat({
            ...options.systemWhere,
            ...options.where,
            ...options.dictionaryWhere,
            ...options.metaAccessWhere,
        });

        if (!options.attributes) {
            //Для открытия витрины
            options.attributes = [];
            for (const fieldName in treeObject.Fields) {
                const field = treeObject.Fields[fieldName];

                cols.push(field);

                if (field.calculated) {
                    // Не знаю пока что делать с такими полями :(
                    calculatedField[field.name] = field;
                } else if (field.foreignkey) {
                    //TODO Нужно разобраться как работают внешние ключи
                    // const foreignkey = typeof field.foreignkey === 'object' ? field.foreignkey.value : field.foreignkey;
                    // const fkey = treeObject.ForeignKeysGUID[foreignkey];
                    // options.attributes.push([fkey.field, fieldName]);
                    options.attributes.push(fieldName);
                } else {
                    options.attributes.push(fieldName);
                }
            }
        } else {
            let whereAttributes = [];
            for (let i = 0; i < flatWhere.length; i++) {
                whereAttributes = [...whereAttributes, ...Object.keys(flatWhere[i])];
            }

            options.attributesForDel = whereAttributes.filter(
                (attr) => !options.attributes.includes(attr)
            );
            options.attributes = [...new Set([...options.attributes, ...whereAttributes])];
        }

        // Создаем окружение
        const attributesAggr = [];
        const fields = [];
        for (let i = 0; i < options.attributes.length; i++) {
            const attribute = options.attributes[i];
            if (treeObject.Fields[attribute]?.calculated) {
                const field = treeObject.Fields[attribute];
                calculatedField[field.name] = field;
            }

            if (!Array.isArray(attribute) && typeof attribute === 'object' && attribute.field) {
                fields.push(attribute.field);
                attributesAggr.push(attribute);
            } else {
                fields.push(Array.isArray(attribute) ? attribute[1] : attribute);
            }
        }

        options.fields = Array.from(new Set(fields));

        const filter = (preFilter && this.toJSON(preFilter)) || { attributes: [] };
        filter.userAttributes = [].concat(filter.attributes || [], Array.from(new Set(fields)));

        const localOptions = structuredClone(options);
        localOptions.where = WhereFormater.normalize(localOptions.where);

        const behaviourBuilder = new Factory(Metadata);

        const account = new AccountClass({ meta: Metadata });

        const select = new SelectClass({
            behaviourBuilder,
            treeObject,
            connector,
            table,
        });

        const from = this.getUserQuery(sqlalias, table);

        const query = new QueryBuilderClass({
            connector,
            meta: Metadata,
            select,
            account,
            logger: this,
        });

        const { rows, count, refsToParse } = await query.query({
            options: localOptions,
            treeObject,
            from,
            id,
        });

        this.console(`Получаем данные по запросу`);

        options.attributes = options.attributes.filter(
            (i) => !options.attributesForDel?.includes(i)
        );

        // TODO МОЖНО КАК ТО ОТ ЭТОГО ИЗБАВИТЬСЯ? ВЫГЛЯДИТ КАК ЛИШНЯЯ ЛОГИКА
        for (const field of options.attributes) {
            let fieldLink;
            let fieldAlias;

            if (Array.isArray(field) && field.length === 2 && treeObject.Refs[field[1]]) {
                const fieldName = field[1];
                fieldAlias = fieldName;
                fieldLink = await this.getLinkForForeignKeys(fieldName, treeObject);
            } else if (typeof field === 'object' && field.field && treeObject.Refs[field.field]) {
                const fieldName = field.field;
                fieldLink = await this.getLinkForForeignKeys(fieldName, treeObject);
                fieldAlias = field.alias;
            } else if (treeObject.Refs[field]) {
                fieldLink = await this.getLinkForForeignKeys(field, treeObject);
                // fieldLink = treeObject.Refs[field];
                fieldAlias = field;
            }

            if (fieldAlias) {
                if (options.settings?.fields[field]) {
                    fieldLink.fieldChildren = options.settings.fields[fieldAlias].children;
                }
                if (!refsToParse[fieldAlias]) {
                    refsForLoad[fieldAlias] = fieldLink;
                }
            }
        }

        let refs = {};
        let refFields = {};
        let viewField = {};
        if (!options.withOutRefs) {
            ({ refs, fields: refFields, viewField } = await this.getAllRefs(refsForLoad, rows));
        }

        if (refsToParse) {
            const { refs: parsedRefs, refFields: parsedRefFields } = await this.getAllLocalRefs(
                refsToParse,
                rows
            );

            mergeDeep(refs, parsedRefs || {});
            mergeDeep(refFields, parsedRefFields || {});
        }

        if (Object.keys(calculatedField).length > 0) {
            // Рассчитаем виртуальные поля
            this.console(`Получаем рассчитываемые поля`);
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                for (const fieldName in calculatedField) {
                    const field = calculatedField[fieldName];
                    //
                    const params = {
                        options: inputOptions,
                        field,
                        row,
                        rows,
                        refs,
                        refFields,
                    };
                    row[fieldName] = await LitePattern.render({ main: field.value }, params, {
                        require: GlobalService.require,
                    });
                }
            }
        }

        this.console(`Возвращаем результат`);

        return {
            rows,
            cols,
            refs,
            refFields,
            viewField,
            count,
            offset: options.offset ?? 0,
            limit: options.limit,
            options,
            metadata: { ...item, treeObject },
        };
    }

    /**
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
     * Метод для перегрузки выборки из бд
     *
     * @param {Object} from - Запрос для orm
     *
     * @private
     */
    async getData(connector, from, options, id) {
        // NOTE запрос формируется дважды и логируется не тот, что выполняется (несмотря на то, что они де-факто должны быть одинаковые)
        this.console(`Запрос к данным инфосервиса`, {
            query: await connector.findSQL(from, options),
        });
        return await connector.findAll(from, { ...options });
    }

    /**
     * метод для перегрузки выборки из бд
     * @private
     */
    async countData(connector, from, options, id) {
        return await connector.count(from, { ...options });
    }
}

module.exports = InfoserviceClass;
