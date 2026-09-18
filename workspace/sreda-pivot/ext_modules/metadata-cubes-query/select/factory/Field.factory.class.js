const { ref_extract } = require('../../../metadata-cmp/util');
const BaseClass = require('../field/BaseBehavior.class');
const CaseClass = require('../field/CaseBehavior.class');
const ViewClass = require('../field/ViewBehavior.class');
const WithClass = require('../field/WithBehavior.class');

/**
 * @typedef {import('../types/index').IFactoryInit} IFactoryInit
 * @typedef {import('../types/index').IBehaviourOptions} IBehaviourOptions
 * @typedef {import('../types/index').IFactory<IQueryBuilerBehavior>} IFactory
 * @typedef {import('../types/index').IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import('../../../metadata-cmp/services/Metadata.service')} MetadataService
 * @typedef {import('../../../metadata-cmp/services/Metadata.service').LevelClassI} LevelClassI
 */

/**
 * @class Factory
 * @implements {IFactory}
 */
class Factory {
    /**
     * @param {MetadataService} meta 
     * @param {{ console(msg: string, meta: any): Promise<void> }} logger 
     */
    constructor(meta, logger, treeObject) {
        this.meta = meta;
        this.logger = logger;
        this.treeObject = treeObject
    }

    behaviours = [
        ViewClass,
        WithClass,
        CaseClass,
        BaseClass
    ];

    /**
     * Сформировать необходимый класс поведения в зависимости от переданных параметров
     * 
     * @param {IFactoryInit} param0 
     * @returns {Promise<IQueryBuilerBehavior>}
     */
    async init({ isBehaviour, field: field, table, delimeter, connector, viewName }) {
        const { value } = ref_extract(field?.ref);

        const meta = value
            ? await this.meta.getInstance(field?.ref, {})
            : null;

        if (meta?.getConnector && value && isBehaviour) {
            const item = await meta.getItem(value);

            const { connector: hierarchyConnector } = await meta.getConnector(item);

            const isSameConnector = field.SQLQueryFormat === 'useWith' && connector.dbhash === hierarchyConnector.dbhash;
            const isView = field.SQLQueryFormat === 'useView';

            if (isView) {
                await this.logger.console(`Для поля ${/** @type {object} */(field)?.field} применяем Денормализованное соединение`);

                if (viewName) {
                    await this.logger.console(`Для поля ${/** @type {object} */(field)?.field} применяем соединение в СУБД`);

                    return new WithClass({ connector, meta, table, field, delimeter, logger: this.logger, treeObject: this.treeObject });
                }

                const view = new ViewClass({ connector, meta, table, field, delimeter, logger: this.logger, treeObject: this.treeObject });

                const check = await view.isValid({});
                if (!check) {
                    await this.logger.console(`Для поля невозможно использовать Денормализованное соединение ${/** @type {object} */(field)?.field} используется соединение в СУБД`);

                    return new WithClass({ field, table, connector, meta, delimeter, logger: this.logger, treeObject: this.treeObject });
                }

                return view;
            }

            if (isSameConnector) {
                await this.logger.console(`Для поля ${/** @type {object} */(field)?.field} применяем соединение в СУБД`);

                return new WithClass({ connector, meta, table, field, delimeter, logger: this.logger, treeObject: this.treeObject });
            }

            await this.logger.console(`Для поля ${/** @type {object} */(field)?.field} применяем Виртуальное Соединение`);

            return new CaseClass({ meta, connector, table, field, delimeter, logger: this.logger, treeObject: this.treeObject });
        }

        await this.logger.console(`Для поля ${/** @type {object} */(field)?.field} не применяем никаких соединений`);

        return new BaseClass({ meta, table, field, delimeter, logger: this.logger, treeObject: this.treeObject });
    }
}

module.exports = Factory;