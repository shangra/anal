const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');
const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const InfoServiceMetadata = require('./metadata/InfoserviceMatrixGuide.class');
const constants = require('../constants');

class InfoserviceMatrixGuideService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'InfoserviceMatrixGuide';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async getClassesMetadata(innerResult, functionParams) {
        return super.getClassesMetadata(innerResult, functionParams);
    }

    async form(id) {
        const result = {
            form: [
                {
                    name: 'table',
                    description: 'Имя таблицы',
                    type: 'STRING',
                    template: 'test_table',
                },
                {
                    name: 'sqlalias',
                    description: 'Сложный запрос',
                    type: 'TEXT',
                    template: 'SELECT "B".A FROM B WHERE "B".A is not null',
                },
                {
                    name: 'filter',
                    description: 'Фильтр',
                    type: 'JSON',
                    template: '{where : {...} }',
                },
                {
                    name: 'hierarchy',
                    description: 'Иерархия',
                    type: 'BOOL',
                    forceValue: true
                },
                {
                    name: 'hideNestedIfEqual',
                    description: 'Скрывать вложенный элемент, если наименование = наименованию родителя',
                    type: 'BOOL',
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
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
                {
                    name: 'blockMessage',
                    description: 'Сообщение блокировки',
                    type: 'STRING',
                    template: 'Справочник-инфосервиса отключен по причине...',
                },
            ],
        };

        return result;
    }

    async createMetadata(body) {
        const table = await super.createMetadata(body);
        const name = constants.SysFields.component;
        const fields = [
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'id',
                description: 'id',
                settings: {
                    nameField: 'id',
                    type: 'uuid',
                },
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'name',
                description: 'name',
                settings: {
                    nameField: 'name',
                    type: 'TEXT',
                    length: 255,
                },
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'parent',
                description: 'parent',
                settings: {
                    nameField: 'parent',
                    type: 'TEXT',
                    notnull: true,
                },
            }
        ];

        const FieldsServiceClass = require('./SysFields.service');
        const FieldsService = new FieldsServiceClass();

        const promise = fields.map(async (field) => FieldsService.createMetadata(field));

        await Promise.all(promise);

        return table;
    }

    async read(id, options = {}) {
        return new InfoServiceMetadata({ id: id }).read(id, options);
    }

    async update(id, body) {
        console.log('update', id, body);
    }

    async delete(id) {
        console.log('delete', id);
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.InfoserviceMatrixGuide.id, InfoServiceMetadata);
    global.sreda.bottle.factory('infoserviceMatrixGuideService', () => new InfoserviceMatrixGuideService());
}

module.exports = InfoserviceMatrixGuideService;
