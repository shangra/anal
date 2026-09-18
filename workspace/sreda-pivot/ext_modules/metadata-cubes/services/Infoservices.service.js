const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const InfoservicesClass = require('./metadata/shared/Infoservices.class');
const ExInfoserviceServiceClass = require('../../metadata-infoservice/services/Infoservice.service');

class InfoservicesService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'Infoservices';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'ref',
                    description: 'Ссылка',
                    useParent: false,
                    type: 'REF',
                    link: new ExInfoserviceServiceClass().id,
                    class: ExInfoserviceServiceClass,
                },
            ],
        };
    }
}

if (global.sreda.bottle) {
    
    global.sreda.bottle.constant(constants.Infoservices.id, InfoservicesClass);
    global.sreda.bottle.factory('infoservicesService', () => new InfoservicesService());
}

module.exports = InfoservicesService;
