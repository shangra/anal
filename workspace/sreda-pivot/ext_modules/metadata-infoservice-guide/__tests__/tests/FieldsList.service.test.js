/*
Вот пример тестов для модуля `FieldsListService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/FieldsList.service.test.js` следующего содержания:


Эти тесты проверяют следующее:

1. Метод `form()` возвращает ожидаемый результат с правильной структурой формы.
2. Конструктор класса инициализирует свойства `id` и `component` значениями из констант.

Не забудьте установить библиотеку Jest командой `npm install --save-dev jest`, если вы еще этого не сделали.
*/

const FieldsListService = require('../../services/FieldsList.service');
const FieldsService = require('../../services/Fields.service');
const constants = require('../../services/constants');

describe('FieldsListService', () => {
    let fieldsListService;
    
    beforeEach(() => {
        fieldsListService = new FieldsListService();
    });

    test('form method returns correct structure', async () => {
        const expectedFormStructure = {
            form: [
                {
                    name: 'ref',
                    description: 'Поле',
                    type: 'REF',
                    link: constants.FieldsList.id,
                    class: FieldsService,
                },
            ]
        };
        
        const actualResult = await fieldsListService.form();
        
        expect(actualResult).toEqual(expectedFormStructure);
    });

    describe('constructor initialization', () => {
        test('sets correct properties from constants', () => {
            expect(fieldsListService.id).toEqual(constants.FieldsList.id);
            expect(fieldsListService.component).toEqual(constants.FieldsList.component);
        });
    });
});
