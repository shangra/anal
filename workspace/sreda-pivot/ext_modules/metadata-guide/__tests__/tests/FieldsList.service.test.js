/*
Вот пример тестов для модуля `FieldsListService`, написанных с использованием библиотеки Jest:


Эти тесты проверяют:

1. Корректность инициализации свойств в конструкторе класса
2. Валидность структуры формы, возвращаемой методом `form()` 
3. Проверку всех ключевых полей в форме, включая ссылки на сервисы других модулей
*/

const FieldsListService = require('../../services/FieldsList.service');
const FieldsService = require('../../services/Fields.service');
const SysFieldsService = require('../../services/SysFields.service');
const constants = require('../../services/constants');

describe('FieldsListService', () => {
    let fieldsListService;
    
    beforeEach(() => {
        fieldsListService = new FieldsListService();
    });

    test('Проверка конструктора', () => {
        expect(fieldsListService.id).toEqual(constants.FieldsList.id);
        expect(fieldsListService.component).toEqual(constants.FieldsList.component);
    });

    test('Метод form возвращает валидную форму', async () => {
        const formData = await fieldsListService.form();
        
        expect(formData).toHaveProperty('form');
        expect(Array.isArray(formData.form)).toBe(true);
        expect(formData.form.length).toBe(1);
        
        const field = formData.form[0];
        expect(field.name).toBe('ref');
        expect(field.description).toBe('Поле');
        expect(field.type).toBe('GREF');
        expect(field.link.type).toBe('local');
        expect(field.link.metalink).toEqual([new FieldsService().id, new SysFieldsService().id]);
    });
});
