/*
Вот пример тестов для класса `TabularSysFieldsService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/TabularSysFields.service.test.js` следующего содержания:


Эти тесты проверяют следующее:

1. Метод `form()` возвращает правильную структуру формы с ожидаемым набором полей.
2. Конструктор устанавливает свойства `id` и `component` корректно.

Тесты используют метод `beforeEach` для создания нового экземпляра сервиса перед каждым тестом, обеспечивая чистоту окружения тестирования.
*/

const TabularSysFieldsService = require('../../services/TabularSysFields.service');

describe('TabularSysFieldsService', () => {
    let tabularSysFieldsService;
    
    beforeEach(() => {
        tabularSysFieldsService = new TabularSysFieldsService();
    });

    test('form returns correct structure', async () => {
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
                        timestamp: 'TIMESTAMP',
                        boolean: 'BOOLEAN',
                    },
                },
                {
                    name: 'length',
                    description: 'Длина',
                    type: 'INTEGER',
                    template: '255',
                },
                {
                    name: 'increment',
                    description: 'Автоинкремент',
                    type: 'BOOL',
                },
                {
                    name: 'notnull',
                    description: 'Обязательное',
                    type: 'BOOL',
                },
                {
                    name: 'showfield',
                    description: 'Показывать',
                    type: 'BOOL',
                },
                {
                    name: 'editing',
                    description: 'Редактируемый',
                    type: 'BOOL',
                },
                {
                    name: 'default',
                    description: 'Значение по умолчанию',
                    type: 'TEXT',
                    template: '',
                },
            ]
        };
        
        const actualResult = await tabularSysFieldsService.form();
        
        expect(actualResult).toEqual(expectedFormStructure);
    });

    describe('constructor', () => {
        it('sets properties correctly', () => {
            expect(tabularSysFieldsService.id).toBeDefined();
            expect(tabularSysFieldsService.component).toBeDefined();
        });
    });
});
