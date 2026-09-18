const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const MaskClass = require('./metadata/shared/Mask.class');
class MaskService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'Mask';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    /**
     * @param {string} id 
     * @returns 
     */
    async form(id) {
        return {
            form: [
                // {
                //     name: 'refGuide',
                //     description: 'Ссылка на справочник',
                //     useParent: false,
                //     type: 'REF',
                //     link: {
                //         type: 'global', // local, global, single
                //     },
                // },
                {
                    name: 'refGuideName',
                    description: 'Название поля в маскируемой сущности',
                    type: 'STRING',
                },
                {
                    name: 'mask',
                    description: 'Шаблон маскирования данных',
                    type: 'STRING'
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                }
            ]
        };
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Mask.id, MaskClass);
    global.sreda.bottle.factory('maskService', () => new MaskService());
}

module.exports = MaskService;