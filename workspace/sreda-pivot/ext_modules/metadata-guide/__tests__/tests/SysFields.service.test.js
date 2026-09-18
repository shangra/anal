/*
Вот пример тестов для модуля `SysFieldsService` с использованием библиотеки Jest:


Эти тесты проверяют два основных аспекта класса `SysFieldsService`:

1. Метод `.form()` возвращает правильную структуру формы
2. Конструктор корректно инициализирует свойства экземпляра класса
*/

// __tests__/tests/SysFields.service.test.js

const SysFieldsService = require('../../services/SysFields.service');

describe('SysFieldsService', () => {
    
    test('form возвращает валидную форму полей', async () => {
        const sysFieldsService = new SysFieldsService();
        
        const expectedForm = {
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
                    name: 'unique',
                    description: 'Уникальный',
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
                {
                    name: 'showfield',
                    description: 'Показывать',
                    type: 'BOOL',
                },
            ]
        };
        
        const actualForm = await sysFieldsService.form();
        
        expect(actualForm).toEqual(expectedForm);
    });

    test('Конструктор устанавливает правильные значения свойств', () => {
        const sysFieldsService = new SysFieldsService();
        
        expect(sysFieldsService.id).toBeDefined(); // Проверить наличие ID
        expect(sysFieldsService.component).toBeDefined(); // Проверить наличие компонента
    });
});
