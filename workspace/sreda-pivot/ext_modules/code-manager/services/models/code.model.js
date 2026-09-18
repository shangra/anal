const { Code } = sreda.models;
const { Op } = require('sequelize');
const CodeQueryDto = require('../../db/dtos/code-query-dto');

class codeModel {
    static async get(id, options = {}) {
        const formattedOptions = await CodeQueryDto.normalizeQuery(options.filter ?? {}, {
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
        return Code.findOne(extendedOptions);
    }

    static async getChildren(id, options = {}) {
        const formattedOptions = await CodeQueryDto.normalizeQuery(options.filter ?? {}, {
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
        return Code.findAll(extendedOptions);
    }

    static async getAllSettings() {
        return Code.findAll();
    }

    static async new(body) {
        const result = await Code.create(body);
        return result;
    }

    static async update(id, data) {
        await Code.update(data, { where: { id } });
        return { result: true };
    }

    static async del(id) {
        await Code.destroy({ where: { id } });
        return { result: true };
    }
}

module.exports = codeModel;
