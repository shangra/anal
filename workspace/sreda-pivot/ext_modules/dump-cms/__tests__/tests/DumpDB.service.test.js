/*
Вот пример тестов для класса `DumpDBService`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/DumpDB.service.test.js` следующего содержания:


Эти тесты покрывают основные сценарии использования методов класса `DumpDBService`. Они проверяют успешное выполнение операций, обработку ошибок и граничные случаи.
*/

const DumpDBService = require('../../services/DumpDB.service');
const Model = require('../../services/model/DumpBD.model');
const connection = require('../../../core/db/connection');
const ApiError = require('../../../core/exceptions/ApiError');
const fs = require('fs/promises');

jest.mock('../../services/model/DumpBD.model');
jest.mock('../../../core/db/connection');
jest.mock('../../../core/exceptions/ApiError');

describe('Test for DumpDBService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GetTableList', () => {
        test('should return list of tables', async () => {
            Model.GetTableList.mockResolvedValue(['table1', 'table2']);
            const result = await DumpDBService.GetTableList();
            expect(result).toEqual(['table1', 'table2']);
        });
    });

    describe('Dump', () => {
        test('should dump specific table with where condition', async () => {
            Model.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
            const result = await DumpDBService.Dump({ table: 'users', where: { age: 30 } });
            expect(Model.findAll).toHaveBeenCalledWith('users', { age: 30 });
            expect(result).toEqual([{ id: 1 }, { id: 2 }]);
        });
    });

    describe('Restore', () => {
        test('should successfully restore from valid data', async () => {
            Model.restoreAll.mockResolvedValue(true);
            const result = await DumpDBService.Restore([{ id: 1 }, { id: 2 }]);
            expect(result).toEqual({ result: true, msg: 'ok' });
        });

        test('should handle error during restoration', async () => {
            Model.restoreAll.mockRejectedValue(new Error('Restoration failed'));
            const result = await DumpDBService.Restore([]);
            expect(result).toEqual({
                result: false,
                msg: 'Restoration failed',
            });
        });
    });

    describe('restoreFromStr', () => {
        test('should parse and restore from a valid JSON string', async () => {
            Model.restoreAll.mockResolvedValue(true);
            const result = await DumpDBService.restoreFromStr('[{"id":1},{"id":2}]');
            expect(result).toEqual({ result: true, msg: 'ok' });
        });

        test('should throw BadRequest on empty input', async () => {
            await expect(DumpDBService.restoreFromStr('')).rejects.toThrow(
                ApiError.BadRequest('Не переданы данные')
            );
        });
    });

    describe('restoreFromFile', () => {
        test('should restore from existing file', async () => {
            fs.promises.readFile.mockResolvedValue('[{"id":1},{"id":2}]');
            Model.getMeta.mockResolvedValue(null);
            Model.restoreAll.mockResolvedValue(true);
            const result = await DumpDBService.restoreFromFile('path/to/file.json');
            expect(result).toEqual({ result: true, msg: 'ok' });
        });

        test('should skip restoring if dump was previously loaded', async () => {
            fs.promises.readFile.mockResolvedValue('[{"id":1},{"id":2}]');
            Model.getMeta.mockResolvedValue({ hash: 'some-hash' });
            const result = await DumpDBService.restoreFromFile('path/to/file.json');
            expect(result).toEqual({ result: true, msg: 'Dump already loaded' });
        });
    });

    describe('restoreFromBuffer', () => {
        test('should restore from buffer', async () => {
            Model.getMeta.mockResolvedValue(null);
            Model.restoreAll.mockResolvedValue(true);
            const buffer = Buffer.from('[{"id":1},{"id":2}]');
            const result = await DumpDBService.restoreFromBuffer('buffer.json', buffer);
            expect(result).toEqual({ result: true, msg: 'ok' });
        });

        test('should skip restoring if dump was previously loaded', async () => {
            Model.getMeta.mockResolvedValue({ hash: 'some-hash' });
            const buffer = Buffer.from('[{"id":1},{"id":2}]');
            const result = await DumpDBService.restoreFromBuffer('buffer.json', buffer);
            expect(result).toEqual({ result: true, msg: 'Dump already loaded' });
        });
    });

    describe('checkMeta', () => {
        test('should return true if meta exists', async () => {
            Model.getMeta.mockResolvedValue({ hash: 'some-hash' });
            const result = await DumpDBService.checkMeta('some-hash');
            expect(result).toBeTruthy();
        });

        test('should return false if meta does not exist', async () => {
            Model.getMeta.mockResolvedValue(null);
            const result = await DumpDBService.checkMeta('non-existing-hash');
            expect(result).toBeFalsy();
        });
    });

    describe('setMeta', () => {
        test('should set metadata correctly', async () => {
            Model.setMeta.mockResolvedValue(true);
            const result = await DumpDBService.setMeta('new-hash', 'dump-name');
            expect(result).toBe(true);
        });
    });
});
