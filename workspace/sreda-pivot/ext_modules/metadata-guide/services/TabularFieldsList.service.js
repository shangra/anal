const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
// const FieldsService = require('./Fields.service');
const constants = require('../constants');
const GuideService = require('./Guide.service');

class TabularFieldsListService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'TabularFieldsList';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'nameField',
                    description: 'Имя поля в СУБД',
                    type: 'STRING',
                    template: 'test_field',
                },
                {
                    name: 'type',
                    description: 'Тип поля',
                    type: 'LIST',
                    list: {
                        uuid: 'UUID',
                        text: 'TEXT',
                        blob: 'BLOB',
                        string: 'STRING',
                        integer: 'INTEGER',
                        float: 'FLOAT',
                        date: 'DATE',
                        datetime: 'DATETIME',
                        timestamp: 'TIMESTAMP',
                        boolean: 'BOOLEAN',
                    },
                },
                {
                    name: 'length',
                    description: 'Длина',
                    type: 'INTEGER',
                    template: '255',
                },
                {
                    name: 'precision',
                    description: 'Точность',
                    type: 'INTEGER',
                    template: '2',
                },
                {
                    name: 'increment',
                    description: 'Автоинкремент',
                    type: 'BOOL',
                },
                {
                    name: 'notnull',
                    description: 'Обязательное',
                    type: 'BOOL',
                },
                {
                    name: 'showfield',
                    description: 'Показывать',
                    type: 'BOOL',
                    default: true,
                },
                {
                    name: 'editing',
                    description: 'Редактируемый',
                    type: 'BOOL',
                    default: true,
                },
                {
                    name: 'ref',
                    description: 'Ссылка',
                    useParent: false,
                    type: 'REF',
                    link: {
                        type: 'global',
                    },
                },
            ],
        };
    }
}

module.exports = TabularFieldsListService;
