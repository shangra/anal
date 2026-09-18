/*
Вот пример тестов для класса `MetaCompositeHelperService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/MetaCompositeHelper.service.test.js` следующего содержания:


Эти тесты проверяют основные методы сервиса:

1. Метод `tree()` проверяет наличие базовых типов и правильную структуру метаданных.
2. Методы `get()`, `post()`, `put()` и `del()` проверяются на возврат ожидаемых объектов с правильными значениями.

Не забудьте установить библиотеку Jest, если еще не сделали этого:

npm install --save-dev jest

Также добавьте скрипт запуска тестов в ваш `package.json`:

"scripts": {
    "test": "jest"
},

Теперь вы можете запустить тесты командой `npm run test`.
*/

const MetaCompositeHelperService = require('../../services/MetaCompositeHelper.service');

describe('MetaCompositeHelperService', () => {
    let metaCompositeHelperService;

    beforeEach(() => {
        metaCompositeHelperService = new MetaCompositeHelperService();
    });

    test('tree method returns expected structure', async () => {
        const result = await metaCompositeHelperService.tree();

        // Проверка наличия базовых типов
        expect(result.find((item) => item.value === 'STRING')).toBeTruthy();
        expect(result.find((item) => item.value === 'FLOAT')).toBeTruthy();
        expect(result.find((item) => item.value === 'BOOLEAN')).toBeTruthy();
        expect(result.find((item) => item.value === 'DATETIME')).toBeTruthy();

        // Проверка метаданных
        const metadataItem = result.find(
            (item) => item.value === '00000000-0000-0000-0000-000000000000'
        );
        expect(metadataItem.label).toEqual('Метаданные');
        expect(metadataItem.disabled).toBe(true);
        expect(Array.isArray(metadataItem.children)).toBe(true);
    });

    test('get method returns correct response for given ID', async () => {
        const id = 'some-id';
        const result = await metaCompositeHelperService.get(id);
        expect(result).toEqual({ get: id });
    });

    test('post method returns correct response for given body', async () => {
        const body = { key: 'value' };
        const result = await metaCompositeHelperService.post(body);
        expect(result).toEqual({ post: body });
    });

    test('put method returns correct response for given ID and body', async () => {
        const id = 'some-id';
        const body = { key: 'value' };
        const result = await metaCompositeHelperService.put(id, body);
        expect(result).toEqual({ put: { id, body } });
    });

    test('del method returns correct response for given ID', async () => {
        const id = 'some-id';
        const result = await metaCompositeHelperService.del(id);
        expect(result).toEqual({ del: id });
    });
});
