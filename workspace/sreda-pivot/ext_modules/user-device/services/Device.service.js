const StoreModel = require('../../store/services/models/Store.model');
// const httpContext = require('express-http-context');
const httpContext = require('../../../core/services/http-context');

class DeviceService {
    userDevicesKey = 'user-devices';

    async addUserDevice(userId, device) {
        let result = { result: false };
        if (userId) {
            const key = this.userDevicesKey;
            const value = await StoreModel.getValue(key, userId);
            const userDevices = value?.value ?? {};
            if (!userDevices[device.id]) {
                userDevices[device.id] = device;
                await StoreModel.setValue(key, userDevices, userId);
            }
            result = { result: true };
        }
        return result;
    }

    async delUserDevice(userId, device) {
        const key = this.userDevicesKey;
        const value = await StoreModel.getValue(key, userId);
        const userDevices = value?.value ?? {};
        delete userDevices[device.id];
        const result = await StoreModel.setValue(key, userDevices, userId);
        return result;
    }

    async getUserDevices(userId) {
        const devices = await StoreModel.getValue(this.userDevicesKey, userId);
        return devices ? devices.value : [];
    }

    async applyDevice(sourceDevice) {
        const sessionStorage = httpContext.get('sessionStorage');
        const userId = sessionStorage.user.id;
        const currDevice = sessionStorage.deviceId;
        const settings = await StoreModel.getSettings(sourceDevice, userId);
        const parsedSettings = settings.map((setting) => {
            const newSetting = StoreModel.convertStringToObject(setting);
            const newKey = `${newSetting.key.split('_')[0]}_${currDevice}`;
            const { value } = newSetting;
            return { key: newKey, value };
        });

        // сохраняем измененные настройки в бд
        const promises = parsedSettings.map((setting) =>
            StoreModel.setValue(setting.key, setting.value, userId)
        );
        await Promise.all(promises);

        return parsedSettings;
    }
}

module.exports = DeviceService;
