const ProcessingSubFieldFactory = require('../../metadata-processing-query/ProcessingSubField.factory');
const SubFieldFactory = require('../select/factory/SubField.factory.class');
const AccountClass = require('../matrix/account/Account.matrix.class');
const AccessClass = require('../matrix/access/Access.matrix.class');
const Factory = require('../select/factory/Field.factory.class');
const SelectClass = require('../select/Select.class');
const QueryBuilderClass = require('./Query.builder.class');
const TotalFactoryClass = require('../totals/Total.factory.class');

const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

/**
 * @typedef {import('../select/types').IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import('../select/types').IFactory<IQueryBuilerBehavior>} IFactory
 */

class BuilderClass {
    getSubField() { }

    async build({ isProcessing, options, table, connector, treeObject, logger }) {
        /** @type {IFactory} */
        const behaviourBuilder = new Factory(Metadata, logger, treeObject);
        /** @type {IFactory} */
        const subFieldBuilder = isProcessing ? new ProcessingSubFieldFactory(Metadata, logger) : new SubFieldFactory(Metadata, logger, treeObject);

        const account = new AccountClass({ meta: Metadata, logger });

        const access = new AccessClass({ meta: Metadata, logger });

        const totals = TotalFactoryClass.init({ connector, treeObject, options });

        const select = new SelectClass({ subFieldBuilder, behaviourBuilder, treeObject, table, connector, logger, totals });

        const query = new QueryBuilderClass({ connector, meta: Metadata, select, totalParser: totals, account, access, logger });

        return query;
    }
}

module.exports = BuilderClass;