const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const KeysService = require('./Keys.service');
const InfoserviceServiceGuide = require('../../metadata-infoservice-guide/services/InfoserviceGuide.service');
const KeysGuidService = require('../../metadata-infoservice-guide/services/Keys.service');

class ForeignKeysService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        this.id = '0f158d38-debf-4c6d-9a3a-836f20b0e22d';
        this.component = 'ForeignKeys';
    }

    async form() {
        return {
            form: [
                {
                    name: 'key',
                    description: 'Ключ приемник',
                    type: 'REF',
                    link: new KeysService().id,
                    class: KeysService,
                },
                {
                    name: 'guide',
                    description: 'Справочник источник',
                    type: 'REF',
                    useParent: false,
                    link: new InfoserviceServiceGuide().id,
                    class: InfoserviceServiceGuide,
                },
                {
                    name: 'guideKey',
                    description: 'Ключ источника',
                    type: 'REF',
                    parent: 'guide',
                    link: new KeysGuidService().id,
                    class: KeysGuidService,
                },
            ],
        };
    }
}

module.exports = ForeignKeysService;
