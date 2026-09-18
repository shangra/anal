const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const MainMetadata = require('./metadata/Enums.class');
const constants = require('../constants');

class EnumsService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Enums';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form(id) {
        const result = {
            form: [
                // {
                //     name: 'table',
                //     description: 'Имя куба',
                //     type: 'STRING',
                //     template: 'test_cube',
                // },
                // {
                //     name: 'infoservice',
                //     description: 'Инфосервис',
                //     type: 'REF',
                //     useParent: false,
                //     link: new ConnectorClass().id,
                //     class: ConnectorClass,
                // },
            ],
        };

        return result;
    }

    async create(id, body) {
        // return new MainMetadata({ id: id }).create(id, body);
    }

    async read(id, options = {}) {
        return new MainMetadata({ id: id }).read(id, options);
    }

    async update(id, body) {
        // return new MainMetadata({ id: id }).update(id, body);
    }

    async delete(id, body) {
        // return new MainMetadata({ id: id }).delete(id, body);
    }
}

module.exports = EnumsService;
