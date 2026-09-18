const SystemSettingsModel = require('./models/SystemSettings.model');
const Extensions = require('../../../core/class/Extensions.class');
const SystemSettingsDto = require('../db/dtos/systemSettings.dto');
const GlobalService = require('../../../core/services/Global.service');
const inspector = require('node:inspector');
const timers = require('timers');

class SystemSettingsService extends Extensions {
    async appendSettingToEnv(settings) {
        const env = {};
        const processEnvdb = {};

        for (const item of settings) {
            processEnvdb[item.name.toUpperCase()] = item.value; // так строкой и запишем

            let value;
            switch (item.type) {
                case '55a33e2d-cb18-4486-80d7-9b7b25909031': {
                    value = GlobalService.ParamJSON(item.value);
                    break;
                }
                case '2fc57216-2d3b-44f9-92ab-503e6d851670': {
                    value = GlobalService.ParamJSON(item.value);
                    break;
                }
                default: {
                    value = item.value;
                }
            }

            env[item.name.toUpperCase()] = value; // в глобале можно хранить разобранные настройки
        }

        process.env = { ...process.env, ...processEnvdb };
        sreda.env = { ...sreda.env, ...env };
    }

    async removeSettingFromEnv(settings) {
        for (const item of settings) {
            const name = item.name.toUpperCase();
            delete process.env[name];
            delete sreda.env[name];
        }
    }

    async getAllSettings() {
        return SystemSettingsModel.getAllSettings();
    }

    async getChildren(id) {
        return SystemSettingsModel.getChildren(id);
    }

    async get(id, options) {
        let nowObject = await SystemSettingsModel.get(id, options);
        nowObject = Object(new SystemSettingsDto(nowObject));
        const parentInfo = await SystemSettingsModel.get(nowObject.parent, options);
        nowObject.ParentInfo = {
            id: parentInfo.id,
            name: parentInfo.name,
            parent: parentInfo.parent,
        };
        const children = await SystemSettingsModel.getChildren(id, options);
        return {
            now: nowObject,
            children,
        }; // Object(new SystemSettingsDto(nowObject));
    }

    async post(name, parent) {
        // let data = Object(new SystemSettingsDto(body));
        const data = {
            name,
            description: name,
            parent,
            type: 'f9a427f9-956c-4367-a0bd-719fa1f54ba1',
            value: '',
        };
        const result = await SystemSettingsModel.new(data);
        return result;
    }

    async put(id, body) {
        const data = Object(new SystemSettingsDto(body));

        await this.appendSettingToEnv([data]);

        const result = await SystemSettingsModel.update(id, data);
        return result;
    }

    async del(id) {
        // Удалим настройку из env'a
        const data = await SystemSettingsModel.get(id);
        if (data) {
            await this.removeSettingFromEnv([data]);
        }
        const result = await SystemSettingsModel.del(id);
        return result;
    }

    async getServerInfo() {
        const serverEsbName =
            sreda.env.ESB_NAME ?? `${sreda.env.SERVICE_NAME} -  ESB_NAME в .env не задано`;
        return {
            [serverEsbName]: {
                connectionsCount: sreda.server.connections?.size ?? 0,
                ESB_NAME: sreda.env.ESB_NAME,
                SERVICE_NAME: sreda.env.SERVICE_NAME,
            },
        };
    }

    async getCpuProfile(timeout) {
        const session = new inspector.Session();
        session.connect();

        session.post('Profiler.enable', () => {
            session.post('Profiler.start');
        });

        const profileData = await new Promise((resolve, reject) => {
            timers.setTimeout(() => {
                session.post('Profiler.stop', (err, { profile }) => {
                    if (!err) {
                        resolve(profile);
                    } else {
                        reject(err);
                    }
                });
            }, timeout);
        });

        session.disconnect();
        return profileData;
    }
}

const getDBEnv = async () => {
    try {
        const SystemSettingsServiceInstance = new SystemSettingsService();
        const settings = await SystemSettingsServiceInstance.getAllSettings();
        await SystemSettingsServiceInstance.appendSettingToEnv(settings);
    } catch (err) {
        console.error(`Не удалось загрузить системные настройки`, err.message);
    }
};
getDBEnv()
    .then(() => {
        console.debug('!!! Загрузили системные настройки !!!');
        console.debug(sreda.env);
    })
    .catch((err) => {
        console.error('!!! Ошибка инициализации системных настроек !!!', err);
    });

module.exports = SystemSettingsService;
