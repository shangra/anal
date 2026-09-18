/*
На основе предоставленного кода можно создать несколько тестов для проверки основных методов класса `RulesService`. Для тестирования будем использовать библиотеку Jest. Тесты будут проверять как базовые сценарии работы метода, так и обработку ошибок.

Вот пример набора тестов для данного модуля:


### Описание тестов:

1. **Метод `validate`:** Проверяет валидность тела запроса перед созданием или обновлением метаданных. Если поле `name` отсутствует или пустое — метод должен возвращать ошибку.
   
2. **Методы `createMetadata`, `updateMetadata`:** Эти методы проверяют вызов родительского метода при успешной проверке данных и выбрасывают исключение `BadRequest`, если проверка не пройдена.

3. **Метод `_convertToNodeType`:** Этот метод преобразует страницу из формата метаданных в формат узла дерева (`NodeType`), который затем отображается пользователю.

4. **Метод `getTreeChildrenV3`:** Метод скрывает возможность расширения определенных узлов дерева, таких как узел `"Rules"`.

Эти тесты помогут убедиться, что основные функциональные возможности модуля работают корректно и обрабатывают ошибки должным образом.
*/

// __tests__/tests/Rules.service.test.js

const RulesService = require('../../services/Rules.service');
const ApiError = require('../../../../core/exceptions/ApiError');

describe('RulesService', () => {
    let rulesService;

    beforeEach(() => {
        rulesService = new RulesService();
    });

    describe('validate method', () => {
        test('should return an error when the name field is empty', async () => {
            const body = {};
            const expectedErrors = ['Поле "Имя" обязательно для заполнения'];
            const actualErrors = await rulesService.validate(body);
            expect(actualErrors).toEqual(expectedErrors);
        });

        test('should not return any errors for valid input', async () => {
            const body = { name: 'Valid Name' };
            const actualErrors = await rulesService.validate(body);
            expect(actualErrors).toHaveLength(0);
        });
    });

    describe('createMetadata method', () => {
        test('should throw BadRequest error with invalid input', async () => {
            const body = {};
            await expect(rulesService.createMetadata(body)).rejects.toThrow(
                ApiError.BadRequest
            );
        });

        test('should call super.createMetadata with valid input', async () => {
            jest.spyOn(RulesService.prototype, 'superCreateMetadata');
            const body = { name: 'Valid Name' };
            await rulesService.createMetadata(body);
            expect(
                RulesService.prototype.superCreateMetadata
            ).toHaveBeenCalledWith(body);
        });
    });

    describe('updateMetadata method', () => {
        test('should throw BadRequest error with invalid input', async () => {
            const body = {};
            await expect(
                rulesService.updateMetadata('someId', body)
            ).rejects.toThrow(ApiError.BadRequest);
        });

        test('should call super.updateMetadata with valid input', async () => {
            jest.spyOn(RulesService.prototype, 'superUpdateMetadata');
            const body = { name: 'Updated Name' };
            await rulesService.updateMetadata('someId', body);
            expect(
                RulesService.prototype.superUpdateMetadata
            ).toHaveBeenCalledWith('someId', body);
        });
    });

    describe('_convertToNodeType method', () => {
        test('should convert a metadata item to node type format', () => {
            const page = { id: 'page-id', name: 'Page Title' };
            const convertedItem = rulesService._convertToNodeType(page);
            expect(convertedItem).toMatchObject({
                id: 'page-id',
                title: 'Page Title',
                children: [],
                loading: false,
                hasChildren: false,
                class: 'pages',
                crud: ['c', 'r', 'u', 'd', 'rls'],
            });
        });
    });

    describe('getTreeChildrenV3 method', () => {
        test('should mark certain nodes as non-expandable', () => {
            const children = [
                { id: 'node1', class: 'Pages' },
                { id: 'node2', class: 'Rules' },
            ];
            const modifiedChildren = rulesService.getTreeChildrenV3(children);
            expect(modifiedChildren).toEqual([
                { id: 'node1', class: 'Pages', needToLoading: undefined },
                { id: 'node2', class: 'Rules', needToLoading: false },
            ]);
        });
    });
});
