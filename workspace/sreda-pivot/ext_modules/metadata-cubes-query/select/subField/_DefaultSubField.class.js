const DefaultClass = require("../_default/Default.class");

const ApiError = require("../../../../core/exceptions/ApiError");
const WhereFormaterService = require("../../../meta-where-formatter");
const WhereFormater = new WhereFormaterService();

/**
 * @typedef {import("../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 */

/**
 * @abstract
 */
class DefaultSubFieldClass extends DefaultClass {
    /**
    * @param {{
    *    meta: LeveClassI,
    *    field: string | object,
    *    table: string
    * }} param0 
    */
    constructor({ meta, field, table }) {
        super();

        this.field = field;
        this.table = table;
        this.meta = meta;

        this.id = typeof this.field?.ref === 'object' ? this.field.ref.value : this.field?.ref;

        /**
         * флаг который говорит что нужно расчитывать как иерархию
         */
        this.isHierarchy = !!this.field?.subtotal || !!this.field?.hierarchy;
    }

    delimeter = '/';


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
     * @protected
     * 
     * @param {object} where 
     * 
     * удалить все свойства __level__ из объекте
     */
    removeLevels(where) {
        return WhereFormater.removeLevel(where);
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
}

module.exports = DefaultSubFieldClass;