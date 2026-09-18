const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const ForeignKeysClass = require('./ForeignKeys.service');

class FieldsService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        this.id = '1fa330a3-4b65-42e4-b12f-1fabd0c08945';
        this.component = 'Fields';
    }

    async form() {
        return {
            form: [
                {
                    name: 'nameField',
                    description: 'Имя поля в СУБД',
                    type: 'STRING',
                    template: 'test_field',
                },
                {
                    name: 'type',
                    description: 'Тип поля',
                    type: 'LIST',
                    list: {
                        uuid: 'UUID',
                        text: 'TEXT',
                        string: 'STRING',
                        integer: 'INTEGER',
                        float: 'FLOAT',
                        date: 'DATE',
                        datetime: 'DATETIME',
                        boolean: 'BOOLEAN',
                        json: 'JSON',
                        ref: 'REF',
                    },
                },
                {
                    name: 'length',
                    description: 'Длина',
                    type: 'INTEGER',
                    template: '255',
                },
                {
                    name: 'virtual',
                    description: 'Виртуальное поле',
                    type: 'BOOL',
                },
                {
                    name: 'calculated',
                    description: 'Вычисляемое виртуальное поле',
                    type: 'BOOL',
                },
                {
                    name: 'fnfield',
                    description: 'Значение виртуального поля',
                    type: 'TEXT',
                    template: 'CONCAT("field2", "field2")',
                },
                {
                    name: 'hierarchy',
                    description: 'Поддержка иерархии',
                    type: 'BOOL',
                },
                {
                    name: 'subtotal',
                    description: 'Промежуточные итоги иерархии',
                    type: 'BOOL',
                },
                {
                    name: 'foreignkey',
                    description: 'Внешний ключ',
                    type: 'REF',
                    useParent: true,
                    link: {
                        type: 'single', // local, global, single
                        metalink: new ForeignKeysClass().id,
                    },
                    class: ForeignKeysClass,
                },
                {
                    name: 'ref',
                    description: 'Ссылка',
                    useParent: false,
                    type: 'REF',
                    link: {
                        type: 'global', // local, global, single
                    },
                },
                {
                    name: 'refOrderField',
                    description: 'Поле сортировки по ссылке',
                    type: 'REF',
                    useParent: true,
                    parent: 'ref.id',
                    link: {
                        parent: 'ref.class_id',
                        field: ['AllFields'],
                    },
                },
                {
                    name: 'refOrderDirection',
                    description: 'Направление сортировки',
                    type: 'LIST',
                    list: {
                        ASC: 'ASC',
                        DESC: 'DESC',
                    },
                },
                {
                    name: 'isOrderOn',
                    description: 'Сортировка активна',
                    type: 'BOOL',
                },
                {
                    name: 'SQLQueryFormat',
                    description: 'Формат соединения',
                    type: 'LIST',
                    list: {
                        isOrderOn: 'Виртуальное соединение',
                        useWith: 'Соединение в СУБД',
                        useView: 'Денормализованное соединение',
                    },
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
            ],
        };
    }
}

module.exports = FieldsService;
