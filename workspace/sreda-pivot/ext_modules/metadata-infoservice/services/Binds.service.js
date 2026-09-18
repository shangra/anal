const FieldsService = require('./Fields.service');
const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const BindsClass = require('./metadata/shared/Binds.class');
const constants = require('../constants');

class BindsService extends DefaultMetaObject {
    constructor() {
        super();

        this.component = "Binds";

        this.id = constants[this.component].id;
    }

    async form() {
        return {
            form: [
                {
                    name: 'ref',
                    description: 'Ссылка',
                    useParent: false,
                    type: 'REF',
                    link: {
                        type: 'global', // local, global, single
                    }
                },
                {
                    name: 'field',
                    description: 'Поле Инфосервиса',
                    type: 'REF',
                    link: new FieldsService().id,
                    class: FieldsService,
                },
                {
                    name: 'refField',
                    description: 'Поле Справочника',
                    type: 'REF',
                    useParent: true,
                    parent: 'ref.id',
                    link: {
                        parent: 'ref.class_id',
                        field: ["AllFields"]
                    }
                }
            ],
        };
    }
}

if (global.sreda.bottle) {

    global.sreda.bottle.constant(constants.Binds.id, BindsClass);
    global.sreda.bottle.factory('bindsService', () => new BindsService());
}

module.exports = BindsService;
