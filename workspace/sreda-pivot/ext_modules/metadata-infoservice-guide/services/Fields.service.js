const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');

class FieldsService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Fields';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        const InfoserviceService = require('./InfoserviceGuide.service');
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
                        boolean: 'BOOLEAN',
                        ref: 'REF',
                    },
                },
                {
                    name: 'length',
                    description: 'Длина',
                    type: 'INTEGER',
                    template: '255',
                },
                {
                    name: 'virtual',
                    description: 'Виртуальное поле',
                    type: 'BOOL',
                },
                {
                    name: 'fnfield',
                    description: 'Значение виртуального поля',
                    type: 'TEXT',
                    template: 'CONCAT("field2", "field2")',
                },
                {
                    name: 'ref',
                    description: 'Ссылка',
                    type: 'REF',
                    useParent: false,
                    link: new InfoserviceService().id,
                    class: InfoserviceService,
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
            ],
        };
    }
}

module.exports = FieldsService;
