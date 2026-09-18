/*
Вот пример тестов для класса `KeysService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Keys.service.test.js` следующего содержания:


Эти тесты проверяют два основных метода класса `KeysService`: метод `form()` и метод `validate()`. Тесты покрывают основные сценарии использования этих методов и проверяют правильность возврата данных и обработки ошибок.
*/

const KeysService = require('../../services/Keys.service');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const FieldsService = require('../../services/Fields.service');

jest.mock('../../metadata-cmp/services/Metadata.service');
jest.mock('../../services/Fields.service');

describe('KeysService', () => {
    let keysService;

    beforeEach(() => {
        jest.clearAllMocks();
        keysService = new KeysService();
    });

    describe('form method', () => {
        test('should return correct form structure', async () => {
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
                        link: new FieldsService().id,
                        class: FieldsService,
                    },
                    {
                        name: 'templateview',
                        description: 'Шаблон представления',
                        type: 'STRING',
                        template: '[[field1]] ([[field2]] - [[field3]])',
                    },
                ]
            };

            const result = await keysService.form();
            expect(result).toEqual(expectedForm);
        });
    });

    describe('validate method', () => {
        test('should return empty array when no validation errors', async () => {
            const metadataMock = {
                manifest: {
                    settings: {
                        fieldhierarchy: null
                    }
                }
            };

            MetadataClass.prototype.getMetadata.mockResolvedValue(metadataMock);

            const body = {
                owner_id: 'some-id',
                settings: {
                    fieldview: 'some-field-view'
                }
            };

            const result = await keysService.validate(body);
            expect(result).toEqual([]);
        });

        test('should return error when fieldview equals fieldhierarchy', async () => {
            const metadataMock = {
                manifest: {
                    settings: {
                        fieldhierarchy: {
                            value: 'same-value'
                        }
                    }
                }
            };

            MetadataClass.prototype.getMetadata.mockResolvedValue(metadataMock);

            const body = {
                owner_id: 'some-id',
                settings: {
                    fieldview: {
                        value: 'same-value'
                    }
                }
            };

            const result = await keysService.validate(body);
            expect(result).toContain("'Поле представления' не может быть равно 'Поле родителя иерархии' инфосервиса.");
        });
    });
});
