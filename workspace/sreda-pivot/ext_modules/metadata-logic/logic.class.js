const MemorySave = require('../core/services/memory-save');
const crypto = require('crypto');
const ApiError = require('../../core/exceptions/ApiError');

class LogicClass {
    async getOptionsForCheckPivot(options) {
        const newOptionsColumns = JSON.parse(JSON.stringify(options));
        newOptionsColumns.settings.index = newOptionsColumns.settings.columns;
        newOptionsColumns.settings.columns = [];

        const newOptionsIndex = JSON.parse(JSON.stringify(options));
        newOptionsIndex.settings.columns = [];

        return [newOptionsColumns, newOptionsIndex];
    }

    async checkMaxData(checkOptions, instance, getInfoservicesData, id, inputOptions, Layer) {
        for (const option of checkOptions) {
            const options = JSON.parse(JSON.stringify(inputOptions));
            options.settings.columns = option.settings.columns;
            options.settings.index = option.settings.index;
            options.withOutCount = false;
            options.withOutRefs = true;
            options.onlyCount = true;
            options.rowsCount = true;

            const str = `${id}__${JSON.stringify(options)}`;
            const strHash = crypto.createHash('md5').update(str).digest('hex');

            let count = await MemorySave.get(strHash);
            if (!count) {
                const res = await getInfoservicesData(id, options, Layer);
                count = res.count;
                await MemorySave.set(strHash, count);
            }
            if (count > 1000) {
                throw ApiError.BadRequest('Слишком много запрашиваемых данных');
            }
        }
    }
}

module.exports = LogicClass;
