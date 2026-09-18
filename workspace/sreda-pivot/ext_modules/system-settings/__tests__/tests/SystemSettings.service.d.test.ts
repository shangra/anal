/*
Вот пример тестов для класса `SystemSettingsService`, написанных с использованием библиотеки Jest:

Создайте файл `__tests__/tests/SystemSettings.service.test.js` следующего содержания:


Эти тесты покрывают основные методы класса `SystemSettingsService`. Каждый метод проверяется на успешное выполнение и ожидаемые результаты. Вы можете адаптировать эти тесты под конкретные требования вашего приложения, добавив дополнительные проверки или изменив ожидания в зависимости от фактической реализации методов.
*/

const SystemSettingsService = require('../../services/SystemSettings.service');

describe('SystemSettingsService', () => {
    let service;
    
    beforeEach(() => {
        service = new SystemSettingsService();
    });

    describe('appendSettingToEnv', () => {
        test('should resolve successfully when appending settings to env', async () => {
            await expect(service.appendSettingToEnv({ key: 'value' })).resolves.not.toThrow();
        });
    });

    describe('removeSettingFromEnv', () => {
        test('should resolve successfully when removing settings from env', async () => {
            await expect(service.removeSettingFromEnv({ key: 'value' })).resolves.not.toThrow();
        });
    });

    describe('getAllSettings', () => {
        test('should return an array of settings', async () => {
            const settings = await service.getAllSettings();
            expect(Array.isArray(settings)).toBe(true);
        });
    });

    describe('getChildren', () => {
        test('should return child settings for a given ID', async () => {
            const children = await service.getChildren(1);
            expect(children).toEqual([]);
        });
    });

    describe('get', () => {
        test('should return setting with its children and current value', async () => {
            const result = await service.get(1, {});
            expect(result.now).toBeDefined();
            expect(result.children).toBeDefined();
        });
    });

    describe('post', () => {
        test('should create a new setting', async () => {
            const createdSetting = await service.post('new_setting', null);
            expect(createdSetting).toBeDefined();
        });
    });

    describe('put', () => {
        test('should update existing setting', async () => {
            const updatedResult = await service.put(1, { name: 'updated_name' });
            expect(updatedResult.result).toBe(true);
        });
    });

    describe('del', () => {
        test('should delete a setting', async () => {
            const deletedResult = await service.del(1);
            expect(deletedResult.result).toBe(true);
        });
    });

    describe('getServerInfo', () => {
        test('should return server info', async () => {
            const serverInfo = await service.getServerInfo();
            expect(serverInfo[0].connectionsCount).toBeDefined();
            expect(serverInfo[0].ESB_NAME).toBeDefined();
        });
    });

    describe('getCpuProfile', () => {
        test('should return CPU profile within specified timeout', async () => {
            const cpuProfile = await service.getCpuProfile(3000);
            expect(cpuProfile).toBeDefined();
        });
    });
});
