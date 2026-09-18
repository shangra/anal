/*
Тесты для данного модуля можно написать следующим образом, учитывая использование библиотеки Jest и специфику работы с классами и асинхронностью:

Создадим файл тестов под названием `metaMatrix.service.test.js`, который разместим в директории `__tests__/tests`.


### Пояснение к тестам:

1. **Моки зависимостей**: Мы используем функцию `jest.mock()` для создания мок-версий классов и методов, которые используются внутри нашего сервиса (`Extensions.class` и `Metadata.service`).
   
2. **beforeEach** — перед каждым тестом создается новый экземпляр класса `MetaEyeService`. Это гарантирует чистоту состояния при каждом новом тесте.

3. **afterEach** — после каждого теста очищаем вызовы всех функций-моков, чтобы избежать побочных эффектов между тестами.

4. **Тест метода `formAfter`** проверяет добавление кнопки в массив кнопок результата. Проверяется наличие новой кнопки с правильными параметрами.

5. **Тест метода `matrix`** проверяет вызов метода `getMetadata` из службы метаданных и правильность возвращаемого значения.

Эти тесты помогут убедиться, что логика вашего сервиса работает как ожидается, а также позволят легко выявлять ошибки при изменении кода.
*/

// __tests__/tests/metaMatrix.service.test.js

jest.mock('../../../core/class/Extensions.class');
jest.mock('../../metadata-cmp/services/Metadata.service');

const MetadataClassMock = jest.fn().mockImplementation(() => ({
    getMetadata: jest.fn(async () => ({ metadata: 'mocked' }))
}));

const Metadata = new MetadataClassMock(); // Создаем моковскую версию класса Metadata

const MetaEyeService = require('../../services/metaMatrix.service');

describe('MetaEyeService', () => {
    let metaEyeServiceInstance;

    beforeEach(() => {
        metaEyeServiceInstance = new MetaEyeService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('formAfter добавляет кнопку в результат', async () => {
        const input = {};
        const expectedOutput = {
            buttons: [
                {
                    name: 'MetaMatrix',
                    component: 'MetaMatrix',
                    props: {
                        id: undefined,
                        route: undefined,
                        server: process.env.ESB_NAME || '',
                        service: 'metadata/metaeye/eye/',
                        title: 'Просмотр сущности метаданных'
                    }
                }
            ]
        };

        const output = await metaEyeServiceInstance.formAfter(input, {});
        expect(output).toEqual(expectedOutput);
    });

    test('matrix возвращает результат от вызова getMetadata', async () => {
        const id = 'some-id';
        const result = await metaEyeServiceInstance.matrix(id);
        expect(result.result.metadata).toBe('mocked');
        expect(Metadata.getMetadata).toHaveBeenCalledWith(id);
    });
});
