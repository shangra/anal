/*
Вот пример тестов для модуля `ForeignKeys.service.js`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/ForeignKeys.service.test.js` следующего содержания:


Эти тесты проверяют два основных аспекта класса `ForeignKeysService`:

1. Проверяется правильность структуры, возвращаемой методом `.form()` 
2. Проверяются свойства, установленные конструктором класса

Тесты используют стандартный подход Jest с методами `beforeEach`, `expect`, `toEqual` и другими.
*/

const ForeignKeysService = require('../../services/ForeignKeys.service');
const KeysService = require('../../metadata-cmp/services/Keys.service');
const InfoserviceServiceGuide = require('../../metadata-infoservice-guide/services/InfoserviceGuide.service');
const KeysGuidService = require('../../metadata-infoservice-guide/services/Keys.service');

describe('ForeignKeysService', () => {
    let foreignKeysService;
    
    beforeEach(() => {
        foreignKeysService = new ForeignKeysService();
    });

    test('form returns correct structure', async () => {
        const expectedForm = {
            form: [
                {
                    name: 'key',
                    description: 'Ключ приемник',
                    type: 'REF',
                    link: new KeysService().id,
                    class: KeysService,
                },
                {
                    name: 'guide',
                    description: 'Справочник источник',
                    type: 'REF',
                    useParent: false,
                    link: new InfoserviceServiceGuide().id,
                    class: InfoserviceServiceGuide,
                },
                {
                    name: 'guideKey',
                    description: 'Ключ источника',
                    type: 'REF',
                    parent: 'guide',
                    link: new KeysGuidService().id,
                    class: KeysGuidService,
                },
            ]
        };
        
        const actualForm = await foreignKeysService.form();
        
        expect(actualForm).toEqual(expectedForm);
    });

    test('constructor sets correct properties', () => {
        expect(foreignKeysService.id).toBe('0f158d38-debf-4c6d-9a3a-836f20b0e22d');
        expect(foreignKeysService.component).toBe('ForeignKeys');
    });
});
