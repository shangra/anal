const StoreModel = require('./models/Store.model');
const httpContext = require('../../../core/services/http-context');
const Extensions = require('../../../core/class/Extensions.class');

class StoreService extends Extensions {
    async setData(key, value) {
        const sessionStorage = httpContext.get('sessionStorage');
        let result = { result: false };
        if (sessionStorage && sessionStorage.user && sessionStorage.user.id) {
            // Это пользователь, запишем его данные в БД
            const userID = sessionStorage.user.id;
            result = await StoreModel.setValue(key, value, userID);
        }
        return result;
    }

    async getData(key) {
        const sessionStorage = httpContext.get('sessionStorage');
        const result = { result: false };
        if (sessionStorage && sessionStorage.user && sessionStorage.user.id) {
            // Это пользователь, запишем его данные в БД
            const userID = sessionStorage.user.id;
            const data = await StoreModel.getValue(key, userID);
            if (data) {
                result.result = true;
                result.value = data.value;
            }
        }
        return result;
    }

    async getAllData() {
        const sessionStorage = httpContext.get('sessionStorage');
        const result = { result: false };
        if (sessionStorage && sessionStorage.user && sessionStorage.user.id) {
            // Это пользователь, запишем его данные в БД
            const userID = sessionStorage.user.id;
            const data = await StoreModel.getValues(userID);

            const objectKeys = {};
            data.map((item) => {
                objectKeys[item.key] = item.value;
            });

            result.result = true;
            result.value = objectKeys;
        }
        return result;
    }

    async getUserDataByKey(key) {
        let result = { result: false };
        const sessionStorage = httpContext.get('sessionStorage');
        if (key) {
            const resultStore = await this.getData(key);
            if (resultStore.result) {
                // Если что-то вернулось из БД вернем именно это
                result = { result: true, data: resultStore.value };
            } else {
                // если в Store данные отсутствую, смотрим в сессии
                result = { result: !!sessionStorage[key], data: sessionStorage[key] };
            }
        }
        return result;
    }

    async setUserDataByKey(key, value) {
        await this.setData(key, value);
        await this.saveInSession({ [key]: value });
        return { result: true };
    }

    async getAllUserData() {
        let result;
        // получение всех данных пользователя из Store
        const resultStore = await this.getAllData();

        const sessionStorage = httpContext.get('sessionStorage');

        if (resultStore.result) {
            // Если что-то вернулось из БД вернем именно это
            result = { result: true, ...sessionStorage, ...resultStore.value };
            // обновление данных в сессии, согласно данным из Store
            await this.saveInSession(result);
        } else {
            result = { result: true, ...sessionStorage };
        }
        return result;
    }

    async saveInSession(data) {
        for (const [key, value] of Object.entries(data)) {
            const sessionStorage = httpContext.get('sessionStorage');
            sessionStorage[key] = value;
            httpContext.set('sessionStorage', sessionStorage);
        }
    }

    async getAllValuesByKey(key, createdUser = undefined) {
        const result = { result: false };
        const data = await StoreModel.getAllValuesByKey(key, createdUser);
        if (data) {
            result.result = true;
            result.value = data.map((item) => item.value);
        }
        return result;
    }
}

module.exports = StoreService;
