/*
Вот пример тестов для модуля `FieldsListService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/FieldsList.service.test.js` следующего содержания:


Эти тесты проверяют:

1. Корректность инициализации полей в конструкторе
2. Валидность результата метода `form()` - проверка структуры формы и свойств поля

Запускайте эти тесты командой `jest __tests__/tests/FieldsList.service.test.js`
*/

const FieldsListService = require('../../services/FieldsList.service');
const FieldsService = require('../../services/Fields.service');

describe('Тестирование класса FieldsListService', () => {
    
    test('Проверка конструктора', () => {
        const fieldsListService = new FieldsListService();
        
        expect(fieldsListService.id).toEqual('52a9e785-f68e-4427-b246-135620eea36f');
        expect(fieldsListService.component).toEqual('FieldsList');
    });

    test('Метод form возвращает валидную форму', async () => {
        const fieldsListService = new FieldsListService();
        const formData = await fieldsListService.form();
        
        expect(formData).toHaveProperty('form');
        expect(Array.isArray(formData.form)).toBe(true);
        expect(formData.form.length).toBe(1);
        
        const field = formData.form[0];
        expect(field.name).toEqual('ref');
        expect(field.description).toEqual('Поле');
        expect(field.type).toEqual('REF');
        expect(typeof field.link).toBe('string');
        expect(typeof field.class).toBe('function');
        expect(field.class).toBe(FieldsService); // Проверяем ссылку на класс
    });
});
