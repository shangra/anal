/**
 * @typedef {import("../../../select/types").ISettings} ISettings
 * @typedef {import("../../../../../core/db/types").TField} TField
 * @typedef {import("../../../../../core/db/types").TAggField} TAggField
 * @typedef {import("../../../../metadata-connector/services/metadata/Connector.class").IConnector} IConnector
 * @typedef {import("../../../../metadata-connector/services/metadata/connectors/AbstractConnector").CastTypeI} CastTypeI
 */

const constants = require("../../../constants");

const { getLast: last, iterateOverLargeArray } = require("../../../../utils/services");

class TotalClass {
    /**
     * @param {Object} param0 
     * @param {IConnector} param0.connector 
     * @param {object} param0.treeObject 
     * @param {{ field: string }} param0.dateDimension 
     */
    constructor({ connector, treeObject, dateDimension }) {
        this.connector = connector;
        this.treeObject = treeObject;
        this.dateDimension = dateDimension;
    }

    static rank = 1;

    /**
     * @public
     * 
     * @param {*} param0 
     * @returns 
     */
    isValid({ }) { return true }

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
        /** @type {object[]} */
        const lrows = [];

        const totals = {};

        for (const key in options?.totals || {}) {
            totals[key] = [];
        }

        const _ = await iterateOverLargeArray(rows, (row) => {
            if (row[constants.typeField] === constants.main) {
                lrows.push(row);

                return;
            }

            totals[row[constants.typeField]] ||= [];
            totals[row[constants.typeField]].push(row);
        });

        return { rows: lrows, totals }
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
    totals({ options, levels, isSemi, mappedFuncs }) {
        const [index] = options.settings.index;
        const [column] = options.settings.columns;

        const selectedTotals = options.totals;

        // последний уровень агрегации
        const aggLevel = last(levels);

        const hideAttr = [
            { ignoreFields: [], name: constants.main },
        ];

        selectedTotals?.[constants.columns] && hideAttr.push({ ignoreFields: [column], name: constants.indexes });
        selectedTotals?.[constants.indexes] && hideAttr.push({ ignoreFields: [index], name: constants.columns });
        selectedTotals?.[constants.totals] && hideAttr.push({ ignoreFields: [index, column], name: constants.totals });

        /** @type {Record<string, object[]>} */
        const totals = {};

        hideAttr.forEach((hideAttr) => {
            const layer = structuredClone(aggLevel);
            let allLevels = structuredClone(levels);

            const { ignoreFields, name } = hideAttr;

            allLevels = allLevels.map((level) => this.mutateFields(level, ignoreFields, isSemi));

            // ===================== add tech fields ======================================
            layer.attributes.push([`'${name}'`, constants.typeField]);
            ignoreFields.forEach((field) => {
                const ftype = this.treeObject.Fields[field]?.type?.toUpperCase();

                /** @type {CastTypeI} */
                const type = ftype;

                let value = `NULL`;
                if (type) {
                    value = this.connector.cast(value, type);
                }

                layer.attributes.push([value, `"${field}"`]);
            });
            // ===================== add tech fields ======================================

            layer.attributes = this.mutateAttributes(layer.attributes, ignoreFields);
            layer.group = this.mutateAttributes(layer.group, ignoreFields);

            layer.attributes = this.sortAttributes(layer.attributes);

            allLevels[allLevels.length - 1] = layer;

            totals[name] = allLevels;
        });

        // TODO костыль для полуаддитивных мер
        if (isSemi && selectedTotals?.totals) {
            const columns = structuredClone(totals[constants.indexes]);

            const lastTotal = last(totals[constants.totals]);

            const simpleAttr = lastTotal.attributes.filter((i) => !mappedFuncs[i] && !mappedFuncs[i?.alias]);

            const attributes = Object.entries(mappedFuncs).map(([field, func]) => {

                if (constants.SEMI_ADDITIVE.includes(func)) {
                    func = 'SUM';
                }

                return { func, field: `"${field}"`, alias: field };
            });

            const layer = { attributes: this.sortAttributes([...simpleAttr, ...attributes]) };

            columns.push(layer);

            totals[constants.totals] = columns;
        }

        return totals;
    }

    /**
     * @private
     * 
     * @param {{attributes: TAggField[], group: any[]}} level
     * @param {string[]} hideAttr
     * @param {boolean} isSemi 
     */
    mutateFields(level, hideAttr, isSemi) {
        level.attributes.forEach((attr) => {
            if (typeof attr !== 'object') return;

            if (attr.aggrFields?.length) {
                attr.aggrFields = attr.aggrFields.filter((i) => !hideAttr.includes(i));
            }
        });

        const field = isSemi ? this.dateDimension.field : null;

        //@ts-ignore
        level.attributes = this.mutateAttributes(level.attributes, hideAttr, field);
        level.group = this.mutateAttributes(level.group, hideAttr, field);

        return level;
    }

    /**
     * @private
     * 
     * @param {TField[]} attributes 
     * @param {string[]} hideAttr 
     * @param {string} [dateDimension] 
     */
    mutateAttributes(attributes, hideAttr, dateDimension) {
        return attributes.filter((item) => item == dateDimension || !hideAttr.includes(/** @type {string} */(item)));
    }

    /**
     * @protected
     * 
     * @param {TField[]} attributes 
     */
    sortAttributes(attributes) {
        return attributes.sort((a, b) => {
            const av = this.getAttributeValue(a).replaceAll('"', '');
            const bv = this.getAttributeValue(b).replaceAll('"', '');

            return av.localeCompare(bv);
        });
    }

    /**
     * @private
     * 
     * @param {TField} attr 
     * @returns {string}
     */
    getAttributeValue(attr) {
        return Array.isArray(attr)
            ? attr[1]
            : typeof attr === 'object'
                ? attr.alias
                : attr;
    }
}

module.exports = TotalClass;