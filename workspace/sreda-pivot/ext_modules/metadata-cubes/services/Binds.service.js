const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const InfoservicesService = require('./Infoservices.service');
const BindsClass = require('./metadata/shared/Binds.class');
const constants = require('../constants');

class BindsService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'Binds';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'infoservice_source',
                    description: 'Инфосервис источник',
                    type: 'REF',
                    link: new InfoservicesService().id,
                    class: InfoservicesService,
                },
                {
                    name: 'infoservice_receiver',
                    description: 'Инфосервис приемник',
                    type: 'REF',
                    link: new InfoservicesService().id,
                    class: InfoservicesService,
                },
            ],
        };
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Binds.id, BindsClass);
    global.sreda.bottle.factory('bindsService', () => new BindsService());
}

module.exports = BindsService;
