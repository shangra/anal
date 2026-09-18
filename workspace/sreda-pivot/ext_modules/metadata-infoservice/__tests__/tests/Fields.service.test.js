/*
Вот пример тестов для класса `FieldsService`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Fields.service.test.js` следующего содержания:


Эти тесты проверяют следующее:

1. Метод `.form()` возвращает объект с массивом полей правильной структуры
2. Конструктор устанавливает правильные значения свойств `id` и `component`
3. Поля содержат ожидаемые типы и списки вариантов выбора
*/

const FieldsService = require('../../services/Fields.service');

describe('FieldsService', () => {
    
    test('form method returns correct structure', async () => {
        const fieldsService = new FieldsService();
        
        const result = await fieldsService.form();
        
        expect(result).toHaveProperty('form');
        expect(Array.isArray(result.form)).toBe(true);
        
        // Проверка наличия некоторых полей формы
        const expectedNames = [
            'nameField',
            'type',
            'length',
            'virtual',
            'calculated',
            'fnfield',
            'hierarchy',
            'subtotal',
            'foreignkey',
            'ref',
            'refOrderField',
            'refOrderDirection',
            'isOrderOn',
            'SQLQueryFormat',
            'onoff'
        ];
        
        for(const name of expectedNames) {
            const found = result.form.find(field => field.name === name);
            expect(found).not.toBeUndefined();
        }
    });

    test('constructor sets correct properties', () => {
        const fieldsService = new FieldsService();
        
        expect(fieldsService.id).toEqual('1fa330a3-4b65-42e4-b12f-1fabd0c08945');
        expect(fieldsService.component).toEqual('Fields');
    });

    test('form method returns valid types and lists', async () => {
        const fieldsService = new FieldsService();
        
        const result = await fieldsService.form();
        
        // Проверка типов полей
        const typeField = result.form.find(f => f.name === 'type');
        expect(typeField.type).toEqual('LIST');
        expect(Object.keys(typeField.list)).toEqual([
            'uuid',
            'text',
            'string',
            'integer',
            'float',
            'date',
            'datetime',
            'boolean',
            'json',
            'ref'
        ]);
        
        // Проверка списка направлений сортировки
        const orderDirField = result.form.find(f => f.name === 'refOrderDirection');
        expect(orderDirField.type).toEqual('LIST');
        expect(Object.keys(orderDirField.list)).toEqual(['ASC', 'DESC']);
        
        // Проверка формата SQL-запросов
        const sqlFormatField = result.form.find(f => f.name === 'SQLQueryFormat');
        expect(sqlFormatField.type).toEqual('LIST');
        expect(Object.keys(sqlFormatField.list)).toEqual(['isOrderOn', 'useWith', 'useView']);
    });
});
