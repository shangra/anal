/*
Вот пример тестов для вашего модуля `codeService` с использованием библиотеки Jest:

Создайте файл `code.service.test.js` в директории `__tests__/tests`.


Эти тесты покрывают основные методы сервиса, проверяя взаимодействие с моделью и выполнение основных операций. Тесты используют мокирование модели для изоляции зависимостей и проверки поведения самого сервиса.
*/

const CodeService = require('../../services/code.service');
const Model = require('../../services/models/code.model');

jest.mock('../../services/models/code.model');

describe('Test code service methods', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getAllSettings should return settings from model', async () => {
        Model.getAllSettings.mockResolvedValue([
            { key: 'setting1', value: 'value1' },
            { key: 'setting2', value: 'value2' },
        ]);

        const service = new CodeService();
        const result = await service.getAllSettings();

        expect(result.length).toEqual(2);
        expect(Model.getAllSettings).toHaveBeenCalledTimes(1);
    });

    test('getChildren should return children from model', async () => {
        Model.getChildren.mockResolvedValue([1, 2, 3]);

        const service = new CodeService();
        const result = await service.getChildren(1);

        expect(result).toEqual([1, 2, 3]);
        expect(Model.getChildren).toHaveBeenCalledWith(1);
    });

    test('getMain should return main object from model', async () => {
        Model.get.mockResolvedValue({ id: 1, name: 'main' });

        const service = new CodeService();
        const result = await service.getMain(1);

        expect(result).toEqual({ id: 1, name: 'main' });
        expect(Model.get).toHaveBeenCalledWith(1, {});
    });

    test('get should return extended object with ParentInfo and children', async () => {
        Model.get
            .mockResolvedValueOnce({ id: 1, name: 'child', parent: 2 })
            .mockResolvedValueOnce({ id: 2, name: 'parent', parent: null });
        Model.getChildren.mockResolvedValue([]);

        const service = new CodeService();
        const result = await service.get(1, {});

        expect(result.now.id).toEqual(1);
        expect(result.now.ParentInfo.id).toEqual(2);
        expect(result.children).toEqual([]);
    });

    test('post should create new record via model', async () => {
        Model.new.mockResolvedValue({ id: 1, name: 'newRecord' });

        const service = new CodeService();
        const result = await service.post({ name: 'newRecord' });

        expect(result.id).toEqual(1);
        expect(Model.new).toHaveBeenCalledWith({ name: 'newRecord' });
    });

    test('copy should duplicate existing record', async () => {
        Model.get.mockResolvedValue({ id: 1, name: 'oldName', parent: 2 });
        Model.new.mockResolvedValue({ id: 2, name: 'newName' });

        const service = new CodeService();
        const result = await service.copy({ id: 1, name: 'newName' });

        expect(result.id).toEqual(2);
        expect(Model.get).toHaveBeenCalledWith(1);
        expect(Model.new).toHaveBeenCalledWith({ name: 'newName', parent: 2 });
    });

    test('put should update existing record', async () => {
        Model.update.mockResolvedValue({ id: 1, updated: true });

        const service = new CodeService();
        const result = await service.put(1, { name: 'updatedName' });

        expect(result.updated).toEqual(true);
        expect(Model.update).toHaveBeenCalledWith(1, { name: 'updatedName' });
    });

    test('del should remove record', async () => {
        Model.del.mockResolvedValue({ deleted: true });

        const service = new CodeService();
        const result = await service.del(1);

        expect(result.deleted).toEqual(true);
        expect(Model.del).toHaveBeenCalledWith(1);
    });

    test('runCode should execute provided code', async () => {
        const service = new CodeService();
        const result = await service.runCode('return "Hello World";', {}, {});

        expect(result).toEqual('Hello World');
    });

    test('consoleLog should handle different types of arguments', async () => {
        const service = new CodeService();
        const acc = { log: '', error: '' };

        await service.consoleLog(acc, 'log', ['simple message']);
        await service.consoleLog(acc, 'error', [
            { name: 'TypeError', stack: 'stack trace', message: 'error message' },
        ]);

        expect(acc.log).toEqual('simple message\n');
        expect(acc.error).toEqual('stack trace\nerror message\n');
    });

    test('run should execute code and capture console output', async () => {
        Model.get.mockResolvedValue({ codeSource: 'return "Executed!";' });

        const service = new CodeService();
        const result = await service.run(1, {});

        expect(result.result).toEqual('Executed!');
        expect(typeof result.consoleHok).toEqual('object');
    });
});
