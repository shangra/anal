const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const EnumsClass = require('./Enums.service');

class ValuesService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Values';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'key',
                    description: 'Ключ',
                    type: 'STRING',
                    template: 'Key',
                },
                {
                    name: 'value',
                    description: 'Значение',
                    type: 'STRING',
                    template: 'Value',
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

module.exports = ValuesService;
