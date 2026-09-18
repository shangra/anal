const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const FieldsService = require("./Fields.service");
const Hierarchyclass = require('./metadata/shared/Hierarchy.class');
class HierarchyService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'Hierarchy';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        const KeysService = require('./Keys.service');
        return {
            form: [
                {
                    name: 'level',
                    description: 'Уровень',
                    type: 'INTEGER',
                    template: '0',
                },
                {
                    name: 'keyId',
                    description: 'Ключ уровня',
                    type: 'REF',
                    link: new KeysService().id,
                    class: KeysService,
                },
                {
                    name: 'keyParent',
                    description: 'Ключ родителя',
                    type: 'REF',
                    link: new KeysService().id,
                    class: KeysService,
                },
                {
                    name: 'prevLevel',
                    description: 'Предыдущий уровень',
                    type: 'REF',
                    link: this.id,
                    class: HierarchyService,
                },
                {
                    name: 'isMaxVisibleLevel',
                    description: 'Последний видимый уровень',
                    type: 'BOOL',
                    template: 'false',
                },
            ],
        };
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Hierarchy.id, Hierarchyclass);
    global.sreda.bottle.factory('hierarchyService', () => new HierarchyService());
}

module.exports = HierarchyService;
