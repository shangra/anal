const Model = require('./model/DumpBD.model');
const fs = require('fs');
const crypto = require('crypto');
const connection = require('../../../core/db/connection');
const ApiError = require('../../../core/exceptions/ApiError');

class DumpDBService {
    static async GetTableList() {
        return Model.GetTableList();
    }

    static async Dump(params) {
        const tableName = params.table ?? '';
        const where = params.where;
        return Model.findAll(tableName, where);
    }

    static async Restore(data) {
        const transaction = await connection.transaction({ transaction: null });

        const transactionComplete = await Model.restoreAll(data, {
            transaction,
        });
        const result =
            transactionComplete !== true
                ? { result: false, msg: transactionComplete.stack }
                : { result: true, msg: 'ok' };
        return result;
    }

    static async restoreFromStr(str) {
        let result;
        let json = str;
        if (typeof json !== 'object') {
            // удаляет символы пустых пробелов
            const formattedStr = str.replaceAll(/[\u200B-\u200D\uFEFF]/g, '');
            if (!formattedStr) {
                throw ApiError.BadRequest('Не переданы данные');
            }

            json = JSON.parse(formattedStr);
        }
        result = await this.Restore(json);
        return result;
    }

    static async restoreFromFile(filePath) {
        let result;
        const fileData = await fs.promises.readFile(filePath, 'utf8');
        const name = filePath.split('/').reverse()[0] ?? '';

        const strHash = crypto.createHash('md5').update(fileData).digest('hex');
        console.log('hash:', strHash);

        const isDumpLoaded = await DumpDBService.checkMeta(strHash);
        if (isDumpLoaded) {
            result = { result: true, msg: 'Dump already loaded' };
        } else {
            result = await this.restoreFromStr(fileData);
            if (result.result) {
                await this.setMeta(strHash, name);
            }
        }
        return result;
    }

    static async restoreFromBuffer(name, buffer) {
        let result;

        const strHash = crypto.createHash('md5').update(buffer).digest('hex');
        console.log('hash:', strHash);

        const isDumpLoaded = await DumpDBService.checkMeta(strHash);
        if (isDumpLoaded) {
            result = { result: true, msg: 'Dump already loaded' };
        } else {
            result = await this.restoreFromStr(buffer);
            if (result.result) {
                await this.setMeta(strHash, name);
            }
        }
        return result;
    }

    static async checkMeta(hash) {
        const item = await Model.getMeta(hash);
        return !!item;
    }

    static async setMeta(hash, name = '') {
        return Model.setMeta(hash, name);
    }
}

module.exports = DumpDBService;
