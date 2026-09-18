const ApiError = require("../../../../core/exceptions/ApiError");
const { isEmptyObject, isNil } = require("../../../utils/services");

const WhereFormaterService = require("../../../meta-where-formatter");

const WhereFormater = new WhereFormaterService();

/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../types/index").IOptionSettings} IOptionSettings
 */

/**
 * класс доп функций
 * @abstract
 * 
 * @class DefaultClass
 * @implements {IQueryBuilerBehavior}
 */
class DefaultBehaviorClass {

    /**
     * @public
     * 
     * @param {IBehaviourQueryOptions} options
     * @param {string} attribute 
     * @param {string} [viewName]
     * @returns {Promise<IBehaviourOptions>}
     */
    async query(options, attribute, viewName) {
        throw new Error('NOT IMPLEMENTED');
    }

    /**
     * @param {{
     *    connector?: IConnector,
     *    meta: LeveClassI,
     *    table: string,
     *    field: string | object,
     *    delimeter: string
     *    logger: { console(msg: string, meta: any): Promise<void> }
     *    treeObject: object
     * }} param0 
     */
    constructor({ connector, meta, table, field, delimeter, logger, treeObject }) {
        this.meta = meta;
        this.table = table;
        this.field = field;
        this.delimeter = delimeter;
        this.id = typeof this.field?.ref === 'object' ? this.field.ref.value : this.field?.ref;
        this.connector = connector;
        this.treeFields = treeObject?.AllFieldsGUID || treeObject?.FieldsGUID;
        /**
         * флаг который говорит что нужно расчитывать как иерархию
         */
        this.isHierarchy = !!this.field?.subtotal || !!this.field?.hierarchy;

        this.logger = logger;
    }

    NOT = '$not';
    EQUAL = '$eq';
    NOT_EQUAL = '$ne';

    /**
     * @public
     * 
     * @param {{ guideConnector?: IConnector, viewName?: string }} param0 
     * @returns {Promise<boolean>}
     */
    async isValid({ }) {
        throw new Error('NOT IMPLEMENTED');
    }

    /**
     * @protected
     * 
     * @param {*} where 
     * @param {string} attribute 
     * @returns 
     */
    getNeWhere(where, attribute) {
        const search = {};

        for (const prefix in where?.[attribute] ?? {}) {
            const res = this.getNeWhereRecursive(where[attribute][prefix] || {}).flat(Infinity);

            if (res?.length) {
                search[prefix] = res;
            }
        }

        return isEmptyObject(search) ? search : { [attribute]: search };
    }

    /**
     * @private
     */
    getNeWhereRecursive(where) {
        if (Array.isArray(where)) {
            return where.map((item) => this.getNeWhereRecursive(item));
        }

        if (typeof where === 'object') {
            const res = [];
            for (const key in where) {
                const value = where[key];

                if (key === this.NOT_EQUAL) {
                    res.push({ [key]: value });
                }

                if (typeof value === 'object') {
                    res.push(this.getNeWhereRecursive(value));
                }
            }

            return res;
        }

        return [];
    }

    /**
     * очистить where от $eq услоавий заменив их просто на значения
     * 
     * @protected
     * 
     * @param {*} where 
     * @returns 
     */
    sanitizeWhere(where) {
        if (where[this.EQUAL] !== undefined) return where[this.EQUAL];

        for (const key in where) {
            if (Array.isArray(where[key])) {
                where[key] = where[key].map(i => this.sanitizeWhere(i));
            } else if (where[key] && typeof where[key] === 'object') {
                where[key] = this.sanitizeWhere(where[key]);
            }
        }

        return where;
    }

    /**
     * @protected
     * 
     * флаг сообщающий что текущий расчет идет относительно измерения которое будет отображаться в UI
     * 
     * @param {IOptionSettings} settings 
     * @param {string} attribute 
     * @returns 
     */
    isVisible(settings, attribute) {
        return settings?.viewIndex?.includes(attribute)
            || settings?.viewColumns?.includes(attribute);
    }

    /**
     * @protected
     * 
     * @param {*} where 
     * @param {*} attribute 
     * @returns 
     */
    getSystemParent(where, attribute) {
        let val = where?.[attribute]?.__parent__ ?? where?.[attribute];
        if (!isNil(val) && !Array.isArray(val)) {
            val = {
                __parent__: val,
                __level__: where?.[attribute]?.__level__
            }
        }

        return val;
    }

    /**
     * @protected
     * 
     * @param {*} where 
     * @param {*} attribute 
     * @returns 
     */
    getFilter(where, attribute) {
        return where?.[attribute]?.__parent__ ?? where?.[attribute];
    }

    /**
     * @protected
     * 
     * @param {{ where: object, systemWhere: object, attribute: string, isVisible?: boolean }} param 
     * @returns {number}
     */
    getLvl({ where, systemWhere, attribute, isVisible }) {
        const lvl = where?.[attribute]?.__level__ ?? systemWhere?.[attribute]?.__level__;
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

    /**
     * @param {{ level: number, treeObject: object, attribute: string }} param0 
     * 
     * @returns {Promise<IBehaviourOptions>}
     */
    async isValidForQuery({ level, treeObject, attribute }) {
        const res = await this.meta.isNextLevelAvaliable({ level, treeObject });

        if (!res) {
            const lvl = [{ where: { [attribute]: [] } }];
            return {
                before: lvl,
                current: lvl,
                after: lvl,
            }
        }

        return null;
    }

    /**
     * @protected
     * 
     * находим основной фильтра без $ne условий
     * 
     * @param {*} where 
     * @param {string} attribute 
     * @returns 
     */
    getFilterWithoutNe(where, attribute) {
        const rawWhere = this.getFilter(where, attribute);

        const searchWhere = typeof rawWhere === 'object' && rawWhere ? structuredClone(rawWhere) : rawWhere || {};

        if (searchWhere && typeof searchWhere === 'object' && !Array.isArray(searchWhere)) {
            for (const key in searchWhere) {
                searchWhere[key] = searchWhere[key].filter((i) => i?.['$ne'] !== undefined ? null : i)
                if (!searchWhere[key]?.length) {
                    delete searchWhere[key];
                }
            }
        }

        return searchWhere || {};
    }

    /**
     * удалить все свойства __level__ из объекте
     */
    removeLevels(where) {
        return WhereFormater.removeLevel(where);
    }


    getAllProperties(where) {
        let lWhere = structuredClone(where || {});
        lWhere = this.removeLevels(lWhere);
        return WhereFormaterService.getAllProperties(lWhere);
    }
}

module.exports = DefaultBehaviorClass;