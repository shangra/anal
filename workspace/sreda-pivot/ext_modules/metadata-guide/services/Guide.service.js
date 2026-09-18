const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');
const TableMetadata = require('./metadata/Guide.class');
const FormsService = require('../../metadata-forms/services/Forms.service');
const FormsLocalService = require('./Forms.service');
const MetadataCMPService = require('../../metadata-cmp/services/Metadata.service');
const MetadataCMP = new MetadataCMPService();

const constants = require('../constants');

class GuideService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Guide';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form(id) {
        const isParentForm = await this.#isParentForm(id);

        const result = {
            form: [
                {
                    component: 'MetadataUiKit.Tabs',
                    props: {
                        tabs: [
                            {
                                name: 'Основное',
                                content: this.getFormFields(isParentForm),
                            },
                            {
                                name: 'Код на сервере',
                                content: [
                                    {
                                        component: 'FullscreenViewer',
                                        props: {
                                            style: { height: '500px' },
                                        },
                                        children: [
                                            {
                                                component: 'MetadataUiKit.CodeArea',
                                                props: {
                                                    key: 'codeserver',
                                                    name: 'codeserver',
                                                    showToolbar: false,
                                                    subKey: 'form',
                                                },
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        };

        if (id) {
            result.buttons = [
                {
                    name: 'Load DB model',
                    component: 'DBModelLoader',
                    props: {
                        type: 'update',
                        server: sreda.env.ESB_NAME || '',
                        service: `guide/autofill/${id}`,
                    },
                },
            ];
        }

        return result;
    }

    /**
     * Проверяет, является ли форма родительской
     * @param {string} id - ID таблицы
     * @returns {Promise<boolean>} true если форма родительская, false если нет
     */
    async #isParentForm(id) {
        if (!id) {
            return false;
        }

        try {
            const metaData = await MetadataCMP.getItem(id);
            if (!metaData) {
                return id === this.id;
            }

            if (metaData.class_id === id) {
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking parent form:', error);
            return false;
        }
    }

    /**
     * Возвращает конфигурацию полей формы в зависимости от типа документа
     * @param {boolean} isParentForm - Флаг, указывающий является ли форма родительской
     * @returns {Array<Object>} Массив объектов с конфигурацией полей формы
     */
    getFormFields(isParentForm) {
        const commonFields = [
            {
                name: 'formelement',
                description: 'Форма справочника',
                type: 'REF',
                useParent: false,
                link: {
                    type: 'local',
                    metalink: [new FormsService().id, new FormsLocalService().id],
                },
            },
            {
                name: 'formlist',
                description: 'Форма списка',
                type: 'REF',
                useParent: false,
                link: {
                    type: 'local',
                    metalink: [new FormsService().id, new FormsLocalService().id],
                },
            },
            {
                name: 'formchoice',
                description: 'Форма выбора',
                type: 'REF',
                useParent: false,
                link: {
                    type: 'local',
                    metalink: [new FormsService().id, new FormsLocalService().id],
                },
            },
            {
                name: 'formgroup',
                description: 'Форма группы',
                type: 'REF',
                useParent: false,
                link: {
                    type: 'local', // local, global, single
                    metalink: [new FormsService().id, new FormsLocalService().id],
                },
            },
        ];

        if (isParentForm) {
            return commonFields;
        }

        return [
            {
                name: 'table',
                description: 'Имя таблицы',
                type: 'STRING',
                template: 'test_table',
            },
            {
                name: 'hierarchical',
                description: 'Иерархия',
                type: 'BOOL',
                template: 'false',
            },
            ...commonFields,
            {
                name: 'connector',
                description: 'Коннектор',
                type: 'REF',
                useParent: false,
                link: new ConnectorClass().id,
                class: ConnectorClass,
            },
        ];
    }

    async createMetadata(body) {
        const table = await super.createMetadata(body);
        const name = 'SysFields';
        const fields = [
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'Идентификатор',
                description: 'Идентификатор',
                settings: {
                    nameField: 'id',
                    type: 'uuid',
                    notnull: true,
                    unique: true,
                    default: 'UUID',
                    editing: false,
                },
                events: {},
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'Наименование',
                description: 'Наименование',
                settings: {
                    nameField: 'name',
                    type: 'string',
                    length: 255,
                    notnull: true,
                    showfield: true,
                    editing: true,
                },
                events: {},
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'Номер',
                description: 'Порядковый номер',
                settings: {
                    nameField: 'code',
                    type: 'integer', // { label: 'INTEGER', value: 'integer', key: 'integer' },
                    increment: true,
                    unique: true,
                    notnull: true,
                    editing: false,
                },
                events: {},
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'Удалён',
                description: 'Пометка удаления',
                settings: {
                    nameField: 'markdel',
                    type: 'boolean', // { label: 'BOOL', value: 'bool', key: 'bool' },
                    notnull: true,
                    default: false,
                    editing: false,
                },
                events: {},
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'Дата создания',
                description: 'Дата создания',
                settings: {
                    nameField: 'createdAt',
                    type: 'timestamp', // { label: 'DATETIME', value: 'datetime', key: 'datetime' },
                    notnull: true,
                    editing: false,
                },
                events: {},
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'Дата обновления',
                description: 'Дата последнего обновления',
                settings: {
                    nameField: 'updatedAt',
                    type: 'timestamp', // { label: 'DATETIME', value: 'datetime', key: 'datetime' },
                    notnull: true,
                    editing: false,
                },
                events: {},
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'Автор',
                description: 'Пользователь создатель',
                settings: {
                    nameField: 'createdUser',
                    type: 'uuid', // { label: 'UUID', value: 'uuid', key: 'uuid' },
                    // notnull: true,
                    editing: false,
                },
                events: {},
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'Редактор',
                description: 'Пользователь последнего обновления',
                settings: {
                    nameField: 'updatedUser',
                    type: 'uuid', // { label: 'UUID', value: 'uuid', key: 'uuid' },
                    // notnull: true,
                    editing: false,
                },
                events: {},
            },
        ];

        if (body.settings.hierarchical) {
            fields.push({
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'Родитель',
                description: 'Родитель',
                settings: {
                    nameField: 'parent',
                    type: 'uuid', // { label: 'UUID', value: 'uuid', key: 'uuid' },
                    notnull: true,
                    default: '00000000-0000-0000-0000-000000000000',
                    editing: true,
                },
                events: {},
            });
        }

        const FieldsServiceClass = require('./SysFields.service');
        const FieldsService = new FieldsServiceClass();

        let fieldID;
        let fieldName;
        for (const field of fields) {
            const fieldM = await FieldsService.createMetadata(field);

            if (field.settings.nameField === 'id') fieldID = fieldM;
            if (field.settings.nameField === 'name') fieldName = fieldM;
        }

        if (fieldID) {
            const KeysServiceClass = require('./Keys.service');
            const KeysService = new KeysServiceClass();
            const keys = [
                {
                    owner_id: table.id,
                    class_id: KeysService.id,
                    class: 'Keys',
                    name: 'PK',
                    description: 'PK',
                    settings: {
                        primarykey: true,
                        fieldview: {
                            link: FieldsService.id,
                            value: fieldName.id,
                        },
                    },
                    events: {},
                },
            ];
            for (const key of keys) {
                const keyPK = await KeysService.createMetadata(key);
                const FieldsListServiceClass = require('./FieldsList.service');
                const FieldsListService = new FieldsListServiceClass();

                const fieldList = {
                    owner_id: keyPK.id,
                    class_id: FieldsListService.id,
                    class: 'FieldsList',
                    name: 'Идентификатор',
                    description: 'Идентификатор',
                    settings: {
                        ref: {
                            link: FieldsService.id,
                            value: fieldID.id,
                        },
                    },
                    events: {},
                };

                await FieldsListService.createMetadata(fieldList);
            }
        }

        return table;
    }

    async create(id, body, options) {
        return new TableMetadata({ id }).create(id, body, options);
    }

    async read(id, options = {}) {
        return new TableMetadata({ id }).read(id, options);
    }

    // async view(id, options = {}) {
    //     return new TableMetadata({ id }).view(id, options);
    // }

    async update(id, body) {
        return new TableMetadata({ id }).update(id, body);
    }

    async delete(id, body) {
        return new TableMetadata({ id }).delete(id, body);
    }

    async updateMetadata(id, body, transaction) {
        let prevData = await super.metadataItem(id);
        let data = await super.updateMetadata(id, body, transaction);
        let manifest = JSON.parse(data.manifest);

        if (manifest.settings.hierarchical !== prevData.data.hierarchical) {
            const FieldsServiceClass = require('./SysFields.service');
            const FieldsService = new FieldsServiceClass();

            if (manifest.settings.hierarchical) {
                //Добавить поле parent
                const name = 'SysFields';
                const field = {
                    owner_id: id,
                    class_id: constants[name].id,
                    class: constants[name].component,
                    name: 'Родитель',
                    description: 'Родитель',
                    settings: {
                        nameField: 'parent',
                        type: 'uuid', // { label: 'UUID', value: 'uuid', key: 'uuid' },
                        notnull: true,
                        default: '00000000-0000-0000-0000-000000000000',
                    },
                    events: {},
                };

                const fieldM = await FieldsService.createMetadata(field);

                console.log(fieldM);
            } else {
                //Удалить поле parent

                const fieldM = await MetadataCMP.getMetadataChildren(id);
                //Костылек
                const field = fieldM.filter(
                    (val) => val.name === 'Родитель' && val.class === 'SysFields'
                )[0];
                const delField = await FieldsService.deleteMetadata(field.id);
            }
        }
        return data;
    }
}

module.exports = GuideService;
