const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');
const ProcessingClass = require('./metadata/Processing.class');

const constants = require('../constants');

const ApiError = require('../../../core/exceptions/ApiError');
const GlobalService = require('../../../core/services/Global.service');

/**
 * @typedef {import('sequelize').Transaction} Transaction
 */

class ProcessingService extends DefaultMetaObject {
    constructor(props) {
        super(__dirname);

        const name = 'Processing';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async getClassesMetadata(innerResult, functionParams) {
        return super.getClassesMetadata(innerResult, functionParams);
    }

    async form(id) {
        return {
            form: [
                {
                    name: 'table',
                    description: 'Название таблицы',
                    type: 'STRING',
                    readOnly: true,
                    template: 'test_field',
                },
                {
                    name: 'connector',
                    description: 'Коннектор',
                    type: 'REF',
                    useParent: false,
                    link: new ConnectorClass().id,
                    class: ConnectorClass,
                },
                {
                    name: 'fullThrottle',
                    description: 'Просчитать каждую ноду',
                    type: 'BOOL',
                },
                {
                    name: 'onoff',
                    description: 'Отключен',
                    type: 'BOOL',
                }
            ],
        };
    }

    read(id) {
        return new ProcessingClass().read(id);
    }

    /**
     * @param {{ owner_id: string, settings: { connector: { link: string, value: string }, table: string } }} body
     * @param {{ transaction?: Transaction, force?: boolean }} [options]
     * @returns
     */
    async createMetadata(body, options) {
        const connectorId = body.settings?.connector?.value;
        if (!connectorId) {
            throw ApiError.AccessRestricted(`Не указан коннектор`);
        }

        body.settings.table = `processing_${GlobalService.md5(body.owner_id)}`;

        return super.createMetadata(body, options);
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Processing.id, ProcessingClass);
    global.sreda.bottle.factory('processingService', () => new ProcessingService());
}

module.exports = ProcessingService;
