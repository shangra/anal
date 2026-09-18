const constants = require("../constants");

const Extensions = require("../../../core/class/Extensions.class");

const { isNil, iterateOverLargeArray } = require("../../utils/services");

class MaskClass extends Extensions {
    /**
     * @public
     * 
     * проходимся по данным и оставляем только те где [constants.noRefName] false
     * если таких нет то оставим [constants.noRefName] true
     * 
     * @param {object[]} rows
     * @param {string[]} fields
     */
    async parseRefs(rows, fields) {
        const mapping = {};

        const _ = await iterateOverLargeArray(rows, (row) => {
            const genKey = this.genKey(row, fields);

            if (!mapping[genKey] || mapping[genKey]?.[constants.noRefName]) {
                mapping[genKey] = row;
            }
        })

        return { rows: Object.values(mapping) };
    }

    /**
     * @private
     * 
     * генерим ключ маппинга
     * 
     * @param {object} row 
     * @param {string[]} fields 
     * 
     * @returns {string}
     */
    genKey(row, fields) {
        const keys = [];

        fields.forEach((field) => {
            if (!isNil(row[field])) {
                keys.push(row[field]);
            }
        });

        return keys.join('::');
    }
}

module.exports = MaskClass;