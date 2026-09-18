const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const FieldsService = require('./Fields.service');
const SysFieldsService = require('./SysFields.service');
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
                    type: 'GREF',
                    link: {
                        type: 'local', //local, global, single
                        metalink: [new FieldsService().id, new SysFieldsService().id],
                    },
                },
            ],
        };
    }
}

module.exports = FieldsListService;
