/*
Вот пример тестов для модуля `metaCopyPaste.service.js`, написанный с использованием библиотеки Jest:

Создайте файл `__tests__/tests/metaCopyPaste.service.test.js` следующего содержания:


Эти тесты покрывают основные методы класса `MetaCopyPasteService` и проверяют их функциональность. Они используют мокирование зависимостей через `jest.mock()` для имитации поведения внешних сервисов, таких как `MetadataService`.
*/

const MetaCopyPasteService = require('../../services/metaCopyPaste.service');
const MetadataService = require('../../metadata-cmp/services/Metadata.service');
const metadataService = new MetadataService();

jest.mock('../../metadata-cmp/services/Metadata.service');

describe('MetaCopyPasteService', () => {
    let metaCopyPasteService;

    beforeEach(() => {
        metaCopyPasteService = new MetaCopyPasteService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('formAfter', () => {
        test('should add buttons to innerResult', async () => {
            const innerResult = {};
            const functionInput = { id: 'some-id' };

            const updatedInnerResult = await metaCopyPasteService.formAfter(
                innerResult,
                functionInput
            );

            expect(updatedInnerResult.buttons.length).toEqual(2);
            expect(updatedInnerResult.buttons[0].name).toEqual('MetaCopy');
            expect(updatedInnerResult.buttons[1].name).toEqual('MetaPaste');
        });
    });

    describe('copy', () => {
        test('should return metadata when copying an ID', async () => {
            const id = 'some-id';
            const expectedData = { someKey: 'some-value' };

            metadataService.getMetadata.mockResolvedValue(expectedData);

            const result = await metaCopyPasteService.copy(id);

            expect(result).toEqual({ result: expectedData });
            expect(metadataService.getMetadata).toHaveBeenCalledWith(id);
        });
    });

    describe('changeValues', () => {
        test('should replace values with provided mappings', async () => {
            const value = ['old-key'];
            const replacedValues = { 'old-key': 'new-key' };

            const result = await metaCopyPasteService.changeValues(
                value,
                replacedValues
            );

            expect(result).toEqual(['new-key']);
        });

        test('should handle nested objects and arrays', async () => {
            const value = [{ key: 'old-key' }];
            const replacedValues = { 'old-key': 'new-key' };

            const result = await metaCopyPasteService.changeValues(
                value,
                replacedValues
            );

            expect(result).toEqual([{ key: 'new-key' }]);
        });
    });

    describe('pasteChildren', () => {
        test('should recursively paste child items', async () => {
            const newOwner = 'parent-id';
            const items = [
                {
                    id: 'child-id',
                    class_id: 'class-id',
                    manifest: { settings: { id: 'child-id' } },
                    children: [],
                },
            ];
            const pasted = {};

            await metaCopyPasteService.pasteChildren(newOwner, items, pasted);

            expect(metadataService.getItem).toHaveBeenCalledWith('child-id');
            expect(metadataService.setMetadata).toHaveBeenCalled();
            expect(metadataService.updMetadata).toHaveBeenCalled();
        });
    });

    describe('paste', () => {
        test('should paste metadata and update references', async () => {
            const id = 'some-id';
            const body = { result: { manifest: {}, children: [] } };

            await metaCopyPasteService.paste(id, body);

            expect(metadataService.getMetadata).toHaveBeenCalledWith(id);
            expect(metadataService.delMetadata).toHaveBeenCalled();
            expect(metadataService.updMetadata).toHaveBeenCalled();
        });
    });
});
