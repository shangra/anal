const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');
const InfoServiceMetadata = require('./metadata/Infoservice.class');

class InfoserviceService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        this.id = 'b44b4843-f919-4362-b95c-4c354b2505bd';
        this.component = 'Infoservice';
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
                    name: 'connector',
                    description: 'Коннектор',
                    type: 'REF',
                    useParent: false,
                    link: new ConnectorClass().id,
                    class: ConnectorClass,
                },
                {
                    name: 'onoff',
                    description: 'Отключен для технических работ',
                    type: 'BOOL',
                },
                {
                    name: 'blockMessage',
                    description: 'Сообщение о блокировке',
                    type: 'STRING',
                    template: 'Инфосервис отключен по причине...',
                },
            ],
        };

        return result;
    }

    async create(body) {
        console.log('create', body);
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

module.exports = InfoserviceService;
