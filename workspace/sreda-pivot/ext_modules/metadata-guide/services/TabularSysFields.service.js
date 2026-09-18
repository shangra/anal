const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
//const GuideService = require('../../metadata-guide/services/Guide.service');

class TabularSysFieldsService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'TabularSysFields';

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
                },
                {
                    name: 'editing',
                    description: 'Редактируемый',
                    type: 'BOOL',
                },
                {
                    name: 'default',
                    description: 'Значение по умолчанию',
                    type: 'TEXT',
                    template: '',
                },
            ],
        };
    }
}

module.exports = TabularSysFieldsService;
