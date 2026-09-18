/*
Вот пример тестов для вашего модуля `FormsService` с использованием библиотеки Jest:


Эти тесты проверяют следующее:

1. Метод `form()` возвращает валидную структуру формы
2. Методы CRUD (`create`, `read`, `update`, `delete`) работают корректно и выводят информацию в консоль через `console.log`
3. Проверяется наличие нужных свойств в результате метода `form()`
4. Используются шпионы (`jest.spyOn`) для проверки вызовов методов `console.log`

Вы можете расширить эти тесты дополнительными проверками в зависимости от специфики вашей реализации.
*/

const FormsService = require('../../services/Forms.service');

describe('FormsService', () => {
    
    describe('form method', () => {
        test('should return a valid form structure', async () => {
            const formsService = new FormsService();
            const result = await formsService.form();
            
            expect(result).toHaveProperty('form');
            expect(Array.isArray(result.form)).toBe(true);
            expect(result.form.length).toBeGreaterThan(0);
        });
    });

    describe('CRUD methods', () => {
        
        test('create should log and not throw an error', async () => {
            const formsService = new FormsService();
            const spy = jest.spyOn(console, 'log');
            
            await formsService.create({ someData: 'data' });
            
            expect(spy).toHaveBeenCalledWith('create', { someData: 'data' });
        });

        test('read should log and not throw an error', async () => {
            const formsService = new FormsService();
            const spy = jest.spyOn(console, 'log');
            
            await formsService.read('someId', { option: 'value' });
            
            expect(spy).toHaveBeenCalledWith('create', 'someId', { option: 'value' });
        });

        test('update should log and not throw an error', async () => {
            const formsService = new FormsService();
            const spy = jest.spyOn(console, 'log');
            
            await formsService.update('someId', { updatedData: 'newValue' });
            
            expect(spy).toHaveBeenCalledWith('update', 'someId', { updatedData: 'newValue' });
        });

        test('delete should log and not throw an error', async () => {
            const formsService = new FormsService();
            const spy = jest.spyOn(console, 'log');
            
            await formsService.delete('someId');
            
            expect(spy).toHaveBeenCalledWith('delete', 'someId');
        });
    });
});
