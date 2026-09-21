/**
 * @typedef {import('sequelize').WhereOptions} WhereOptions
 * @typedef {import('../../select/types').ISettings} ISettings
 * @typedef {import('../../../../core/db/types').TField} TField
 * @typedef {import('../../../../core/db/types').TAggField} TAggField
 * @typedef {import('../../../metadata-cmp/services/Metadata.service').IRef} IRef
 * @typedef {import('../../../metadata-cmp/services/Metadata.service')} MetadataService
 * @typedef {import('../../../metadata-cmp/services/Metadata.service').LevelClassI} LevelClassI
 * @typedef {import("../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 */

/**
 * @typedef AccountConfigI
 * @property {string} id
 * @property {string} parent
 * @property {string} agg_func
 * @property {string} name
 * @property {string} tilda
 */

const ApiError = require('../../../../core/exceptions/ApiError');

const { isEmptyObject, isNil } = require('../../../utils/services');

const accountAttributes = ['id', 'parent', 'name', 'agg_func', 'tilda'];

const ALLOWED_AGG_FUNS = {
    sum: true,
    count: true,
    avg: true,
    min: true,
    max: true,
    first_value: true,
    last_value: true,
    nonagg: true
}

const AGGREGATE_PREFIX = ':->:';
// TODO refactoring
class AccountClass {
    /**
     * @param {{ meta: MetadataService, logger: any }} param0 
     */
    constructor({ meta, logger }) {
        this.meta = meta;
        this.logger = logger;
    }

    /**
     * @public
     * 
     * @param {{ id: string, options: ISettings, treeObject: object, metaClass: MetadataService }} param0 
     * @returns {Promise<{ union: boolean, mappedOptions:object[] }>}
     */
    async matrix({ options, treeObject }) {
        const { attributes, attributesForDel, systemWhere, where } = options;

        const { accountDimension } = options?.settings || {};

        const check =
            !accountDimension
            || (
                !this.isValid(attributes, attributesForDel, accountDimension)
                && !this.getParent(systemWhere, accountDimension.field)
                && !this.getParent(where, accountDimension.field)
                && this.isAccountFn(attributes)
            )
            || !this.isAccountFn(attributes);

        /**
         * если измерение показателей не переданно отобразим нули
         */
        if (check) {
            return this.setDefault(options);
        }

        const refItem = this.checkAccountField({ attributes, accountDimension, fields: treeObject.Fields });

        const attribute = refItem.field;

        const meta = refItem?.ref
            ? await this.meta.getInstance(refItem?.ref, {})
            : null;

        if (!meta) {
            throw ApiError.BadRequest('Не указан cправочник для агрегации Показателей');
        }

        const isVisible = sreda.env.OLD_ACCOUNT === true
            ? options.attributesForDel.includes(accountDimension.field)
            : [...options.settings.index || [], ...options.settings.columns || []].includes(accountDimension.field);

        /**
         * флаг который говорит что нужно проверить количество элементов которое используется для построения среза
         * если их больше 1го то нужно все показатели обнулить
         */
        let chackLength = false;

        let systemParent = this.getParent(systemWhere, attribute);
        if (isVisible) {
            if (!isEmptyObject(where[attribute] || {}) && isEmptyObject(systemWhere[attribute] || {})) {
                systemParent = this.getParent(where, attribute);

                chackLength = true;
            }
        }

        const level = this.getLvl({ lvl: systemWhere[attribute]?.__level__, isVisible });

        const { rows: items, neRowIds } = await this.getItems({ ref: refItem?.ref, systemParent, where: where[attribute], isVisible, level });

        if (!items?.length || (chackLength && items.length > 1)) {
            return this.setDefault(options);
        }

        const mapping = this.groupByAggField(items);

        const mappedOptions = [];

        for (const key in mapping) {
            const value = mapping[key];

            const [first] = value;

            if (!first.agg_func) continue;

            const localOptions = structuredClone(options);

            const where = { ['$and']: [] };

            where.$and.push({ ['$or']: value.map((i) => ({ $eq: i.id, __level__: level })) });

            if (neRowIds.length) {
                where['$and'].push({ ['$and']: neRowIds.map((i) => ({ ['$ne']: i.__child__, __level__: i.__level__ })) });
            }

            if (!isEmptyObject(localOptions.where?.[attribute] || {})) {
                const userWhere = localOptions.where[attribute];

                where.$and ||= [];
                userWhere.$or && where.$and.push({ ['$or']: userWhere.$or });

                where.$and ||= [];
                userWhere.$and && where.$and.push({ ['$and']: userWhere.$and });

                where.$and ||= [];
                !userWhere.$or && !userWhere.$and && where.$and.push(userWhere);
            }

            localOptions.where = { ...(localOptions.where || {}), [attribute]: where };

            localOptions.attributes = localOptions.attributes.map((/** @type {TAggField} */attr) => {
                if (attr?.func === 'ACCOUNT') {
                    const arr = /** @type {TAggField} */ (attr).alias.split(AGGREGATE_PREFIX);

                    arr.splice(-1, 1, 'ACCOUNT')

                    return {
                        ...attr,
                        field: attr.field,
                        func: first.agg_func,
                        alias: arr.join(AGGREGATE_PREFIX)
                    };
                }

                return attr;
            });

            mappedOptions.push(localOptions);
        }

        return { union: true, mappedOptions };
    }

    setDefault(options) {
        options.attributes = options.attributes.map((/** @type {TAggField} */attr) => {
            if (attr?.func === 'ACCOUNT') {
                return {
                    field: attr.field,
                    func: 'NONAGG',
                    alias: attr.alias
                }
            }

            return attr;
        });

        return { union: false, mappedOptions: [options] };
    }

    /**
     * @private
     * 
     * @param {{ ref: IRef, systemParent: object, where: object, isVisible: boolean, level: number }} param0 
     * @returns 
     */
    async getItems({ ref, systemParent, where, isVisible, level }) {
        const meta = await this.meta.getInstance(ref, {});
        if (!meta) {
            throw ApiError.BadRequest('Не указано поле агрегации Показателей');
        }

        const idGuide = /** @type {object} */(ref).value;
        if (!idGuide) {
            throw ApiError.BadRequest('Не указанна ссылка для связи со справочником Показателей');
        }

        const [item, treeObject] = await Promise.all([meta.getItem(idGuide), meta.tableInfo(meta, idGuide)]);

        const { pkName, viewField, parentName, parentFilter } = this.getRefConfig(treeObject, item);
        const { connector } = await meta.getConnector(item);

        const swhere = isVisible ? systemParent ?? parentFilter : where ?? parentFilter;

        const rows = await this.getEqIds({ where: swhere, idGuide, meta, isVisible, level });

        if (!rows?.length) return {};

        const ids = rows.map((i) => i.id);

        await this.logger.console(`Найденны id записей по которым будем строить агрегацию`, { query: ids.join(', ') });

        const neRowIds = await this.getNeEqIds({
            connector,
            pkName,
            level,
            idGuide,
            meta,
            ids,
        });

        await this.logger.console(`Найденны id записей которые нужно исключить из расчета агрегации Показателей`, { query: neRowIds.join(', ') });

        const neIds = neRowIds.filter(({ __child__ }) => !ids.includes(__child__));

        return {
            rows,
            pkName,
            viewField,
            parentFilter,
            neRowIds: neIds
        }
    }

    /**
     * @private
     * 
     * @param {{ where: object, meta: LeveClassI, idGuide: string, isVisible: boolean, level: number }} param0 
     * @returns {Promise<{ id: string, parent: string, name: string, agg_func: string, tilda: string }[]>}
     */
    async getEqIds({ where, meta, idGuide, isVisible, level }) {
        const searchWhere = isVisible ? { parent: where } : { id: where };

        const { rows } = await meta.read(
            idGuide,
            {
                attributes: accountAttributes,
                where: searchWhere,
                hierarchy: isVisible,
                withOutCount: true,
                withOutOrder: true,
                withOutRefs: true,
                level
            }
        );

        if (!isVisible && rows.length > 1) return [];

        return rows;
    }

    /**
     * @param {Object} param0 
     * @param {string} param0.idGuide 
     * @param {LevelClassI} param0.meta 
     * @param {IConnector} param0.connector 
     * @param {string} param0.pkName 
     * @param {string[]} param0.ids 
     * @param {number} param0.level 
     * @returns {Promise<{ __child__: string, __level__: number }[]>}
     */
    async getNeEqIds({ idGuide, meta, connector, pkName, ids, level }) {
        const { query } = await meta.query(
            idGuide,
            {
                attributes: accountAttributes,
                recursiveAttrs: accountAttributes,
                withOutCount: true,
                withOutOrder: true,
                withOutRefs: true,
                hierarchy: false,
                isFilter: true,
                isRecursion: true,
            }
        );

        const items = await connector.findAll(
            { table: `${query.table};`, alias: 'temp' },
            {
                attributes: [
                    [connector.getLastNonEmptyElemntOfArray("_path"), '__child__'],
                    [connector.getFieldLength(`$${connector.filterArray("_path")}$`), '__level__'],
                ],
                where: { [`$'~'$`]: { $any: '$tilda$' } }
            });

        return items.map(({ __level__, __child__ }) => ({ __child__, __level__ }));
    }

    /**
     * @private
     * 
     * @param {AccountConfigI[]} items 
     * @returns {Record<string, AccountConfigI[]>}
     */
    groupByAggField(items) {
        let lItems = /** @type {AccountConfigI[]} */(items.map(item => accountAttributes.reduce((acc, i) => { acc[i] = item[i]; return acc; }, {})));

        lItems = lItems.filter((item) => item.id != null);

        /** @type {Record<string, AccountConfigI[]>} */
        const mapping = lItems.reduce((acc, item) => {
            if (!ALLOWED_AGG_FUNS[item.agg_func?.toLowerCase()]) {
                throw ApiError.BadRequest(`указан недопустимая функция агрегации для записи ${JSON.stringify(item)}`);
            }
            acc[item.agg_func] ||= [];
            acc[item.agg_func].push(item);

            return acc;
        }, {});

        return mapping;
    }

    /**
     * @protected
     * 
     * @param {{ attributes: TField[], accountDimension: { field: string }, fields: Record<string, object> }} param0 
     * @returns 
     */
    checkAccountField({
        attributes,
        accountDimension,
        fields
    }) {
        const field = /** @type {string} */(attributes.find((item) => accountDimension.field === item));
        if (!field) {
            throw ApiError.BadRequest('В срезе не переданно поле агрегации Показателей');
        }

        const refItem = fields[accountDimension.field];
        if (!refItem) {
            throw ApiError.BadRequest('Не указано поле агрегации Показателей');
        }

        return refItem;
    }

    /**
     * 
     * @param {TField[]} attributes 
     */
    isAccountFn(attributes) {
        return attributes.some((/** @type {TAggField} */attr) => attr.func === 'ACCOUNT');
    }

    getParent(where, attribute) {
        return where[attribute]?.__parent__ ?? where[attribute] ?? null;
    }

    /**
     * получить данные по pk parentKey и дефолтному фильтру из дерева метаданных
     * 
     * @private
     * 
     * @param {*} treeObject 
     * @param {*} item 
     * @returns {{ viewField: string, pkName: string, parentName: string, parentFilter: WhereOptions | { $eq: string } }}
     */
    getRefConfig(treeObject, item) {
        const { fieldhierarchy, fieldhierarchydefault } = item?.manifest?.settings || {};

        const { field: pkName, key } = this.getPK(treeObject.Keys) || { field: 'id', key: 'id' };
        const parentName = this.getParenPk(treeObject, fieldhierarchy);
        const value = treeObject.Keys[key]?.settings?.fieldview;
        const viewField = treeObject.FieldsGUID[value?.value || value]?.field;

        /** @type {WhereOptions} */
        const parentFilter = !isNil(fieldhierarchydefault)
            ? { $eq: fieldhierarchydefault }
            : { $is: null };

        return {
            pkName,
            viewField,
            parentName,
            parentFilter
        };
    }

    /**
     * @private
     * 
     * @param {Record<string, { settings: { primarykey: boolean }, fields: object }>} keys 
     * @returns {{ field: string, key: string }}
     */
    getPK(keys) {
        /** @type {string} */
        let field = null;
        let pKey = null;
        Object.keys(keys || {}).forEach((key) => {
            if (keys[key].settings?.primarykey) {
                field = Object.keys(keys[key].fields ?? {})[0];
                pKey = key;
            }
        });

        return { field, key: pKey };
    }

    /**
     * парсинг parent Key из дерева метаданных
     * 
     * @private
     * 
     * @param {*} treeObject 
     * @param {string | { value: string }} defVal 
     * @returns 
     */
    getParenPk(treeObject, defVal) {
        let parentName = 'parent';

        if (defVal) {
            const fieldHierarchy = typeof defVal === 'object' ? defVal.value : defVal;

            parentName = treeObject?.AllFieldsGUID?.[fieldHierarchy]?.field || treeObject.FieldsGUID?.[fieldHierarchy]?.field; // TODO не поддерживает составные ключи
        }

        return parentName;
    }

    /**
     * проверяем есть ли агрегативное поле ACCOUNT в атрибутах среза и есть ли функция агрегации ACCOUNT
     * 
     * @private
     * 
     * @param {TField[]} attributes 
     * @param {TField[]} attributesForDel
     * @param {*} accountDimension 
     */
    isValid(attributes, attributesForDel, accountDimension) {
        return attributes.some(attr => accountDimension.field === attr)
            && !attributesForDel.some((attr) => accountDimension.field === attr)
            && attributes.some(attr => /** @type {TAggField} */(attr).func === 'ACCOUNT');
    }

    /**
     * @private
     * 
     * @param {{ lvl: number, isVisible?: boolean }} param 
     * @returns {number}
     */
    getLvl({ lvl, isVisible }) {
        let level = typeof lvl !== 'number'
            ? 0
            : lvl + 1;

        if (level < 0) {
            throw ApiError.BadRequest(`Передан отрицательный уровень раскрытия иерархии`);
        }

        if (!isVisible) {
            level -= 1;
            level = level > 0 ? level : 0;
        }

        return level;
    }
}

module.exports = AccountClass;
