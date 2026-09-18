/*
Вот пример тестов для модуля `Keys.service.js`, написанных с использованием библиотеки Jest:


Эти тесты проверяют два основных аспекта класса `KeysService`:

1. Метод `.form()` возвращает правильную структуру формы с тремя полями
2. Конструктор устанавливает правильные значения свойств `id` и `component`

Вы можете расширить эти тесты дополнительными сценариями проверки поведения метода `.form()` или добавить проверку других методов, если они появятся в будущем.
*/

// __tests__/tests/Keys.service.test.js

const KeysService = require('../../services/Keys.service');

describe('KeysService', () => {
    test('form returns correct structure', async () => {
        const keysService = new KeysService();
        
        const expectedForm = {
            form: [
                {
                    name: 'primarykey',
                    description: 'Первичный ключ',
                    type: 'BOOL',
                },
                {
                    name: 'fieldview',
                    description: 'Поле представления',
                    type: 'REF',
                    link: {
                        type: 'local',
                        metalink: [keysService.id, keysService.component],
                    },
                },
                {
                    name: 'templateview',
                    description: 'Шаблон представления',
                    type: 'STRING',
                    template: '[[field1]] ([[field2]] - [[field3]])',
                },
            ]
        };
    
        const actualForm = await keysService.form();
    
        expect(actualForm).toEqual(expectedForm);
    });

    describe('Constructor', () => {
        test('sets correct properties on initialization', () => {
            const keysService = new KeysService();
            
            expect(keysService.id).toBeDefined();
            expect(keysService.component).toBeDefined();
        });
    });
});
