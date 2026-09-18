/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../types").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../types").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../types").IBehaviourOptions} IBehaviourOptions
 * @typedef {import('../../../../core/db/types').TField} TField
 */

const BaseSubFieldClass = require('./BaseSubField.class');

/**
 * Поведение без иерархий
 * @class BaseClass
 */
class WithSubFieldClass extends BaseSubFieldClass {
    /**
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
        return this.genSimpleLayer(options, key, viewName);
    }
}

module.exports = WithSubFieldClass;