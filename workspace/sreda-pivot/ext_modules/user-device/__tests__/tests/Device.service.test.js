/*
Вот пример тестов для класса `DeviceService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Device.service.test.js` следующего содержания:


Эти тесты покрывают основные сценарии использования методов класса `DeviceService`. Они проверяют успешное добавление устройства, удаление существующего устройства, получение списка устройств пользователя и применение настроек устройства.
*/

const DeviceService = require('../../services/Device.service');
const StoreModel = require('../../store/services/models/Store.model');
const httpContext = require('../../../core/services/http-context');

jest.mock('../../store/services/models/Store.model');
jest.mock('../../../core/services/http-context');

describe('DeviceService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DeviceService();
    });

    describe('addUserDevice', () => {
        it('should successfully add a new device for a user', async () => {
            const userId = '123';
            const device = { id: 'device1' };

            StoreModel.getValue.mockResolvedValueOnce({ value: {} });
            StoreModel.setValue.mockResolvedValueOnce(true);

            const result = await service.addUserDevice(userId, device);

            expect(result.result).toBe(true);
            expect(StoreModel.getValue).toHaveBeenCalledWith(
                service.userDevicesKey,
                userId
            );
            expect(StoreModel.setValue).toHaveBeenCalledWith(
                service.userDevicesKey,
                { device1: device },
                userId
            );
        });

        it('should not add an existing device', async () => {
            const userId = '123';
            const device = { id: 'device1' };

            StoreModel.getValue.mockResolvedValueOnce({
                value: { device1: device },
            });

            const result = await service.addUserDevice(userId, device);

            expect(result.result).toBe(false);
            expect(StoreModel.setValue).not.toHaveBeenCalled();
        });
    });

    describe('delUserDevice', () => {
        it('should successfully remove a device from a user', async () => {
            const userId = '123';
            const device = { id: 'device1' };

            StoreModel.getValue.mockResolvedValueOnce({
                value: { device1: device },
            });
            StoreModel.setValue.mockResolvedValueOnce(true);

            const result = await service.delUserDevice(userId, device);

            expect(result).toBe(true);
            expect(StoreModel.getValue).toHaveBeenCalledWith(
                service.userDevicesKey,
                userId
            );
            expect(StoreModel.setValue).toHaveBeenCalledWith(
                service.userDevicesKey,
                {},
                userId
            );
        });
    });

    describe('getUserDevices', () => {
        it('should retrieve user devices correctly', async () => {
            const userId = '123';
            const devices = [{ id: 'device1' }, { id: 'device2' }];

            StoreModel.getValue.mockResolvedValueOnce({ value: devices });

            const result = await service.getUserDevices(userId);

            expect(result).toEqual(devices);
            expect(StoreModel.getValue).toHaveBeenCalledWith(
                service.userDevicesKey,
                userId
            );
        });

        it('should return empty array when no devices found', async () => {
            const userId = '123';

            StoreModel.getValue.mockResolvedValueOnce(null);

            const result = await service.getUserDevices(userId);

            expect(result).toEqual([]);
            expect(StoreModel.getValue).toHaveBeenCalledWith(
                service.userDevicesKey,
                userId
            );
        });
    });

    describe('applyDevice', () => {
        it('should apply device settings correctly', async () => {
            const sourceDevice = 'source_device_id';
            const userId = '123';
            const currDevice = 'current_device_id';
            const settings = [
                { key: 'key1_source_device_id', value: 'value1' },
                { key: 'key2_source_device_id', value: 'value2' },
            ];

            httpContext.get.mockReturnValue({
                sessionStorage: {
                    user: { id: userId },
                    deviceId: currDevice,
                },
            });

            StoreModel.getSettings.mockResolvedValueOnce(settings);
            StoreModel.convertStringToObject.mockImplementation((obj) => obj); // Mock identity conversion
            StoreModel.setValue.mockResolvedValue(true);

            const result = await service.applyDevice(sourceDevice);

            expect(result).toEqual([
                { key: 'key1_current_device_id', value: 'value1' },
                { key: 'key2_current_device_id', value: 'value2' },
            ]);

            expect(StoreModel.getSettings).toHaveBeenCalledWith(
                sourceDevice,
                userId
            );
            expect(StoreModel.setValue).toHaveBeenCalledTimes(2);
        });
    });
});
