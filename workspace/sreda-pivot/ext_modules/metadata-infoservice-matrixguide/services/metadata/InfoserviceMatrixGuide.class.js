//types
/**
 * @typedef {import('./shared/types/internal/Metadata').default<{ settings: { table: string, filter: string, onoff: boolean, blockMessage?: string, hideNestedIfEqual?: boolean }}>} Metadata
 * @typedef {import('../../../metadata-connector/services/metadata/types').IConnectionField} IConnectionField
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import('../../../metadata-cmp/services/metadata/source/type').QueryOptionI} QueryOptionI
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').Ifrom} Ifrom
 * @typedef {import('./shared/types/internal/TreeObject').IHierarchySettings} IHierarchySettings
 * @typedef {import('../../../metadata-cmp/services/metadata/source/type').default} LevelClassI
 * @typedef {import('./shared/types/internal/Hierarchy').HierarchyField} HierarchyField
 * @typedef {import('./shared/types/internal/TreeObject').default} TreeObject
 * @typedef {import('./shared/types/internal/Hierarchy').default} Hierarchy
 * @typedef {import('./shared/types/internal/KeyField').default} KeyField
 * @typedef {import('./shared/types/internal/Field').default} Field
 * @typedef {import('./shared/types/internal/Key').default} Key
 * @typedef {import('./shared/types/internal/Ref').default} Ref
 * @typedef {import('sequelize').FindOptions} FindOptions
 * @typedef {import('sequelize').Transaction} Transaction
 */

/**
 * @typedef {object} viewFieldI
 * @param {string} field
 */

/** GLOBAL * */
const httpContext = require('../../../../core/services/http-context');
const RefsClass = require('../../../metadata-logic/refs.class');
const ApiError = require('../../../../core/exceptions/ApiError');
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');
const ConnectorClass = require('../../../metadata-connector/services/metadata/Connector.class');

const { ref_extract } = require('../../../metadata-cmp/util');


/** LOCAL * */
const HierarchyClass = require('./shared/Hierarchy.class');
const FieldsClass = require('./shared/Fields.class');
const KeysClass = require('./shared/Keys.class');

const Refs = new RefsClass();

const { isNil, isEmptyObject, arrToMap, hop, uniqueValues, arrToMapArr } = require('../../../utils/services');

const constants = require('../../constants');
const SysFieldsClass = require('./shared/SysFields.class');
const WhereFormater = require('../../../meta-where-formatter');

const defaultAttrs = ['id', 'parent', 'name'];

/**
 * @implements {LevelClassI}
 */
class InfoServiceMatrixGuidClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'InfoserviceMatrixGuide';

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

    /**
     * @public
     */
    async subTree(item, options = {}) {
        return Promise.all([
            new SysFieldsClass({ owner_id: item.id }).tree(options),
            new FieldsClass({ owner_id: item.id }).tree(options),
            new HierarchyClass({ owner_id: item.id, parent: item }).tree(options),
            new KeysClass({ owner_id: item.id, parent: item }).tree(options),
        ]);
    }

    /**
     * TODO
     * 
     * @public
     * 
     * @param {string} id 
     */
    async getSettings(id, tableInfo) {
        const info = tableInfo || await this.tableInfo(this, id);

        const item = await this.getItem(id);

        const { SysFields, Hierarchy } = info;

        const { table, onoff, blockMessage = '' } = item.manifest.settings;
        if (onoff) {
            throw ApiError.ResourseBlocked(blockMessage || `Таблица ${table} заблокирована для запросов ${item?.name}`);
        }

        /** @type {Field} */
        const IdField = SysFields['id'];
        /** @type {Field} */
        const ParentField = SysFields['parent'];
        /** @type {Field} */
        const ViewField = SysFields['name'];

        const maxLevel = Object.values(Hierarchy).length - 1;

        return {
            IdField,
            ParentField,
            ViewField,
            fieldhierarchydefault: { $eq: null },
            maxLevel
        };
    }

    /**
     * TODO
     * 
     * @public
     * 
     * @param {LevelClassI} meta
     * @param {string} id
     * @param {{ transaction?: Transaction }} [options]
     * @returns {Promise<TreeObject>}
     */
    async tableInfo(meta, id, options) {
        const { transaction } = options ?? {};

        const { parents, children } = await meta.getFamilyTree(id, { transaction });

        /** @type {Record<string, Field>} */
        const SysFields = {};
        /** @type {Record<string, Field>} */
        const Fields = {};
        /** @type {Record<string, Field>} */
        const FieldsGUID = {};
        /** @type {Record<string, Key>} */
        const Keys = {};
        /** @type {Record<string, Key>} */
        const KeysGUID = {};
        /** @type {Record<string, Field>} */
        const Refs = {};
        /** @type {Record<string, Hierarchy>} */
        const Hierarchy = {};

        //технические поля
        /** @type {Record<string, Field>} */
        const AllFields = {};
        /** @type {Record<string, Field>} */
        const AllFieldsGUID = {};

        for (const child of parents) {
            if (child.class === constants.SysFields.component) {
                const field = SysFieldsClass.parse(child)

                SysFields[field.field] = field;

                AllFields[field.field] = SysFields[field.field];
                AllFieldsGUID[child.id] = SysFields[field.field];

                if (!field.onoff) {
                    // Fields[field.field] = SysFields[field.field];
                    SysFields[field.field] = SysFields[field.field];

                    if (field.ref) {
                        Refs[field.field] = SysFields[field.field];
                    }
                }
            }

            if (child.class === constants.Fields.component) {
                const field = FieldsClass.parse(child);

                AllFields[field.field] = field;
                AllFieldsGUID[child.id] = AllFields[field.field];

                if (!field.onoff) {
                    Fields[field.field] = AllFields[field.field];
                    FieldsGUID[child.id] = Fields[field.field];

                    if (field.ref) {
                        Refs[field.field] = Fields[field.field];
                    }
                }
            }
        }

        for (const child of parents) {
            if (child.class === 'Keys') {
                const childKeys = children[child.id] || [];

                /** @type {Record<string, KeyField>} */
                const keyField = {};
                for (const key of childKeys) {
                    const keyName = key.manifest.name;
                    let keyGUID = key.manifest.settings.ref;
                    keyGUID = keyGUID?.key ?? keyGUID;
                    keyGUID = typeof keyGUID === 'object' ? keyGUID.value : keyGUID;

                    if (!AllFieldsGUID[keyGUID]) {
                        throw ApiError.BadRequest(`Не удалось найти поле ключа (${keyName}) справочника`);
                    }

                    const { field, virtual, value } = AllFieldsGUID[keyGUID];
                    keyField[field] = {
                        field,
                        virtual,
                        fieldValue: value,
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

            if (child.class === 'Hierarchy') {
                const aliasFields = children[child.id] || [];

                if (aliasFields?.some((alias) => !alias?.manifest?.settings?.ref?.value)) {
                    // @ts-ignore
                    throw ApiError.BadRequest(`Не удалось найти поле ссылки на поле представления в иерархии (${child.name}) плоского справочника ${meta?.name}`);
                }

                Hierarchy[child.id] = {
                    fields: aliasFields.map((alias) => ({
                        alias,
                        field: AllFieldsGUID[alias.manifest.settings.ref.value],
                    })),
                    id: child.id,
                    name: child.name,
                    class: child.class,
                    description: child.description,
                    settings: child.manifest.settings,
                    Keys: null,
                    isMaxVisibleLevel: child.manifest?.settings?.isMaxVisibleLevel
                };
            }
        }

        // так как филды динамически определяются ирерархией то после формирования ключей и иерархии
        // сделует обновить значения филдов чтобы иметь актуальные данные по ним в три дата
        for (const hierarchyId in Hierarchy) {
            const item = Hierarchy[hierarchyId];

            item.Keys = KeysGUID[item.settings.keyId.value];
        }

        return {
            SysFields,

            Fields,
            FieldsGUID,

            AllFields,
            AllFieldsGUID,

            Keys,
            KeysGUID,

            Refs,

            Hierarchy,
        };
    }

    /**
     * TODO написано в спешке и отсутствии логики - нужно переписать когда нибудь
     * 
     * @public
     * 
     * @param {string} id
     * @param {QueryOptionI} options
     */
    async query(id, options) {
        let {
            isFilter,
            where,
            systemWhere,
            dictionaryWhere,
            metaAccessWhere,
            connectionFields = [{}],
            level,
            isRecursion,
            isVisible,
            recursiveAttrs
        } = structuredClone(options);

        recursiveAttrs ||= [];

        /** @type {[TreeObject, Partial<Metadata>]} */
        const [treeObject, item] = await Promise.all([this.tableInfo(this, id), this.getItem(id)]);

        const { AllFields, SysFields, Fields, Hierarchy } = treeObject;

        new HierarchyClass({ owner_id: item.id, parent: item }).check(Hierarchy);

        const { filter, hideNestedIfEqual } = this.getManifestSettings(item);

        const defaultOptions = this.getDefaultOptions(filter, options);

        const { connector } = await this.getConnector(item);

        const maxLevel = Object.values(Hierarchy).length - 1;

        const mappedHierarchy = this.mappedHierarchy(Hierarchy);

        dictionaryWhere = this.generateDictWhere({ where: dictionaryWhere || {}, mappedHierarchy, fields: AllFields, sysFields: SysFields, maxLevel });

        /**
         * применяем ограничения доступов и первоначальную фильтрацию по подполям
         */
        const from = await this.generateEnvironment(item, connector, [this.getAndWhere([defaultOptions.where, metaAccessWhere])]);

        let alias = /** @type {string} */(from.alias || from);

        if (isFilter) {
            return this.filter({ from, recursiveAttrs, connector, connectionFields: /** @type {IConnectionField[]} */(connectionFields), alias, fields: AllFields, mappedHierarchy, maxLevel });
        }

        if (!isRecursion) {
            return this.plain({ connectionFields, fields: AllFields, options, connector, from });
        }

        const isBlocked =
            !mappedHierarchy[level + 1]
            || !await this.isNextLevelAvaliable({ level, treeObject })

        level = maxLevel <= level ? maxLevel : level;

        // TODO!!!
        // получим поле pk и его алиас - для него есть отдельный метод
        const { field: idField, alias: idAlias, } = this.getHierarchyLevelKeys({ fields: AllFields, mappedHierarchy, level });

        where = this.parseLevelWhere({ where: where?.id || {}, mappedHierarchy, fields: AllFields, sysFields: SysFields });

        let sWhere = {};
        let hideWhere = {};
        if (!isNil(systemWhere) && level > 0) {
            const show = isVisible ? level - 1 : level;

            const { alias: previousViewName } = this.getHierarchyLevelField({ fields: AllFields, mappedHierarchy, level: show, attribute: 'name' });
            const { alias: viewName } = this.getHierarchyLevelField({ fields: AllFields, mappedHierarchy, level, attribute: 'name' });
            const { alias: aliasWhere } = this.getHierarchyLevelKeys({ fields: AllFields, mappedHierarchy, level: show });

            if (hideNestedIfEqual && level > 0) {
                hideWhere = { [previousViewName]: { $ne: `$"${alias}"."${viewName}"$` }, [viewName]: { $ne: `$"${alias}"."${previousViewName}"$` } };
            }

            sWhere = { [aliasWhere]: systemWhere };
        }

        const searchAttrs = new Set();

        this.getUsedAttributes(where || {}, searchAttrs);
        this.getUsedAttributes(sWhere || {}, searchAttrs);
        this.getUsedAttributes(hideWhere || {}, searchAttrs);
        this.getUsedAttributes(dictionaryWhere || {}, searchAttrs);

        /** @type {string[]} */
        const connectionAliases = connectionFields.map((i) => i.right.field);

        let attributes = [].concat(connectionAliases, Array.from(searchAttrs), options.attributes)

        attributes = attributes
            .filter(attr => !SysFields[attr])
            .map((attr) => AllFields[attr] ? this.getAttr(AllFields[attr]) : attr)
            .filter(Boolean);

        attributes = await Promise.all(attributes.map(async (attr) => {
            const { alias } = this.getHierarchyLevelField({ fields: AllFields, mappedHierarchy, level, attribute: attr });

            return alias || attr;
        }));

        const aliases = attributes.map((attr) => this.getAlias(attr));

        let sql = await connector.findSQL(from, {
            attributes: this.uniqueAttrs([idField, ...attributes]),
            group: [idAlias, ...connectionAliases, ...aliases]
        });

        const attrs = [
            [idAlias, '__id__'],
            ...connectionAliases,
        ];

        let localWhere = this.getAndWhere([where, sWhere, hideWhere, { [idAlias]: { $ne: null } }]);

        if (isBlocked) { localWhere = { [idAlias]: [] }; }

        sql = await connector.findSQL({ table: sql, alias }, { attributes: attrs, where: this.getAndWhere([localWhere, dictionaryWhere || {}]) });

        return { query: { table: sql, alias }, connectionFields };
    }

    /**
     * @private
     * 
     * @param {{ where: object, mappedHierarchy: Record<number, Hierarchy[]>, fields: Record<string, Field>, sysFields: Record<string, Field>, maxLevel: number }} param0 
     */
    generateDictWhere({ where, mappedHierarchy, fields, sysFields, maxLevel }) {
        if (Array.isArray(where)) {
            return where.map((where) => this.generateDictWhere({ where, mappedHierarchy, fields, sysFields, maxLevel }));
        }

        if (typeof where === 'object') {
            const res = {};

            const mapping = {};

            for (const attribute in where) {
                const { alias } = this.getHierarchyLevelField({ fields, mappedHierarchy, level: 0, attribute });

                if (alias && fields[attribute]) {
                    for (let level = 0; level < maxLevel; level++) {
                        const { alias } = this.getHierarchyLevelField({ fields, mappedHierarchy, level, attribute });

                        mapping[attribute] ||= [];
                        mapping[attribute].push({ [alias]: where[attribute] });
                    }

                    continue;
                }

                if (typeof where[attribute] === 'object' && !fields[attribute]) {
                    res[attribute] = this.generateDictWhere({ where: where[attribute], mappedHierarchy, fields, sysFields, maxLevel });

                    continue;
                }

                res[attribute] = where[attribute];
            }

            for (const key in mapping) {
                res.$and ||= [];
                res.$and.push({ $or: mapping[key] });
            }

            return res;
        }

        return where;
    }

    async plain({ connectionFields, fields: AllFields, options, connector, from }) {
        let table = /** @type {string} */(from.table || from);
        let alias = /** @type {string} */(from.alias || from);

        const connectionAliases = [.../** @type {IConnectionField[]} */(connectionFields).map(i => i.right?.field)];

        const attributes = [
            ...connectionAliases,
            ...Array.from(options.attributes)
        ].map(
            (field) => {
                const attr = this.getAlias(field);

                if (AllFields[attr]) {
                    return AllFields[attr]?.value
                        ? [AllFields[attr].value, AllFields[attr].field]
                        : AllFields[attr]?.field
                }

                return field;
            }
        ).filter(Boolean);

        const aliases = attributes.map(i => this.getAlias(i));

        table = await connector.findSQL(from, { attributes });
        table = await connector.findSQL({ table, alias }, { attributes: aliases, where: this.getAndWhere([options.where, dictionaryWhere || {}]), group: aliases });

        return { query: { table, alias }, connectionFields };
    }

    /**
     * @private
     * 
     * @param {Object} param0 
     * @param {Ifrom} param0.from 
     * @param {string[]} param0.recursiveAttrs 
     * @param {IConnector} param0.connector 
     * @param {IConnectionField[]} param0.connectionFields 
     * @param {string} param0.alias 
     * @param {object} param0.fields 
     * @param {object} param0.mappedHierarchy 
     * @param {number} param0.maxLevel 
     */
    async filter({ from, recursiveAttrs, connector, connectionFields, alias, fields, mappedHierarchy, maxLevel }) {
        const attributes = [];
        const pathAttr = [];

        /** @type {Record<string, MayBeArray<string>[]>} */
        const mapping = {};

        Array(maxLevel).fill(null).map((_, index) => {
            const { field, alias } = this.getHierarchyLevelKeys({ fields, mappedHierarchy, level: index + 1 });

            recursiveAttrs.forEach((attr) => {
                const { field } = this.getHierarchyLevelField({ fields, mappedHierarchy, level: index + 1, attribute: attr });

                if (field) {
                    attributes.push(field);
                    mapping[attr] ||= [];
                    mapping[attr][index] = field;
                }
            })

            attributes.push(field);

            pathAttr.push(alias);
        });

        const attrs = Object.entries(mapping)
            .map(
                ([key, value]) => {
                    const attrs = value.map((attr) => this.getAlias(attr));

                    return [connector.createArray(attrs.join(', ')), key];
                }
            );

        let sql = await connector.findSQL(from, { attributes });
        sql = await connector.findSQL(
            { table: sql, alias },
            {
                attributes: [
                    [connector.createArray(pathAttr.join(', ')), '_path'],
                    ...attrs
                ],
                group: ["_path", ...attrs.map(([_, attr]) => attr)]
            });

        return { query: { table: sql, alias }, connectionFields };
    }

    /**
     * @public
     * 
     * @param {string} id
     * @param {object} inputOptions
     */
    async read(id, inputOptions) {
        const options = structuredClone(inputOptions || {});

        let { level } = options;

        /** @type {[TreeObject, Partial<Metadata>]} */
        const [treeObject, item] = await Promise.all([this.tableInfo(this, id), this.getItem(id)]);

        const { SysFields, Fields, AllFields, Hierarchy } = treeObject;

        const mappedHierarchy = this.mappedHierarchy(Hierarchy);

        const isBlocked = !mappedHierarchy[level + 1]
            || !await this.isNextLevelAvaliable({ level, treeObject });

        if (isBlocked) { level -= 1; }

        const hierarchy = new HierarchyClass({ owner_id: item.id, parent: item });

        hierarchy.check(Hierarchy);

        const { table, filter } = this.getManifestSettings(item);

        await this.console(`Формируем плоскую иерархию по таблице ${table}`);

        const defaultOptions = this.getDefaultOptions(filter, options);

        const { connector } = await this.getConnector(item);

        if (typeof level !== 'number') { level = 0; }

        const { field: idField } = this.getHierarchyLevelKeys({ fields: AllFields, mappedHierarchy, level });

        const { field: parentField } = level <= 0
            ? { field: ["NULL", "parent"] }
            : this.getHierarchyLevelKeys({ fields: AllFields, mappedHierarchy, level: level - 1 });

        let { field: viewField } = this.getHierarchyLevelField({ fields: AllFields, mappedHierarchy, level, attribute: 'name' });
        if (!viewField) {
            viewField = ['NULL', 'name'];
        }

        const from = await this.generateEnvironment(item, connector, [defaultOptions.where, options.metaAccessWhere]);

        let attributes = options.attributes || [];
        if (!attributes.length) attributes = defaultAttrs;

        let sql = /** @type {string} */(from.table || from);
        let alias = /** @type {string} */(from.alias || from);

        let where = this.prepareWhere({ where: structuredClone(options.where || {}), mappedHierarchy, fields: AllFields, sysFields: SysFields });
        if (isBlocked) where = { $or: [] };

        const attrs = new Set();
        this.getUsedAttributes(where || {}, attrs);

        (defaultOptions.order || []).forEach(([key]) => SysFields[key] ? null : attrs.add(key));

        const allAttributes = [];
        for (const attr of uniqueValues([...Array.from(attrs), ...attributes])) {
            const { field } = this.getHierarchyLevelField({ fields: AllFields, mappedHierarchy, level, attribute: attr });

            if (field) {
                allAttributes.push([this.getFizField(field), attr]);
                continue;
            }

            if (AllFields[attr]) {
                allAttributes.push(this.getAttr(AllFields[attr]));
                continue;
            }

            allAttributes.push(attr);
        }

        const aliases = allAttributes.map((attr) => this.getAlias(attr));

        let searchAttrs = this.uniqueAttrs([
            ...allAttributes,
            [this.getFizField(idField), 'id'],
            [this.getFizField(viewField), 'name'],
            [this.getFizField(parentField), 'parent'],
        ]);

        sql = await connector.findSQL(
            from,
            { attributes: searchAttrs }
        );

        sql = await connector.findSQL(
            { table: sql, alias },
            { attributes: this.getAliases(searchAttrs), group: this.getAliases(searchAttrs) }
        );

        searchAttrs = this.uniqueAttrs([...aliases, ['name', '__view__'], ['id', '__value__']]);

        const order = defaultOptions.order || [];

        const rows = await connector.findAll(
            { table: sql, alias },
            { attributes: searchAttrs, group: this.getFizFields(searchAttrs), where, order }
        );

        const cols = [...Object.values(SysFields), ...Object.values(Fields)];

        /** @type {object} */
        const refsForLoad = {};
        options.attributes.forEach((field) => {
            if (treeObject.Refs[field]) {
                refsForLoad[field] = treeObject.Refs[field];
            }
        });

        const refs = !options.withOutRefs ? await Refs.getAllRefs(refsForLoad, rows) : {};

        return {
            rows,
            cols,
            refs,
            count: -1,
            offset: options.offset ?? 0,
            limit: options.limit ?? 0,
            options: inputOptions,
            hierarchy: {
                on: true,
                parentFilter: { '$eq': null },
                parentField: SysFields.parent,
                codeField: SysFields.id,
            },
            metadata: { ...item, treeObject },
        };
    }

    /**
     * @private
     * 
     * @param {object} param0
     * @param {object} param0.where
     * @param {Record<number, Hierarchy[]>} param0.mappedHierarchy
     * @param {Record<string, Field>} param0.fields
     * @param {Record<string, Field>} param0.sysFields
     * @returns 
     */
    prepareWhere({ where, mappedHierarchy, fields, sysFields }) {
        where = where || {};
        where = this.renameTechAttrs(where);
        where = this.reshufleWhere({ where, fields });
        where = this.parseLevelWhere({ where, mappedHierarchy, fields, sysFields });

        WhereFormater.removeEmptyWhere(where);

        return where;
    }

    /**
     * @private
     * @param {object} item 
     * @returns {{ table: string, filter: string, hideNestedIfEqual: boolean }}
     */
    getManifestSettings(item) {
        const { table, filter, onoff, blockMessage = '', hideNestedIfEqual } = item.manifest.settings;
        if (onoff && !httpContext.get('cube-cache-preload')) {
            throw ApiError.ResourseBlocked(blockMessage || `Таблица ${table} заблокирована для запросов ${item?.name}`);
        }
        return { table, filter, hideNestedIfEqual }
    }

    /**
     * @private
     * 
     * TODO придумать описание
     * 
     * @param {Object} param0 
     * @param {object} param0.where 
     * @param {Record<number, Hierarchy[]>} param0.mappedHierarchy 
     * @param {Record<string, Field>} param0.fields 
     * @param {Record<string, Field>} param0.sysFields 
     * 
     * @returns 
     */
    parseLevelWhere({ where, mappedHierarchy, fields, sysFields }) {
        if (Array.isArray(where)) return where.map(where => this.parseLevelWhere({ where, mappedHierarchy, fields, sysFields }));

        if (where && typeof where === 'object') {
            let res = {};

            for (const key in sysFields) {
                if (typeof where[key]?.__level__ === 'number') {
                    where = where[key];
                }
            }

            if (typeof where.__level__ === 'number') {
                const { alias } = this.getHierarchyLevelKeys({ fields, mappedHierarchy, level: where.__level__ });

                res[alias] = where;

                delete where.__level__;

                return res;
            }

            if ((hop(where, '$eq') || hop(where, '$ne')) && !hop(where, '__level__')) {
                delete where.$eq;
                delete where.$ne;
            }

            for (const key in where) {
                res[key] = this.parseLevelWhere({ where: where[key], mappedHierarchy, fields, sysFields });
            }

            return res;
        }

        return where;
    }

    /**
     * @private
     * 
     * вытащить из ключей поле которое будет использоваться в качестве id на текущем уровне
     * 
     * @param {{ fields: object, mappedHierarchy: Record<number, Hierarchy[]>, level: number }} param0 
     */
    getHierarchyLevelKeys({ fields, mappedHierarchy, level }) {
        const [displayLevel] = mappedHierarchy[level + 1];

        const [idField] = Object.values(displayLevel.Keys.fields).map((i) => i.value);

        const { value: idFieldValue } = ref_extract(idField);

        const mapedFields = arrToMap(Object.values(fields), 'id');

        const idMeta = mapedFields[idFieldValue];

        const field = this.getAttr(idMeta);

        const alias = this.getAlias(field);

        return { field, alias };
    }

    /**
     * @private
     * 
     * вытащить из иерархии поле представления которое будет использоваться в качестве attribute на текущем уровне
     * 
     * @param {{ fields: object, mappedHierarchy: Record<number, Hierarchy[]>, level: number, attribute: string }} param0 
     * @returns 
     */
    getHierarchyLevelField({ fields, mappedHierarchy, level, attribute }) {
        const [displayLevel] = mappedHierarchy[level + 1];

        if (!displayLevel) return {};

        const displayField = displayLevel.fields.find(item => item.alias.name === attribute);

        if (!displayField) return {};

        const { value: idFieldValue } = ref_extract(displayField.alias.manifest.settings.ref)

        const mapedFields = arrToMap(Object.values(fields), 'id');

        const idMeta = mapedFields[idFieldValue];

        const field = this.getAttr(idMeta);

        const alias = this.getAlias(field);

        return { field: field || ['NULL', alias], alias };
    }

    /**
     * @private
     * 
     * вытаскивает из меты поля его данные в формате в котором его сможет прочитать ORM
     * 
     * @param {Field} param0 
     * @returns 
     */
    getAttr({ field, value }) {
        return value ? [value, field] : field;
    }

    mappedHierarchy(hierarchy) {
        const hierarchyArr = Object.values(hierarchy)
            .sort((a, b) => a?.settings?.level - b?.settings?.level)
            .map((item, i) => {
                item.level = i + 1;
                return item;
            });

        return arrToMapArr(hierarchyArr, 'level');
    }

    /**
     * Логгер (перегружается внешними модулями)
     *
     * @private
     * 
     * @param {object} meta
     * @param {string} msg
     * @returns {Promise<void>}
     */
    async console(msg, meta) { /** SREDA-overload */ }

    /**
     * @private
     * 
     * TODO придумать описание
     * 
     * @param {{ where: object, fields: object }} param0 
     * @returns 
     */
    reshufleWhere({ where, fields }) {
        if (Array.isArray(where)) return where.map(where => this.reshufleWhere({ where, fields }));

        if (where && typeof where === 'object') {
            let res = {};

            for (const key in where) {
                if (fields[key]) {
                    if (where[key]?.$or) {
                        res.$or ||= [];
                        res.$or.push(...where[key].$or);
                    }
                    if (where[key]?.$and) {
                        res.$and ||= [];
                        res.$and.push(...where[key].$and);
                    }

                    if (key === 'parent' && where[key] && !where[key]?.$and && !where[key]?.$or) {
                        res[key] = where[key];
                    }

                    if (key === 'id' && where[key] && !where[key]?.$and && !where[key]?.$or) {
                        res[key] = where[key];
                    }

                    delete where[key];
                }

                if (!isNil(where[key])) {
                    res[key] = this.reshufleWhere({ where: where[key], fields });
                }
            }

            return res;
        }

        return where;
    }

    /**
     * @private
     * 
     * технический метод который переименовывает __view__ поля на name
     * 
     * @param {object} where 
     * @returns 
     */
    renameTechAttrs(where) {
        if (Array.isArray(where)) return where.map(i => this.renameTechAttrs(i));

        if (where && typeof where === 'object') {
            const res = {};

            for (const key in where) {
                res[key] = where[key];

                if (key === '__view__') {
                    res['name'] = structuredClone(where[key]);
                    delete res[key];
                }

                if (typeof where[key] === 'object') {
                    where[key] = this.renameTechAttrs(where[key]);
                }
            }

            return res;
        }

        return where;
    }

    /**
     * @private
     * 
     * находит все использованые поля в объекте запроса
     * 
     * @param {object} where 
     * @param {Set<string>} [result]
     */
    getUsedAttributes(where, result = new Set()) {
        if (Array.isArray(where)) return where.map(i => this.getUsedAttributes(i, result));

        if (where && typeof where === 'object') {
            for (const key in where) {
                if (!defaultAttrs.includes(key) && key[0] !== '$') {
                    result.add(key);
                }

                if (where[key] && typeof where[key] === 'object') {
                    this.getUsedAttributes(where[key], result);
                }
            }
        }

        return result;
    }

    /**
     * @public
     * 
     * получить коннектор
     * @param {any} item
     * 
     * @returns {Promise<{ connector: IConnector, connectorData: object }>}
     */
    async getConnector(item) {
        let connectorId = item.manifest.settings.connector;
        connectorId = typeof connectorId === 'object' ? connectorId.value : connectorId;

        const Connector = new ConnectorClass();
        const { connector, connectorData } = await Connector.getConnector(connectorId);

        return { connector, connectorData };
    }

    /**
     * получить изначальный скоуп данных для таблицы
     *
     * @private
     * 
     * @param {*} item
     * @param {*} connector
     * @param {object[]} options
     * @returns {Promise<Ifrom>}
     */
    async generateEnvironment(item, connector, options) {
        const { table, sqlalias } = item.manifest.settings;

        /** @type {Ifrom} */
        let from = table;
        if (sqlalias && sqlalias.trim() !== '') {
            from = { table: sqlalias, alias: table, };
        }

        const where = { ['$and']: options.filter((i) => i && !isEmptyObject(i || {})) };

        if (where.$and?.length) {
            const SQL = await connector.findSQL(from, { where, attributes: ['*'] });
            from = { table: SQL, alias: /** @type {string} */(from?.alias || from), };
        }

        return from;
    }

    /**
     * @public
     * 
     * проверяем можем ли мы отобразить следующий уровень
     * 
     * @param {*} param0 
     * @returns 
     */
    async isNextLevelAvaliable({ level, treeObject }) {
        const values = Object.values(treeObject.Hierarchy || {}).filter((h) => h?.isMaxVisibleLevel);
        const value = Math.min(...values.map((h) => h?.settings?.level));

        return !level || !value || level < value;
    }

    /**
     * @private
     * 
     * парсим строку стандартной сортировки
     * убирает сортировку если нужно
     * 
     * @param {string | null} filter
     * @param {object} options 
     */
    getDefaultOptions(filter, options) {
        const defaultOptions = this.toJSON(filter) || {};
        // ========================  обработка сортировок  ===================================
        if (options?.withOutOrder) {
            delete defaultOptions.order;
        }
        // ========================  обработка сортировок  ===================================

        return defaultOptions;
    }

    /**
     * @private
     * 
     * принимает массив объектов
     * фильтрует только те которые не пустые
     * возвращает { ['$and']: [] } с масивом не пустых объектов
     * если таких нет вернет пустой массив
     * 
     * @param {object[]} arr 
     */
    getAndWhere(arr) {
        const where = { $and: arr.filter(i => !isEmptyObject(i)) };

        return where.$and.length ? where : {};
    }
}

module.exports = InfoServiceMatrixGuidClass;
