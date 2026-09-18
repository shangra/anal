const BaseClass = require('./behaviour/Base.class');
const CaseClass = require('./behaviour/Case.class');
const ViewClass = require('./behaviour/View.class');
const WithClass = require('./behaviour/With.class');

/**
 * @typedef {import('../../../../metadata-cmp/services/Metadata.service')} MetadataService
 * @typedef {import('../../../../metadata-cmp/services/Metadata.service').LevelClassI} LevelClassI
 * @typedef {import('./behaviour/types/index').IFactory} IFactory
 * @typedef {import('./behaviour/types/index').IFactoryInit} IFactoryInit
 * @typedef {import('./behaviour/types/index').IBehaviourOptions} IBehaviourOptions
 * @typedef {import('./behaviour/types/index').IQueryBuilerBehavior} IQueryBuilerBehavior
 */

/**
 * @class Factory
 * @implements {IFactory}
 */
class Factory {
    /**
     * @param {MetadataService} meta
     */
    constructor(meta) {
        this.meta = meta;
    }

    /**
     * Сформировать необходимый класс поведения в зависимости от переданных параметров
     *
     * @param {IFactoryInit} param0
     * @returns {Promise<IQueryBuilerBehavior>}
     */
    async init({ isBehaviour, refItem, field, table, delimeter, connector }) {
        const meta = refItem?.ref ? await this.meta.getInstance(refItem.ref, {}) : null;

        if (meta?.getConnector && refItem && isBehaviour) {
            const idGuide = typeof refItem.ref === 'object' ? refItem.ref.value : refItem.ref;

            const item = await meta.getItem(idGuide);

            const { connector: hierarchyConnector } = await meta.getConnector(item);

            const isSameConnector =
                refItem.SQLQueryFormat === 'useWith' ||
                (refItem.useWith && connector.dbhash === hierarchyConnector.dbhash);
            const isView = refItem.SQLQueryFormat === 'useView';

            if (isSameConnector) {
                return new WithClass({ refItem, connector, meta, table, field, delimeter });
            }

            if (isView) {
                return new ViewClass({ refItem, connector, meta, table, field, delimeter });
            }

            return new CaseClass({ refItem, meta, table, field, delimeter });
        }

        return new BaseClass({ refItem, meta, table, field, delimeter });
    }
}

module.exports = Factory;
