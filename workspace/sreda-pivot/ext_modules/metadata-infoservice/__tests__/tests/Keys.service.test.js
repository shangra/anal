/*
Вот пример тестов для модуля `Keys.service.js` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Keys.service.test.js` следующего содержания:


Эти тесты проверяют следующее:

1. Метод `.form()` возвращает ожидаемый результат с правильной структурой формы
2. Конструктор класса правильно инициализирует свойства `component` и `id`

Вы можете добавить дополнительные тесты, если ваш сервис включает больше методов или сложного поведения.
*/

const KeysService = require('../../services/Keys.service');

describe('KeysService', () => {
    
    test('form method returns correct structure', async () => {
        const keysService = new KeysService();
        
        const expectedFormStructure = {
            form: [
                {
                    name: 'primarykey',
                    description: 'Первичный ключ',
                    type: 'BOOL',
                },
            ]
        };
        
        const actualResult = await keysService.form();
        
        expect(actualResult).toEqual(expectedFormStructure);
    });

    describe('Constructor initialization', () => {
        test('should set component and id properties correctly', () => {
            const keysService = new KeysService();
            
            expect(keysService.component).toBe('Keys');
            expect(keysService.id).toBe('7827a8a5-4f92-443a-bb73-1dfcca358abf');
        });
    });
});
