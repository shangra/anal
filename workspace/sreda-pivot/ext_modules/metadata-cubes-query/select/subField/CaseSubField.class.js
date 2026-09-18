/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../../../../db/rls/types/WhereOptions").WhereOptions} WhereOptions
 * @typedef {import("../types").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../../../../db/rls/types/WhereOptions").TField} TField
 * @typedef {import("../types").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../types").IBehaviourOptions} IBehaviourOptions
 */

const BaseSubFieldClass = require('./BaseSubField.class');

/**
 * Поведение без иерархий
 * @class BaseClass
 */
class CaseSubFieldClass extends BaseSubFieldClass {
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
        const { before, current } = await this.genSimpleLayer(options, key, viewName);

        if (!this.isHierarchy) {
            const { after } = await this.generate(options, /** @type {string} */(key), viewName);

            if (after?.length) {
                current.push(...after);
            }
        }

        return { before, current };
    }
}

module.exports = CaseSubFieldClass;