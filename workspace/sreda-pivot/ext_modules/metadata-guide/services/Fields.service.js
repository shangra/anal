const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');

class GuideFieldsService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Fields';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form(id) {
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
                    name: 'unique',
                    description: 'Уникальный',
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
                        type: 'global', // local, global, single
                    },
                },
            ],
        };
    }
}

module.exports = GuideFieldsService;
