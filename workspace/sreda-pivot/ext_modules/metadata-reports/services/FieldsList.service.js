const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const FieldsService = require('./Fields.service');
const constants = require('../constants');
const FieldsListClass = require('./metadata/shared/FieldsList.class');
class FieldsListService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'FieldsList';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'ref',
                    description: 'Поле источника',
                    type: 'REF',
                    link: new FieldsService().id,
                    class: FieldsService,
                },
                {
                    name: 'ref',
                    description: 'Поле приемника',
                    type: 'REF',
                    link: new FieldsService().id,
                    class: FieldsService,
                },
            ],
        };
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.FieldsList.id, FieldsListClass);
    global.sreda.bottle.factory('fieldsListService', () => new FieldsListService());
}

module.exports = FieldsListService;
