/*
Вот пример тестов для вашего модуля `MetaCubeInfoService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/MetaCubeInfo.service.test.js` следующего содержания:


Эти тесты проверяют основные сценарии поведения метода `formAfter()` класса `MetaCubeInfoService`:

1. Добавление кнопки, когда предоставлен валидный ID.
2. Отсутствие изменений результата, когда отсутствует ID.
3. Корректную обработку случая пустого массива кнопок.

Не забудьте настроить переменные окружения перед запуском тестов, если они необходимы вашему сервису (например, ESB_NAME).
*/

const MetaCubeInfoService = require('../../services/MetaCubeInfo.service');
const MetadataService = require('../../metadata-cmp/services/Metadata.service');

jest.mock('../../metadata-cmp/services/Metadata.service');

describe('MetaCubeInfoService', () => {
    let metaCubeInfoService;
    
    beforeEach(() => {
        metaCubeInfoService = new MetaCubeInfoService();
        
        // Mocking metadata service methods
        MetadataService.prototype.getItem = jest.fn().mockResolvedValue({ /* some mocked cube info */ });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('formAfter should add button when ID is provided', async () => {
        const inputId = 'some-id';
        const initialButtons = [];
        const expectedButton = {
            name: 'MetaCubeInfo',
            component: 'MetaCubeInfo',
            props: {
                type: 'update',
                icon: 'bi bi-info-circle',
                title: 'Информация о кубе',
                server: process.env.ESB_NAME || '',
                service: `metadata/object/${inputId}`,
                cubeInfo: {}, // replace with actual mocked value from MetadataService.getItem()
            },
        };

        const result = await metaCubeInfoService.formAfter(
            { buttons: initialButtons }, 
            { id: inputId }
        );

        expect(result.buttons.length).toEqual(1);
        expect(result.buttons[0]).toEqual(expectedButton);
    });

    test('formAfter should not modify result when no ID is provided', async () => {
        const initialResult = { buttons: ['existing-button'] };
        const result = await metaCubeInfoService.formAfter(initialResult, {});

        expect(result).toEqual(initialResult);
    });

    test('formAfter should handle empty buttons array correctly', async () => {
        const inputId = 'some-id';
        const initialButtons = null; // or undefined
        const result = await metaCubeInfoService.formAfter(
            { buttons: initialButtons }, 
            { id: inputId }
        );

        expect(result.buttons.length).toEqual(1); // Expect a single button added
    });
});
