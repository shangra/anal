const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');
const InfoServiceMetadata = require('./metadata/InfoserviceGuide.class');
const FieldsService = require('./Fields.service');
const constants = require('../constants');

const Metadata = new MetadataClass();

class InfoserviceGuideService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'InfoserviceGuide';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form(id) {
        const result = {
            form: [
                {
                    name: 'table',
                    description: 'Имя таблицы',
                    type: 'STRING',
                    template: 'test_table',
                },
                {
                    name: 'sqlalias',
                    description: 'Сложный запрос',
                    type: 'TEXT',
                    template: 'SELECT "B".A FROM B WHERE "B".A is not null',
                },
                {
                    name: 'filter',
                    description: 'Фильтр',
                    type: 'JSON',
                    template: '{where : {...} }',
                },
                {
                    name: 'hierarchy',
                    description: 'Иерархия',
                    type: 'BOOL',
                },
                {
                    name: 'hideNestedIfEqual',
                    description: 'Скрывать вложенный элемент, если наименование = наименованию родителя',
                    type: 'BOOL',
                },
                {
                    name: 'hierarchyLevels',
                    description: 'Количество уровней иерархии',
                    type: 'NUMBER',
                    nullable: true,
                    template: '0',
                },
                {
                    name: 'fieldhierarchy',
                    description: 'Поле родителя иерархии',
                    type: 'REF',
                    parent: 'id',
                    link: new FieldsService().id,
                    class: FieldsService,
                },
                {
                    name: 'fieldhierarchydefault',
                    description: 'Значение по-умолчанию поля родителя иерархии',
                    type: 'STRING',
                    nullable: true,
                },
                {
                    name: 'connector',
                    description: 'Коннектор',
                    type: 'REF',
                    useParent: false,
                    link: new ConnectorClass().id,
                    class: ConnectorClass,
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
                {
                    name: 'blockMessage',
                    description: 'Сообщение блокировки',
                    type: 'STRING',
                    template: 'Справочник-инфосервиса отключен по причине...',
                },
            ],
        };

        return result;
    }

    async validate(body) {
        const errors = [];
        const { settings } = body;

        // ------------ check fieldhierarchy -------------- //

        if (settings.id && settings.fieldhierarchy) {
            const child = await Metadata.getMetadataParent(settings.id);
            const pk = child.find(
                (c) => c.class_id === constants['Keys'].id && c.manifest.settings.primarykey
            );

            if (pk && pk.manifest?.settings?.fieldview) {
                const fieldhierarchyValue =
                    typeof settings.fieldhierarchy === 'object'
                        ? settings.fieldhierarchy.value
                        : settings.fieldhierarchy;
                const fieldviewValue =
                    typeof pk.manifest.settings.fieldview === 'object'
                        ? pk.manifest.settings.fieldview.value
                        : pk.manifest.settings.fieldview;

                if (fieldhierarchyValue === fieldviewValue) {
                    errors.push(
                        "'Поле родителя иерархии' не может быть равно 'Поле представления' первичного ключа инфосервиса."
                    );
                }
            }
        }

        // ------------ !check fieldhierarchy -------------- //

        return errors;
    }

    async create(body) {
        console.log('create', body);
    }

    async read(id, options = {}) {
        return new InfoServiceMetadata({ id: id }).read(id, options);
    }

    async update(id, body) {
        console.log('update', id, body);
    }

    async delete(id) {
        console.log('delete', id);
    }
}

module.exports = InfoserviceGuideService;
