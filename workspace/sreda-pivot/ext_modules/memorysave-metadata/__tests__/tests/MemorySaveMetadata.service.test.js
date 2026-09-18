/*
Вот пример тестов для класса `MemorySaveMetadataService`, написанных с использованием библиотеки Jest:


Эти тесты покрывают основные методы класса `MemorySaveMetadataService`. Они проверяют работу методов по очистке кеша, генерации ключей, получению данных из кеша и сохранению новых данных в кэш.
*/

const MemorySaveMetadataService = require('../../services/MemorySaveMetadata.service');
const MemorySave = require('../../../core/services/memory-save');

describe('MemorySaveMetadataService', () => {
    let service;

    beforeEach(() => {
        service = new MemorySaveMetadataService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('formAfter', () => {
        test('should add button to innerResult', async () => {
            const innerResult = {};
            const functionInput = { id: 'someId' };

            const result = await service.formAfter(innerResult, functionInput);

            expect(result.buttons.length).toEqual(1);
            expect(result.buttons[0].props.id).toEqual(functionInput.id);
        });
    });

    describe('memorySaveMetadata', () => {
        test('should delete cache and return success response', async () => {
            const id = 'someId';
            MemorySave.del.mockResolvedValue(true);

            const result = await service.memorySaveMetadata(id);

            expect(MemorySave.del).toHaveBeenCalledWith(new RegExp(id));
            expect(result.result).toBeTruthy();
        });
    });

    describe('generateReadKey', () => {
        test('should generate correct key based on inputs', () => {
            const diffPart = { someParam: 'value' };
            const staticPart = ['id'];

            const result = service.generateReadKey(diffPart, staticPart);

            expect(typeof result).toBe('string');
            expect(result.startsWith(service.PREFIX + ':')).toBe(true);
        });
    });

    describe('clearCacheMetadataByBodyWithRefs', () => {
        test('should clear metadata cache with references', async () => {
            const id = 'someId';
            const body = { field: 'value' };
            const options = { force: true };

            MemorySave.del.mockResolvedValue(true);
            service.getChildIds.mockResolvedValue(['childId']);

            const result = await service.clearCacheMetadataByBodyWithRefs({ id, body }, options);

            expect(result.result).toBeTruthy();
            expect(MemorySave.del).toHaveBeenCalledTimes(3); // Проверка количества вызовов del()
        });
    });

    describe('memorySaveMetadataWithRefs', () => {
        test('should clear metadata cache including child IDs', async () => {
            const id = 'parentId';
            const options = { force: true };

            MemorySave.del.mockResolvedValue(true);
            service.getChildIds.mockResolvedValue(['childId1', 'childId2']);

            const result = await service.memorySaveMetadataWithRefs(id, options);

            expect(result.result).toBeTruthy();
            expect(MemorySave.del).toHaveBeenCalledTimes(3); // Родительский ID плюс два дочерних
        });
    });

    describe('getData', () => {
        test('should retrieve data from cache when available', async () => {
            const originalMethod = jest.fn().mockReturnValue('data');
            const key = 'cache_key';
            const params = ['param1'];

            MemorySave.get.mockResolvedValue('cached_data');

            const result = await service.getData(originalMethod, key, params);

            expect(result).toEqual('cached_data');
            expect(MemorySave.get).toHaveBeenCalledWith(key);
            expect(originalMethod).not.toHaveBeenCalled();
        });

        test('should store data in cache when not present', async () => {
            const originalMethod = jest.fn().mockReturnValue('new_data');
            const key = 'cache_key';
            const params = ['param1'];

            MemorySave.get.mockResolvedValue(null);
            MemorySave.set.mockResolvedValue(true);

            const result = await service.getData(originalMethod, key, params);

            expect(result).toEqual('new_data');
            expect(MemorySave.get).toHaveBeenCalledWith(key);
            expect(MemorySave.set).toHaveBeenCalledWith(key, 'new_data');
            expect(originalMethod).toHaveBeenCalledWith(...params);
        });
    });
});
