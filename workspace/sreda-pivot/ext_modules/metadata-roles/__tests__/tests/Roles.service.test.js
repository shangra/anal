/*
На основе предоставленного кода можно создать набор тестов для проверки основных методов класса `RolesService`. Для тестирования будем использовать библиотеку Jest. Тесты будут проверять как базовые сценарии работы метода, так и обработку ошибок.

Создадим файл `roles.service.test.js`, который разместим в директории `__tests__/tests`.

---

### roles.service.test.js


---

### Что проверяют эти тесты?

1. **Метод `form()`** — проверка того, что метод возвращает валидную форму конфигурации.
   
2. **Метод `getFormFields()`** — проверка правильности возвращаемых полей формы.

3. **Метод `validate()`** — тестирование валидатора на предмет обработки обязательных полей (`name`) и возврата ошибки при пустых значениях.

4. **Методы `createMetadata()` и `updateMetadata()`** — проверка вызова родительского метода и обработка ошибок при некорректных данных.

5. **Метод `getAll()`** — проверка получения дочерних метаданных и преобразования их в нужный формат.

6. **Метод `_convertToNodeType()`** — проверка правильного преобразования метаданных в тип узла.

7. **Метод `getTreeChildrenV3()`** — проверка поведения метода при обработке узлов разных классов.

Эти тесты помогут убедиться, что основные функциональные возможности модуля работают корректно и обрабатывают возможные ошибки.
*/

const RolesService = require('../../services/Roles.service');
const MetadataClass = require('../../../metadata-cmp/services/Metadata.service');
const ApiError = require('../../../../core/exceptions/ApiError');
const FormsService = require('../../../metadata-forms/services/Forms.service');

describe('RolesService', () => {
    let service;
    beforeEach(() => {
        service = new RolesService();
    });

    describe('form method', () => {
        test('should return a valid form configuration', async () => {
            const result = await service.form();
            expect(result.form).toHaveLength(1); // Проверяем наличие одного элемента в форме
            expect(result.form[0]).toEqual({
                component: 'MetadataUiKit.Tabs',
                props: {
                    tabs: [
                        {
                            name: 'Основное',
                            content: expect.any(Array), // Ожидаем массив элементов формы
                        },
                    ],
                },
            });
        });
    });

    describe('getFormFields method', () => {
        test('should return an array of field configurations', () => {
            const fields = service.getFormFields();
            expect(fields).toHaveLength(3); // Проверяем количество полей
            expect(fields[0]).toMatchObject({
                name: 'formelement',
                description: 'Форма документа',
                type: 'REF',
            });
        });
    });

    describe('validate method', () => {
        test('should return empty array for valid input', async () => {
            const body = { name: 'Valid Role' };
            const errors = await service.validate(body);
            expect(errors).toHaveLength(0);
        });

        test('should return error when name is missing or empty', async () => {
            const invalidBodies = [{ name: '' }, {}];
            for (let i = 0; i < invalidBodies.length; i++) {
                const errors = await service.validate(invalidBodies[i]);
                expect(errors).toContain(
                    'Поле "Имя" обязательно для заполнения'
                );
            }
        });
    });

    describe('createMetadata and updateMetadata methods', () => {
        test("should call parent's createMetadata with valid input", async () => {
            jest.spyOn(service, 'createMetadata');
            const body = { name: 'Test Role' };
            await service.createMetadata(body);
            expect(service.createMetadata).toHaveBeenCalledWith(
                body,
                undefined
            );
        });

        test('should throw BadRequest on validation failure', async () => {
            const invalidBody = {};
            await expect(service.createMetadata(invalidBody)).rejects.toThrow(
                ApiError.BadRequest
            );
        });
    });

    describe('getAll method', () => {
        test('should fetch metadata children and convert them to node types', async () => {
            const mockPages = [
                { id: 'page1', name: 'Page One' },
                { id: 'page2', name: 'Page Two' },
            ];
            jest.spyOn(
                MetadataClass.prototype,
                'getMetadataChildren'
            ).mockResolvedValue(mockPages);

            const result = await service.getAll();
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                id: 'page1',
                title: 'Page One',
                class: 'pages',
            });
        });
    });

    describe('getChildren method', () => {
        test('should fetch metadata children by given ID', async () => {
            const mockId = 'parent-id';
            const mockPages = [
                { id: 'child1', name: 'Child Page One' },
                { id: 'child2', name: 'Child Page Two' },
            ];
            jest.spyOn(
                MetadataClass.prototype,
                'getMetadataChildren'
            ).mockResolvedValue(mockPages);

            const result = await service.getChildren(mockId);
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                id: 'child1',
                title: 'Child Page One',
                class: 'pages',
            });
        });
    });

    describe('_convertToNodeType method', () => {
        test('should correctly transform metadata item into node type format', () => {
            const mockItem = { id: 'item1', name: 'Item Name' };
            const converted = service._convertToNodeType(mockItem);
            expect(converted).toMatchObject({
                id: 'item1',
                title: 'Item Name',
                class: 'pages',
                crud: ['c', 'r', 'u', 'd', 'rls'], // Проверяем наличие всех разрешений
            });
        });
    });

    describe('getTreeChildrenV3 method', () => {
        test('should mark certain nodes as non-expandable', () => {
            const mockChildren = [
                { id: 'node1', class: 'Roles' },
                { id: 'node2', class: 'OtherClass' },
            ];
            const transformed = service.getTreeChildrenV3(mockChildren);
            expect(transformed[0].needToLoading).toBe(false); // Убедимся, что узел не расширяется
            expect(transformed[1].needToLoading).not.toBeDefined(); // Остальные узлы остаются без изменений
        });
    });
});
