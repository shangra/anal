const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const SysFieldsService = require('./SysFields.service');
const FieldsService = require('./Fields.service');

const constants = require('../constants');

class KeysService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Keys';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'primarykey',
                    description: 'Первичный ключ',
                    type: 'BOOL',
                },
                {
                    name: 'fieldview',
                    description: 'Поле представления',
                    type: 'REF',
                    link: {
                        type: 'local', //local, global, single
                        metalink: [new FieldsService().id, new SysFieldsService().id],
                    },
                },
                {
                    name: 'templateview',
                    description: 'Шаблон представления',
                    type: 'STRING',
                    template: '[[field1]] ([[field2]] - [[field3]])',
                },
            ],
        };
    }
}

module.exports = KeysService;
