const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const SysFieldsClass = require('./metadata/shared/SysFields.class');
class SysFieldsService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'SysFields';

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
                    name: 'unique',
                    description: 'Уникальный',
                    type: 'BOOL',
                },
                {
                    name: 'default',
                    description: 'Значение по умолчанию',
                    type: 'TEXT',
                    template: '',
                },
                {
                    name: 'showfield',
                    description: 'Показывать',
                    type: 'BOOL',
                },
            ],
        };
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.SysFields.id, SysFieldsClass);
    global.sreda.bottle.factory('sysFieldsService', () => new SysFieldsService());
}

module.exports = SysFieldsService;
