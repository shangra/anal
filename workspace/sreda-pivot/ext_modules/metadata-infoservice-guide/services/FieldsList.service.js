const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const FieldsService = require('./Fields.service');
const constants = require('../constants');

class FieldsListService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'FieldsList';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'ref',
                    description: 'Поле',
                    type: 'REF',
                    link: new FieldsService().id,
                    class: FieldsService,
                },
            ],
        };
    }
}

module.exports = FieldsListService;
