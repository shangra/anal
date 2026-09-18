const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const FieldsService = require('./Fields.service');
const constants = require('../constants');

const Metadata = new MetadataClass();

class KeysService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Keys';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'primarykey',
                    description: 'Первичный ключ',
                    type: 'BOOL',
                },
                {
                    name: 'fieldview',
                    description: 'Поле представления',
                    type: 'REF',
                    link: new FieldsService().id,
                    class: FieldsService,
                },
                {
                    name: 'templateview',
                    description: 'Шаблон представления',
                    type: 'STRING',
                    template: '[[field1]] ([[field2]] - [[field3]])',
                },
            ],
        };
    }

    async validate(body) {
        const errors = [];
        const { owner_id, settings } = body;

        // ------------ check fieldview -------------- //

        const parent = await Metadata.getMetadata(owner_id);

        if (parent && typeof parent.manifest?.settings?.fieldhierarchy !== 'undefined') {
            const fieldhierarchy = parent.manifest.settings.fieldhierarchy;

            const fieldhierarchyValue =
                typeof fieldhierarchy === 'object' ? fieldhierarchy.value : fieldhierarchy;
            const fieldviewValue =
                typeof settings.fieldview === 'object'
                    ? settings.fieldview.value
                    : settings.fieldview;

            if (fieldhierarchyValue === fieldviewValue) {
                errors.push(
                    "'Поле представления' не может быть равно 'Поле родителя иерархии' инфосервиса."
                );
            }
        }

        // ------------ !check fieldview -------------- //

        return errors;
    }
}

module.exports = KeysService;
