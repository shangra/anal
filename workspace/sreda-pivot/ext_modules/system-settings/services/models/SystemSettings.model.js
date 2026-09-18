const { SystemSettings } = sreda.models;
const { Op } = require('sequelize');
const SystemSettingsQueryDto = require('../../db/dtos/systemSettings-query-dto');

class SystemSettingsModel {
    static async get(id, options = {}) {
        const formattedOptions = await SystemSettingsQueryDto.normalizeQuery(options.filter ?? {}, {
            searchOff: true,
        });
        const currentOptions = {
            where: {
                id,
            },
            order: [['name', 'ASC']],
            all: true,
        };
        const extendedOptions = await formattedOptions.getOptions(currentOptions);
        return SystemSettings.findOne(extendedOptions);
    }

    static async getChildren(id, options = {}) {
        const formattedOptions = await SystemSettingsQueryDto.normalizeQuery(options.filter ?? {}, {
            searchOff: true,
        });
        const currentOptions = {
            where: {
                parent: id,
                id: {
                    [Op.ne]: '00000000-0000-0000-0000-000000000000',
                },
            },
            order: [['name', 'ASC']],
            all: true,
        };
        const extendedOptions = await formattedOptions.getOptions(currentOptions);
        return SystemSettings.findAll(extendedOptions);
    }

    static async getAllSettings() {
        return SystemSettings.findAll();
    }

    static async new(body) {
        const result = await SystemSettings.create(body);
        return result;
    }

    static async update(id, data) {
        await SystemSettings.update(data, { where: { id } });
        return { result: true };
    }

    static async del(id) {
        await SystemSettings.destroy({ where: { id }, force: true });
        return { result: true };
    }
}

module.exports = SystemSettingsModel;
