/*
Вот пример тестов для модуля `GuideFieldsService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/GuideFieldsService.test.js` следующего содержания:


Эти тесты проверяют следующее:

1. Структуру результата метода `form()` – проверка наличия массива `form`.
2. Наличие всех ожидаемых полей в форме.
3. Корректность типов каждого поля.
4. Присвоенные значения по умолчанию для булевых полей.
5. Правильность заданных шаблонов для некоторых полей.

Тесты покрывают основные аспекты поведения класса `GuideFieldsService`.
*/

const GuideFieldsService = require('../../services/GuideFieldsService.service');

describe('GuideFieldsService', () => {
    let guideFieldsService;
    
    beforeEach(() => {
        guideFieldsService = new GuideFieldsService();
    });

    test('form method returns correct structure', async () => {
        const result = await guideFieldsService.form();
        
        expect(result).toHaveProperty('form');
        expect(Array.isArray(result.form)).toBe(true);
        
        // Проверить наличие всех полей формы
        const expectedFormNames = ['nameField', 'type', 'length', 'precision', 'increment', 'notnull', 'unique', 'showfield', 'editing', 'ref'];
        const actualFormNames = result.form.map(field => field.name);
        
        expect(actualFormNames.sort()).toEqual(expectedFormNames.sort());
    });

    test('form method has correct types for fields', async () => {
        const result = await guideFieldsService.form();
        
        const expectedTypes = {
            nameField: 'STRING',
            type: 'LIST',
            length: 'INTEGER',
            precision: 'INTEGER',
            increment: 'BOOL',
            notnull: 'BOOL',
            unique: 'BOOL',
            showfield: 'BOOL',
            editing: 'BOOL',
            ref: 'REF',
        };
        
        result.form.forEach(field => {
            expect(field.type).toBe(expectedTypes[field.name]);
        });
    });

    test('form method has correct defaults for bool fields', async () => {
        const result = await guideFieldsService.form();
        
        const boolFieldsWithDefaults = ['showfield', 'editing'];
        
        boolFieldsWithDefaults.forEach(name => {
            const field = result.form.find(f => f.name === name);
            expect(field.default).toBe(true);
        });
    });

    test('form method has correct templates for fields', async () => {
        const result = await guideFieldsService.form();
        
        const expectedTemplates = {
            nameField: 'test_field',
            length: '255',
            precision: '2',
        };
        
        Object.entries(expectedTemplates).forEach(([name, value]) => {
            const field = result.form.find(f => f.name === name);
            expect(field.template).toBe(value);
        });
    });
});
