/**
 * @typedef {import('../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import('../../metadata-cubes-query/select/types').IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../../../db/rls/types/WhereOptions").WhereOptions} WhereOptions
 * @typedef {import("../../../db/rls/types/WhereOptions").TAggField} TAggField
 * @typedef {import("../../../db/rls/types/WhereOptions").TField} TField
 */

const DefaultSubFieldClass = require('./_DefaultSubFieldClass.class');

/**
 * Поведение без иерархий
 * 
 * @class BaseClass
 */
class BaseSubFieldClass extends DefaultSubFieldClass {

    /**
     * @public
     * 
     * @param {{ guideConnector?: IConnector, viewName?: string }} param0 
     * @returns {Promise<boolean>}
     */
    async isValid({ }) { return true; }

    /**
     * Формирование первичных атрибутов
     * 
     * @public
     * 
     * @param {object} options 
     * @param {TField} key 
     * @param {string} [viewName] 
     * 
     * @returns {Promise<IBehaviourOptions>}
     */
    async query(options, key, viewName) {
        let where = {};

        let isCalculated = false;

        let attribute = this.field?.field;

        let removeAttribute = null;

        let additionalAttributes = [];

        let value = this.field?.value;

        if (!Array.isArray(key) && typeof key === 'object' && !key.skipCheck) {
            attribute = `${key.field}__${key.func.toLowerCase()}`;

            key.field = attribute;

            value = `"${key.alias}"`;

            where['$or'] ??= {};
            where['$or'][attribute] = {
                ['$and']: {
                    [this.NOT_EQUAL]: 0,
                    [this.NOT]: null,
                },
            };

            removeAttribute = key.field;

            isCalculated = true;

            additionalAttributes.push(attribute);
        }

        return {
            current: [{ attribute, field: value, removeAttribute, additionalAttributes }],
            after: isCalculated ? [{ attribute, where }] : [],
        }
    }
}

module.exports = BaseSubFieldClass;