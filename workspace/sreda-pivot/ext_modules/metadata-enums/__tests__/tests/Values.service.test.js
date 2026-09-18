/*
Вот пример тестов для модуля `Values.service.js`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Values.service.test.js` следующего содержания:


Эти тесты проверяют следующее:

1. Метод `.form()` возвращает правильную форму с ожидаемым набором полей
2. Конструктор класса правильно инициализирует свойства `id` и `component` (предполагая, что константы загружены корректно)

Вы можете расширить эти тесты дополнительными сценариями проверки поведения метода `.form()` или добавить дополнительные методы тестирования других аспектов службы, если они имеются.
*/

const ValuesService = require('../../services/Values.service');

describe('ValuesService', () => {
    let valuesService;
    
    beforeEach(() => {
        valuesService = new ValuesService();
    });

    test('form возвращает ожидаемый результат', async () => {
        const expectedForm = {
            form: [
                {
                    name: 'key',
                    description: 'Ключ',
                    type: 'STRING',
                    template: 'Key',
                },
                {
                    name: 'value',
                    description: 'Значение',
                    type: 'STRING',
                    template: 'Value',
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
            ]
        };
        
        const actualResult = await valuesService.form();
        
        expect(actualResult).toEqual(expectedForm);
    });

    test('Конструктор устанавливает правильные значения свойств', () => {
        expect(valuesService.id).toBeDefined(); // Предполагаем, что константы определены
        expect(valuesService.component).toBeDefined(); // Предполагаем, что константы определены
    });
});
