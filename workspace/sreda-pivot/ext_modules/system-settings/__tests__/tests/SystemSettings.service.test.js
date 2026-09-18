/*
Вот пример тестов для класса `SystemSettingsService`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/SystemSettings.service.test.js` следующего содержания:


Эти тесты покрывают основные методы сервиса, проверяя взаимодействие с моделью данных, работу с переменными окружения и обработку различных сценариев.
*/

const SystemSettingsService = require('../../services/SystemSettings.service');
const SystemSettingsModel = require('../../services/models/SystemSettings.model');
const SystemSettingsDto = require('../../services/db/dtos/systemSettings.dto');
const GlobalService = require('../../../core/services/Global.service');

jest.mock('../../services/models/SystemSettings.model');
jest.mock('../../services/db/dtos/systemSettings.dto');
jest.mock('../../../core/services/Global.service');

describe('SystemSettingsService', () => {
    let service;
    
    beforeEach(() => {
        service = new SystemSettingsService();
    });

    describe('appendSettingToEnv', () => {
        test('should update environment variables correctly', async () => {
            const settings = [
                { name: 'TEST_SETTING_1', value: 'value1' },
                { name: 'TEST_SETTING_2', value: '{"key":"value"}', type: '55a33e2d-cb18-4486-80d7-9b7b25909031' }
            ];
            
            jest.spyOn(GlobalService, 'ParamJSON').mockReturnValue({ key: 'value' });

            await service.appendSettingToEnv(settings);

            expect(process.env.TEST_SETTING_1).toEqual('value1');
            expect(sreda.env.TEST_SETTING_1).toEqual('value1');
            expect(process.env.TEST_SETTING_2).toEqual('{"key":"value"}');
            expect(sreda.env.TEST_SETTING_2).toEqual({ key: 'value' });
        });
    });

    describe('removeSettingFromEnv', () => {
        test('should remove environment variables correctly', async () => {
            process.env.TEST_SETTING_1 = 'value1';
            sreda.env.TEST_SETTING_1 = 'value1';

            const settings = [{ name: 'TEST_SETTING_1' }];

            await service.removeSettingFromEnv(settings);

            expect(process.env.TEST_SETTING_1).toBeUndefined();
            expect(sreda.env.TEST_SETTING_1).toBeUndefined();
        });
    });

    describe('getAllSettings', () => {
        test('should retrieve all settings from model', async () => {
            SystemSettingsModel.getAllSettings.mockResolvedValue([{ id: 1, name: 'setting1' }]);

            const result = await service.getAllSettings();

            expect(result).toEqual([{ id: 1, name: 'setting1' }]);
        });
    });

    describe('getChildren', () => {
        test('should retrieve child settings from model', async () => {
            SystemSettingsModel.getChildren.mockResolvedValue([{ id: 2, name: 'child1' }]);

            const result = await service.getChildren(1);

            expect(result).toEqual([{ id: 2, name: 'child1' }]);
        });
    });

    describe('get', () => {
        test('should retrieve setting with related information', async () => {
            SystemSettingsModel.get.mockResolvedValueOnce({
                id: 1,
                name: 'parent',
                parent: null,
            });
            SystemSettingsModel.get.mockResolvedValueOnce({
                id: 1,
                name: 'current',
                parent: null,
            });
            SystemSettingsModel.getChildren.mockResolvedValue([]);

            const result = await service.get(1);

            expect(result.now).toBeDefined();
            expect(result.children).toEqual([]);
        });
    });

    describe('post', () => {
        test('should create a new setting', async () => {
            SystemSettingsModel.new.mockResolvedValue({ id: 1 });

            const result = await service.post('new_setting', 1);

            expect(result).toHaveProperty('id', 1);
        });
    });

    describe('put', () => {
        test('should update an existing setting and append to env', async () => {
            SystemSettingsModel.update.mockResolvedValue({ id: 1 });

            const result = await service.put(1, {});

            expect(result).toHaveProperty('id', 1);
        });
    });

    describe('del', () => {
        test('should delete a setting and remove from env', async () => {
            SystemSettingsModel.get.mockResolvedValue({ id: 1, name: 'SETTING_TO_DELETE' });
            SystemSettingsModel.del.mockResolvedValue(true);

            const result = await service.del(1);

            expect(result).toBeTruthy();
            expect(process.env.SETTING_TO_DELETE).toBeUndefined();
            expect(sreda.env.SETTING_TO_DELETE).toBeUndefined();
        });
    });

    describe('getServerInfo', () => {
        test('should return server info', async () => {
            const result = await service.getServerInfo();

            expect(result).toHaveProperty(`${sreda.env.SERVICE_NAME}`);
        });
    });

    describe('getCpuProfile', () => {
        test('should capture CPU profile within specified time', async () => {
            const result = await service.getCpuProfile(100);

            expect(result).toBeDefined();
        });
    });
});
