/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../types").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../types").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../types").IBehaviourOptions} IBehaviourOptions
 * @typedef {import('../../../../core/db/types').TField} TField
 */

const { isEmptyObject, isNil } = require('../../../utils/services');
const DefaultClass = require('./_DefaultSubField.class');

/**
 * Поведение без иерархий
 * @class BaseClass
 */
class BaseSubFieldClass extends DefaultClass {
    /**
    * @param {{
    *    meta: LeveClassI,
    *    field: string | object,
    *    table: string,
    *    connector: IConnector,
    *    delimeter: string,
    *    logger: (...args: any) => Promise<void>
    * }} param0
    */
    constructor({ field, meta, table, connector, delimeter, logger }) {
        super({ field, meta, table });

        this.connector = connector;
        this.logger = logger;
    }

    /**
     * @public
     * 
     * @param {{ guideConnector?: IConnector, viewName?: string }} param0 
     * @returns {Promise<boolean>}
     */
    async isValid({ }) {
        return true;
    }

    /**
     * TODO!!!
     * 
     * Формирование первичных атрибутов
     * 
     * @public
     * 
     * @param {object} options 
     * @param {TField} key 
     * @param {string} [viewName] 
     * @returns {Promise<IBehaviourOptions>}
     */
    async query(options, key, viewName) {
        const { before, current } = await this.genSimpleLayer(options, key, viewName);

        const { after } = await this.generate(options, /** @type {string} */(key), viewName);

        if (after?.length) {
            current.push(...after);
        }

        return { before, current };
    }

    /**
     * TODO!!!
     * 
     * Формирование первичных атрибутов
     * 
     * @protected
     * 
     * @param {object} options 
     * @param {TField} key 
     * @param {string} [viewName] 
     * @returns {Promise<IBehaviourOptions>}
     */
    async genSimpleLayer(options, key, viewName) {
        let aggWhere = {};

        const { where, settings } = options;

        let isCalculated = false;

        let attribute = this.field?.field;
        const value = this.field?.value;
        const isDimensionAttrInValues = this.field?.type !== 'float' && settings?.values.includes(attribute);

        if (!Array.isArray(key) && typeof key === 'object' && !key.skipCheck) {
            if (this.connector.isNullAvaliable && !isDimensionAttrInValues) {
                aggWhere['$or'] ??= {};
                aggWhere['$or'][key.field] = {
                    ['$and']: {
                        [this.NOT_EQUAL]: 0,
                        [this.NOT]: null,
                    },
                };
            }

            if (!isEmptyObject(where?.[key.field])) {
                aggWhere['$or'] ??= {};
                aggWhere['$or'][key.field] = where?.[key.field] ?? {};
            }

            attribute = key.field;

            isCalculated = true;
        }

        const attr = this.generateViewName(attribute, viewName);

        const before = [{ attribute: this.generateViewName(attribute, viewName), field: value }];

        const current = isCalculated ? [{ attribute, where: aggWhere }] : [{ attribute: attr }];

        return { before, current }
    }

    /**
     * Формирование первичных атрибутов
     * 
     * @protected
     * 
     * @param {object} options 
     * @param {string} attribute 
     * @param {string} [viewName] 
     * @returns {Promise<IBehaviourOptions>}
     */
    async generate(options, attribute, viewName) {
        let localWhere = {};

        const { where, systemWhere } = options;

        if (where?.[attribute] !== undefined) {
            localWhere[attribute] = this.getFilter(where, attribute);
        }
        if (systemWhere?.[attribute] !== undefined) {
            localWhere[attribute] = this.getFilter(systemWhere, attribute);
        }

        if (this.isHierarchy) { localWhere = {}; }

        const after = isEmptyObject(localWhere) ? [] : [{ attribute, where: this.removeLevels(localWhere) }];

        return { after }
    }

    /**
     * @protected
     * 
     * @param {string} attribute 
     * @param {string} viewName 
     * @returns {string}
     */
    generateViewName(attribute, viewName) {
        return [attribute, viewName].filter(Boolean).join(this.delimeter);
    }
}

module.exports = BaseSubFieldClass;