const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const TableMetadata = require('./metadata/shared/TabularParts.class');
const FieldsServiceClass = require('./TabularSysFields.service');
const TabularPartsClass = require('./metadata/shared/TabularParts.class');

class TabularPartsService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'TabularParts';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'table',
                    description: 'Имя таблицы',
                    type: 'STRING',
                    template: 'test_table',
                },
                {
                    name: 'ownerTabularPart',
                    description: 'Ведущая табличная часть',
                    type: 'REF',
                    link: this.id,
                    class: TabularPartsClass,
                },
            ],
        };
    }

    async createMetadata(body) {
        const table = await super.createMetadata(body);
        table.manifest = JSON.parse(table.manifest);

        const name = 'TabularSysFields';
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
                    increment: true,
                    notnull: true,
                    default: 'UUID',
                    editing: false,
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
                    // notnull: true,
                    editing: false,
                },
                events: {},
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'ДатаСоздания',
                description: 'Дата создания',
                settings: {
                    nameField: 'createdAt',
                    type: 'timestamp', // { label: 'DATETIME', value: 'datetime', key: 'datetime' },
                    // notnull: true,
                    editing: false,
                },
                events: {},
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'ДатаОбновления',
                description: 'Дата последнего обновления',
                settings: {
                    nameField: 'updatedAt',
                    type: 'timestamp', // { label: 'DATETIME', value: 'datetime', key: 'datetime' },
                    // notnull: true,
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

            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'ВладелецТаблицы',
                description: 'Владелец таблицы',
                settings: {
                    nameField: 'owner',
                    type: 'uuid',
                    notnull: true,
                    editing: false,
                },
                events: {},
            },
            {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'НомерСтроки',
                description: 'Номер строки',
                settings: {
                    nameField: 'rank',
                    type: 'integer',
                    notnull: true,
                    editing: false,
                },
                events: {},
            },
        ];

        //ownerTabularPart
        if (typeof table?.manifest?.settings?.ownerTabularPart === 'object') {
            fields.push({
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'ВедущаяТабличнаяЧасть',
                description: 'Ведущая табличная часть',
                settings: {
                    nameField: 'ownerTabularPart',
                    type: 'uuid',
                    notnull: true,
                    editing: false,
                },
                events: {},
            });
        }

        let fieldID;
        for (const field of fields) {
            const FieldsService = new FieldsServiceClass();
            const fieldM = await FieldsService.createMetadata(field);

            if (field.settings.nameField === 'id') fieldID = fieldM;
        }

        return table;
    }

    async updateMetadata(body, transaction) {
        const table = await super.updateMetadata(body, transaction);

        const name = 'TabularSysFields';
        table.manifest = JSON.parse(table.manifest);

        const Meta = new TabularPartsClass({ id: body });
        const tableInfo = await Meta.tableInfo(Meta, body);

        const hasField = tableInfo.Fields?.ownerTabularPart ? true : false;
        const setField = table?.manifest?.settings?.ownerTabularPart?.link ? true : false;

        if (!hasField && setField) {
            //Добавить связь
            //Есть какая-то ссылка
            const appentField = {
                owner_id: table.id,
                class_id: constants[name].id,
                class: constants[name].component,
                name: 'ВедущаяТабличнаяЧасть',
                description: 'Ведущая табличная часть',
                settings: {
                    nameField: 'ownerTabularPart',
                    type: 'uuid',
                    notnull: true,
                },
                events: {},
            };

            const FieldsService = new FieldsServiceClass();
            const fieldM = await FieldsService.createMetadata(appentField);
            //Чтобы сделать с fieldM...?
        } else if (hasField && !setField) {
            //Удалить связь
            const fieldM = tableInfo.Fields.ownerTabularPart;

            const FieldsService = new FieldsServiceClass();
            await FieldsService.deleteMetadata(fieldM.id);
        }

        return table;
    }

    async create(id, tabular, body) {
        return new TableMetadata({ id }).create(id, tabular, body);
    }

    async read(id, tabular, options = {}) {
        return new TableMetadata({ id }).read(id, tabular, options);
    }

    async update(id, tabular, body) {
        return new TableMetadata({ id }).update(id, tabular, body);
    }

    async delete(id, tabular, body) {
        return new TableMetadata({ id }).delete(id, tabular, body);
    }
}

module.exports = TabularPartsService;
