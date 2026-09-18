const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const FieldsService = require('./Fields.service');
const constants = require('../constants');
const keysClass = require('./metadata/shared/Keys.class');
class KeysService extends DefaultMetaObject {
    constructor() {
        super();

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
                    link: new FieldsService().id,
                    class: FieldsService,
                },
            ],
        };
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Keys.id, keysClass);
    global.sreda.bottle.factory('keysService', () => new KeysService());
}

module.exports = KeysService;
