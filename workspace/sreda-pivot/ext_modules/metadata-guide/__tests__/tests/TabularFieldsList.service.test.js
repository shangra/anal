/*
Вот пример тестов для класса `TabularFieldsListService` с использованием библиотеки Jest:


Эти тесты проверяют следующее:
1. Структуру метода `.form()` - проверяется наличие массива с правильными полями
2. Корректность типов и шаблонов для каждого поля
3. Правильность установки свойств конструктора

Тесты покрывают основные аспекты функциональности класса `TabularFieldsListService`.
*/

const TabularFieldsListService = require('../../services/TabularFieldsList.service');

describe('TabularFieldsListService', () => {
    let tabularFieldsListService;
    
    beforeEach(() => {
        tabularFieldsListService = new TabularFieldsListService();
    });

    test('form returns correct structure', async () => {
        const result = await tabularFieldsListService.form();
        
        expect(result).toHaveProperty('form');
        expect(Array.isArray(result.form)).toBe(true);
        
        // Проверить наличие всех полей формы
        const expectedNames = ['nameField', 'type', 'length', 'precision', 'increment', 'notnull', 'showfield', 'editing', 'ref'];
        const actualNames = result.form.map(field => field.name);
        
        expect(actualNames.sort()).toEqual(expectedNames.sort());
    });

    test('form contains valid types and templates', async () => {
        const result = await tabularFieldsListService.form();
        
        // Проверить типы каждого поля
        result.form.forEach(field => {
            switch (field.name) {
                case 'nameField':
                    expect(field.type).toBe('STRING');
                    break;
                case 'type':
                    expect(field.type).toBe('LIST');
                    expect(Object.keys(field.list)).toContain('uuid', 'text', 'blob', 'string', 'integer', 'float', 'date', 'datetime', 'timestamp', 'boolean');
                    break;
                case 'length':
                case 'precision':
                    expect(field.type).toBe('INTEGER');
                    break;
                case 'increment':
                case 'notnull':
                case 'showfield':
                case 'editing':
                    expect(field.type).toBe('BOOL');
                    break;
                case 'ref':
                    expect(field.type).toBe('REF');
                    expect(field.link.type).toBe('global');
                    break;
                default:
                    throw new Error(`Unexpected field ${field.name}`);
            }
        });
    });

    test('constructor sets properties correctly', () => {
        expect(tabularFieldsListService.id).toBeDefined();
        expect(tabularFieldsListService.component).toBeDefined();
    });
});
