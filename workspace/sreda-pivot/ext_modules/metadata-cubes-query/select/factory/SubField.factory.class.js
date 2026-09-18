const { ref_extract } = require('../../../metadata-cmp/util');
const BaseSubFieldClass = require('../subField/BaseSubField.class');
const CaseSubFieldClass = require('../subField/CaseSubField.class');
const ViewSubFieldClass = require('../subField/ViewSubField.class');
const WithSubFieldClass = require('../subField/WithSubField.class');

/**
 * @typedef {import('../../../metadata-cmp/services/Metadata.service')} MetadataService
 * @typedef {import('../../../metadata-cmp/services/Metadata.service').LevelClassI} LevelClassI
 * @typedef {import('../types/index').IFactory} IFactory
 * @typedef {import('../types/index').IFactoryInit} IFactoryInit
 * @typedef {import('../types/index').IBehaviourOptions} IBehaviourOptions
 * @typedef {import('../types/index').IQueryBuilerBehavior} IQueryBuilerBehavior
 */

/**
 * @implements {IFactory}
 */
class SubFieldFactory {
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
        ViewSubFieldClass,
        WithSubFieldClass,
        CaseSubFieldClass,
        BaseSubFieldClass,
    ];

    /**
     * Сформировать необходимый класс поведения в зависимости от переданных параметров
     * 
     * @param {IFactoryInit} param0 
     */
    async init({ treeObject, isBehaviour, field, table, delimeter, connector, viewName }) {
        const { value } = ref_extract(field?.ref);

        const meta = value
            ? await this.meta.getInstance(field?.ref, {})
            : null;

        if (meta?.getConnector && value && isBehaviour) {
            let isSameConnector = field.SQLQueryFormat === 'useWith';
            let isView = field.SQLQueryFormat === 'useView';

            if (isSameConnector) {
                const item = await meta.getItem(value);

                const { connector: hierarchyConnector } = await meta.getConnector(item);

                isSameConnector = connector.dbhash === hierarchyConnector.dbhash;
            }

            if (isView && !viewName) {
                await this.logger.console(`Для поля ${/** @type {object} */(field)?.field} используется ViewSubFieldClass`);

                const view = new ViewSubFieldClass({ treeObject, field, table, connector, meta, delimeter, logger: this.logger });

                const check = await view.isValid({});
                if (!check) {
                    await this.logger.console(`Для поля невозможно использовать ViewSubFieldClass ${/** @type {object} */(field)?.field} используется WithSubFieldClass`);

                    return new WithSubFieldClass({ field, table, connector, meta, delimeter, logger: this.logger });
                }

                return view;
            }

            if (isSameConnector) {
                await this.logger.console(`Для поля ${/** @type {object} */(field)?.field} используется WithSubFieldClass`);

                return new WithSubFieldClass({ field, table, connector, meta, delimeter, logger: this.logger });
            }

            await this.logger.console(`Для поля ${/** @type {object} */(field)?.field} применяем CaseSubFieldClass`);

            return new CaseSubFieldClass({ field, table, connector, meta, delimeter, logger: this.logger });
        }

        await this.logger.console(`Для поля ${/** @type {object} */(field)?.field} используется BaseSubFieldClass`);

        return new BaseSubFieldClass({ field, table, connector, meta, delimeter, logger: this.logger });
    }
}

module.exports = SubFieldFactory;