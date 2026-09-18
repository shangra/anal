const ApiError = require('../../../../../../core/exceptions/ApiError');
const { isEmptyObject } = require('../../../../../utils/services');

/**
 * @typedef {import("../../../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../../../../../../db/rls/types/WhereOptions.d.ts").WhereOptions} WhereOptions
 * @typedef {import("../behaviour/types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../behaviour/types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../behaviour/types/index").IBehaviourOptions} IBehaviourOptions
 */

/**
 * класс доп функций
 *
 * @class DefaultClass
 * @implements {IQueryBuilerBehavior}
 */
class DefaultClass {
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
     * Формирование первичных атрибутов
     *
     * @public
     *
     * @param {object} options
     * @param {string | object} key
     * @param {string} [viewName]
     * @returns {Promise<IBehaviourOptions>}
     */
    async getSubQuery(options, key, viewName) {
        throw new Error('NOT IMPLEMENTED');
    }

    /**
     * @param {{
     *    refItem: object,
     *    meta: LeveClassI,
     *    table: string,
     *    field: string | object,
     *    delimeter: string
     * }} param0
     */
    constructor({ refItem, meta, table, field, delimeter }) {
        this.refItem = refItem;
        this.meta = meta;
        this.table = table;
        this.field = field;
        this.delimeter = delimeter;
        this.id =
            typeof this.refItem?.ref === 'object' ? this.refItem.ref.value : this.refItem?.ref;
        /**
         * флаг который говорит что нужно расчитывать как иерархию
         */
        this.isHierarchy = !!this.refItem?.subtotal || !!this.refItem?.hierarchy;
    }

    NOT = '$not';
    EQUAL = '$eq';
    NOT_EQUAL = '$ne';

    /**
     * @protected
     *
     * @param {*} where
     * @param {string} attribute
     * @returns
     */
    getNeWhere(where, attribute) {
        const search = {};

        for (const prefix in where[attribute] ?? {}) {
            if (!Array.isArray(where[attribute][prefix])) continue;
            const arr = where[attribute][prefix].filter(
                (cond) => cond?.[this.NOT_EQUAL] !== undefined
            );
            if (arr.length) {
                search[prefix] = arr;
            }
        }

        return isEmptyObject(search) ? search : { [attribute]: search };
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
                where[key] = where[key].map((i) => this.sanitizeWhere(i));
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
     * @param {{ index: string[], columns: string[] }} settings
     * @param {string} attribute
     * @param {string} viewAlias
     * @returns
     */
    isVisible(settings, attribute, viewAlias) {
        return (
            settings?.index?.includes(attribute) ||
            settings?.index?.includes(viewAlias) ||
            settings?.columns?.includes(attribute) ||
            settings?.columns?.includes(viewAlias)
        );
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
        let level = typeof lvl !== 'number' ? 0 : lvl + 1;

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
            };
        }

        return null;
    }
}

module.exports = DefaultClass;
