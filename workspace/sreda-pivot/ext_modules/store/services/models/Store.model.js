const { Store } = sreda.models;
const { Op } = require('sequelize');

class StoreModel {
    static convertStringToObject(item) {
        let newItem = item;
        if (item.typeValue === 'object') {
            const parsedValue = JSON.parse(item.value);
            newItem = { ...item, value: parsedValue };
        }
        return newItem;
    }

    static async getValues(userId) {
        const result = await Store.findAll({
            where: {
                createdUser: userId,
            },
        });
        const values = result.map((value) => StoreModel.convertStringToObject(value));
        return values;
    }

    static async getValue(key, userId) {
        const result = await Store.findOne({
            where: {
                key,
                createdUser: userId,
            },
        });
        return result ? StoreModel.convertStringToObject(result) : result;
    }

    static async hasValue(key, userId) {
        const result = await Store.findOne({
            attributes: ['key'],
            where: {
                key,
                createdUser: userId,
            },
        });
        return !!result;
    }

    static async delValue(key, userId) {
        const result = await Store.destroy({
            attributes: ['key'],
            where: {
                key,
                createdUser: userId,
            },
        });
        return !!result;
    }

    static async delValueNotIn(key, userId) {
        const result = await Store.destroy({
            attributes: ['key'],
            where: {
                key: { [Op.notIn]: key },
                createdUser: userId,
            },
        });
        return !!result;
    }

    static async setValue(key, value, userId) {
        const result = { result: false };

        let typeValue = 'text';
        let realValue = value;
        if (typeof value === 'object') {
            realValue = JSON.stringify(value);
            typeValue = 'object';
        }
        const findValue = await this.hasValue(key, userId);

        if (findValue) {
            await Store.update(
                {
                    key,
                    value: realValue,
                    typeValue,
                },
                {
                    where: {
                        key,
                        createdUser: userId,
                    },
                }
            );
            result.result = true;
        } else {
            await Store.create({
                key,
                value: realValue,
                typeValue,
                createdUser: userId,
            });
            result.result = true;
        }

        return result;
    }

    static async getSettings(deviceId, userId) {
        return Store.findAll({
            where: {
                createdUser: userId,
                key: {
                    [Op.iLike]: `%_${deviceId}`,
                },
            },
        });
    }

    static async getAllValuesByKey(key, createdUser = undefined) {
        const result = await Store.findAll({
            where: {
                key,
                ...(createdUser ? { createdUser } : {}),
            },
            raw: true,
        });
        const values = result
            ? result.map((item) => StoreModel.convertStringToObject(item))
            : result;
        return values;
    }
}

module.exports = StoreModel;
