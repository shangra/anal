/*
Вот пример тестов для модуля `Fields.service.js`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Fields.service.test.js` следующего содержания:


Эти тесты проверяют две основные вещи:

1. Метод `.form()` возвращает правильную структуру формы с ожидаемым набором полей и типов.
   
2. Конструктор класса устанавливает необходимые свойства `id` и `component`.

Тесты используют асинхронное выполнение метода `.form()`, ожидая результат и сравнивая его с эталонной структурой. Также используются проверки наличия свойств конструктора через метод `.toBeDefined()`.
*/

const FieldsService = require('../../services/Fields.service');

describe('FieldsService', () => {
    
    test('form method returns correct structure', async () => {
        const fieldsService = new FieldsService();
        
        const expectedFormStructure = {
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
                    name: 'fnfield',
                    description: 'Значение виртуального поля',
                    type: 'TEXT',
                    template: 'CONCAT("field2", "field2")',
                },
                {
                    name: 'ref',
                    description: 'Ссылка',
                    type: 'REF',
                    useParent: false,
                    link: expect.any(String),
                    class: expect.any(Function),
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
            ]
        };

        const actualResult = await fieldsService.form();
        
        expect(actualResult).toEqual(expectedFormStructure);
    });

    test('constructor sets properties correctly', () => {
        const fieldsService = new FieldsService();
        
        expect(fieldsService.id).toBeDefined(); // Проверяет наличие свойства id
        expect(fieldsService.component).toBeDefined(); // Проверяет наличие свойства component
    });
});
