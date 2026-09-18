const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const FieldsService = require('./Fields.service');

class FieldsListService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        this.id = '52a9e785-f68e-4427-b246-135620eea36f';
        this.component = 'FieldsList';
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
