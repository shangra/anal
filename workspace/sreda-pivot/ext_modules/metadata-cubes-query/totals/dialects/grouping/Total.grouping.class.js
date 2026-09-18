/**
 * @typedef {import("../../../select/types").ISettings} ISettings
 * @typedef {import("../../../../../core/db/types").TField} TField
 * @typedef {import("../../../../../core/db/types").TAggField} TAggField
 * @typedef {import("../../../../metadata-connector/services/metadata/Connector.class").IConnector} IConnector
 * @typedef {import("../../../../metadata-connector/services/metadata/connectors/AbstractConnector").CastTypeI} CastTypeI
 */

const TotalClass = require("../base/Total.class");

const constants = require("../../../constants");

const { getLast: last, arrayGenerator, isEmptyObject, isNil } = require("../../../../utils/services");

const { literal } = require("sequelize");

const uuid = require('uuid');

class TotalGroupingClass extends TotalClass {
    /**
     * @param {Object} meta 
     * @param {IConnector} meta.connector 
     * @param {object} meta.treeObject 
     * @param {{ field: string }} meta.dateDimension 
     */
    constructor(meta) {
        super(meta);
    }

    static rank = 0;

    /**
     * @public
     * 
     * @param {object} param0
     * @param {ISettings} param0.options 
     * @param {IConnector} param0.connector
     * @returns 
     */
    isValid({ connector, options }) {
        return constants.GROUPING_SET_CONNECTOR_TYPES.includes(connector.name)
            &&
            !options.attributes.some(
                attr => constants.SEMI_ADDITIVE.includes(/** @type {TAggField} */(attr).func)
            );
    }

    /**
     * @public
     * 
     * получаем массив данных и раскидывем их по тегам типа данных
     * 
     * если тем main возвращаем его как основные данные
     * 
     * *костыльно получается*
     * 
     * @param {({ __type__: string })[]} rows
     * @param {ISettings} options 
     * @param {object} treeObject
     */
    async parse(rows, options, treeObject) {

        const [index] = options.settings.index;
        const [column] = options.settings.columns;

        const gen = arrayGenerator(rows);

        const indexNullVal = this.getNullVal(treeObject?.Fields?.[index]?.type);
        const columnNullVal = this.getNullVal(treeObject?.Fields?.[column]?.type);

        /** @type {object[]} */
        const lrows = [];

        const totals = {};

        for (const row of gen) {
            if (this.isNull(row[index], indexNullVal) && this.isNull(row[column], columnNullVal)) {
                totals[constants.totals] ||= [];
                totals[constants.totals].push(row);

                continue;
            }

            if (this.isNull(row[index], indexNullVal)) {
                totals[constants.columns] ||= [];
                totals[constants.columns].push(row);

                continue;
            }

            if (this.isNull(row[column], columnNullVal)) {
                totals[constants.indexes] ||= [];
                totals[constants.indexes].push(row);

                continue;
            }

            lrows.push(row);
        }

        return { rows: lrows, totals }
    }

    /**
     * @private
     * 
     * @param {*} val 
     * @param {*} typeNull 
     * @returns 
     */
    isNull(val, typeNull) {
        // return isNil(val) || val === typeNull;
        return isNil(val);
    }

    /**
     * @private
     * 
     * @param {string} type 
     * @returns {any}
     */
    getNullVal(type) {
        const ltype = (type || 'TEXT').toUpperCase();
        /** @type {any} */
        let res = '';

        if (['FLOAT', 'INTEGER'].includes(ltype)) {
            res = 0;
        }

        if (['DATE', 'DATETIME', 'TIMESTAMP'].includes(ltype)) {
            res = '1970-01-01';
        }

        if (['UUID', 'REF'].includes(ltype)) {
            res = uuid.NIL;
        }

        return res;
    }

    /**
     * @public
     * 
     * @param {Object} param0 
     * @param {ISettings} param0.options 
     * @param {object[]} param0.levels 
     * @param {boolean} param0.isSemi 
     * @param {Record<string, string>} param0.mappedFuncs 
     * 
     * @returns {Record<string, object[]>}
     */
    totals({ options, levels }) {
        const layer = last(levels);

        const [index] = options.settings.index;
        const [column] = options.settings.columns;

        const selectedTotals = options.totals;

        if (isEmptyObject(selectedTotals)) {
            layer.attributes = this.sortAttributes(layer.attributes || []);

            return { [constants.main]: levels }
        }

        const str = [`("${index}", "${column}")`];

        selectedTotals.columns && str.push(`("${index}")`);
        selectedTotals.indexes && str.push(`("${column}")`);
        selectedTotals.totals && str.push(`()`);

        layer.attributes = this.sortAttributes(layer.attributes || []);
        layer.group = [literal(`GROUPING SETS(${str.join(', ')})`)];

        return { [constants.main]: levels };
    }
}

module.exports = TotalGroupingClass;