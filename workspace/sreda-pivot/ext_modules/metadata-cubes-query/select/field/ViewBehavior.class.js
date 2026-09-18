const ViewSubFieldClass = require("../subField/ViewSubField.class");

/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../types/index").ILevel} ILevel
 */

/**
 * TODO: подчистить класс - очень много лишней логики и дублирующегося кода
 * + проблемы с логикой - принят максимально простой подход из за которого в выборки попадает большое количество лишних данных
 * + усложняется парс для финального конверта в формат орм
 */

/**
 * Поведение реализованое через представление
 */
class ViewBehaviorClass extends ViewSubFieldClass {
    constructor({ meta, connector, table, field, delimeter, logger, treeObject }) {
        super({ connector, meta, table, field, delimeter, logger, treeObject });
        /** @type {IConnector} */
        this.connector = connector;
    }

    /**
     * @public
     * 
     * @param {{ guideConnector?: IConnector, viewName?: string }} param0 
     * @returns {Promise<boolean>}
     */
    async isValid({ }) {
        // проверим что выбрат тип соединения
        const isView = this.field.SQLQueryFormat === 'useView';
        // if (!isView || !this.isHierarchy) return false;

        // проверим что выбрат есть на чем строить это соединение
        this.maxLevel = await this.getLevelsForAttribute(this.table, this.field.field); // максимальный

        return isView && this.maxLevel > 0;
    }

    /** @type {number} */
    maxLevel;

    /**
     * @public
     * 
     * Формирование опций представления
     * 
     * @param {IBehaviourQueryOptions} options - Данные для SQL
     * @param { string } attribute - Атрибут
     * @param { string } viewName - Имя представления
     * 
     * @returns { Promise<IBehaviourOptions> }
     */
    async query(options, attribute, viewName) {
        if (!viewName) {
            return {
                before: [{ attribute: this.field.field, additionalAttributes: [attribute] }],
                current: [{ attribute: this.field.field, additionalAttributes: [attribute] }],
            }
        }

        return {};
    }
}

module.exports = ViewBehaviorClass;