const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const { default: Decimal } = require("decimal.js");
const { isNil, iterateOverLargeArray, objectGenerator } = require("../../utils/services");
const { ref_extract } = require("../../metadata-cmp/util");
const { aggrDelimeter } = require("../constants");

dayjs.extend(customParseFormat)

class PivotClass {

    constructor(dataFrame, metadata) {
        this.dataFrame = dataFrame;

        /** дерево метаданных */
        this.treeObject = metadata.metadata.treeObject;
        /** поля представления */
        this.viewField = metadata.viewField;
        /** данные из реф таблиц */
        this.refFields = metadata.refFields;

        this.newDataFrame = {};
        this.flatDataFrame = {};
        this.flatFieldsHelp = {};
        this.hashMap = {};
        this.options = {
            columnsOrder: [],
            indexOrder: [],
            valuesOrder: [],
            columns: [],
            index: [],
            values: []
        };

        this.func = {
            sum: (data) => {
                return data.reduce((acc, cur) => acc + Number(cur) || 0, 0);
            },
            len: (data) => {
                return data.length;
            },
            mean: (data) => {
                /** @type {Decimal} */
                return data
                    .reduce((acc, cur) => acc.plus(Decimal(cur)), new Decimal(0))
                    .div(new Decimal(data.length))
                    .toNumber();
            },
            min: (data) => {
                return Math.min.apply(null, data);
            },
            max: (data) => {
                return Math.max.apply(null, data);
            },
        };
    }

    toJSON(val) {
        try { val = JSON.parse(val); } catch { }

        return val;
    }

    async pivot_node_table(index, columns, values, aggfunc = undefined, order) {
        //Не оптимально
        for (const name of index) {
            this.flatFieldsHelp[name] = { type: 'index' };
            this.options.index.push(name);
            this.options.indexOrder.push(order.find((el) => el.infoserviceField === name));
        }
        for (const name of columns) {
            this.flatFieldsHelp[name] = { type: 'columns' };
            this.options.columns.push(name)
            this.options.columnsOrder.push(order.find((el) => el.infoserviceField === name));
        }
        for (const name of values) {
            this.flatFieldsHelp[name] = { type: 'values' };
            this.options.values.push(name)

            const fieldList = name.split(aggrDelimeter)
            const fieldName = fieldList[0];
            const fieldFunc = fieldList[fieldList.length - 1];
            let aggFunc = aggfunc[name][0].toUpperCase();
            let orderField = order.find((el) => el.infoserviceField === `${fieldName}${aggrDelimeter}${aggFunc}`);
            if (orderField) {
                this.options.valuesOrder.push({ infoserviceField: `${fieldName}${aggrDelimeter}${fieldFunc}`, orderDirection: orderField.orderDirection });
            };
        }

        this.newDataFrame = {};

        const _ = await iterateOverLargeArray(this.dataFrame, (row) => this.getFlatRowDataForNode(row, index, columns, values));

        // this.pivot_flat_agg(aggfunc);

        return this;
    }

    /**
     * @param {object} row 
     * @param {string[]} rowIndex 
     * @param {string[]} colIndex 
     * @param {string[]} values 
     */
    getFlatRowDataForNode(row, rowIndex, colIndex, values) {
        const newRow = {};
        const newCol = {};

        const key = [];
        for (const rIndex of rowIndex) {
            newRow[rIndex] = row[rIndex];
            key.push(row[rIndex]);
        }

        for (const cIndex of colIndex) {
            newCol[cIndex] = row[cIndex];
            key.push(row[cIndex]);
        }
        const keyRow = key.join('__');

        const newVal = this.flatDataFrame[keyRow]?.values ?? {};
        for (const val of values) {
            const valueData = !isNaN(row[val]) ? Number(row[val]) : null;

            let nowValLink = newVal;
            const splittingColumn = val ? val.split(":->:") : [''];
            splittingColumn.forEach((col, index) => {
                if (!nowValLink[col]) {
                    nowValLink[col] = (index === splittingColumn.length - 1) ? [] : {};
                }
                if (index === splittingColumn.length - 1)
                    nowValLink[col].push(valueData);
                else
                    nowValLink = nowValLink[col];
            });
        }

        this.flatDataFrame[keyRow] = { index: newRow, columns: newCol, values: newVal };
    }

    flat_to_ndf() {
        const ndf = {};
        //Конвертируем в newDataFrame
        const gen = objectGenerator(this.flatDataFrame);
        for (const rowValue of gen) {
            const row = rowValue.value;

            const iVal = Object.values(row.index);
            const iKey = iVal.join('__');
            ndf[iKey] ??= {};
            this.hashMap[iKey] = iVal;

            const cVal = Object.values(row.columns);
            const cKey = cVal.join('__');
            ndf[iKey][cKey] ??= {};
            this.hashMap[cKey] = cVal;

            ndf[iKey][cKey] = row.values;
        }

        this.newDataFrame = ndf;
        return this;
    }

    to_nodes() {
        const pandas = this.to_pandas();

        pandas.data = pandas.data.map(row =>
            row.map((value, i) => {
                if (typeof value !== 'object' || null == value) {
                    return value;
                }

                value = value.filter(j => j != undefined);

                const aggr = pandas.columns[i][pandas.columns[i].length - 1];
                if (['FIRST_VALUE', 'LAST_VALUE', 'AVG', 'MEAN'].includes(aggr.toUpperCase())) {
                    return this.func.mean(value)
                }

                return value.reduce(
                    (a, b) => a.plus(new Decimal(b)), new Decimal(0)
                ).toNumber();
            })
        );

        return pandas;
    }

    to_pandas() {
        const df = {
            columns: [],
            index: [],
            data: [],
        };
        const dd = {};

        //Конвертируем в пандас
        for (const rowKey in this.newDataFrame) {
            const rowName = this.hashMap[rowKey].length === 1 ? this.hashMap[rowKey][0] : this.hashMap[rowKey];
            df.index.push(rowName);
            for (const colKey in this.newDataFrame[rowKey]) {
                for (const valKey in this.newDataFrame[rowKey][colKey]) {
                    for (const layKey in this.newDataFrame[rowKey][colKey][valKey]) {
                        for (const func in this.newDataFrame[rowKey][colKey][valKey][layKey]) {
                            const colName = this.hashMap[colKey];
                            const colValue = [];
                            valKey !== '' && colValue.push(valKey);
                            layKey !== '' && colValue.push(layKey);
                            colKey !== '' && colValue.push(colKey);
                            func !== '' && colValue.push(func);

                            const nameCol = colValue.join('__');
                            if (!this.hashMap[nameCol]) {
                                df.columns.push([valKey, layKey, ...colName, func]);
                                this.hashMap[nameCol] = colValue;
                            }
                            dd[rowKey] ??= {};
                            dd[rowKey][nameCol] = this.newDataFrame[rowKey][colKey][valKey][layKey][func];
                        }
                    }
                }
            }
        }

        const refs = this.refFields;
        const view = this.viewField;

        let sortedIndexKeys = Object.keys(this.newDataFrame);

        if (this.options.valuesOrder.length > 0) {
            const criteria = this.options.valuesOrder.map(rule => {
                const [field, funcPart] = rule.infoserviceField.split(aggrDelimeter);
                const direction = /asc/i.test(rule.orderDirection?.val || rule.orderDirection) ? 1 : -1;

                const colIndex = df.columns.findIndex(colArr => {
                    const valKey = colArr[0];
                    const func = colArr[colArr.length - 1];
                    return valKey === field && func === funcPart;
                });

                return colIndex !== -1 ? { colIndex, direction } : null;
            }).filter(Boolean);

            if (criteria.length > 0) {
                sortedIndexKeys.sort((aKey, bKey) => {
                    for (const { colIndex, direction } of criteria) {
                        const colKeyStr = [].concat(df.columns[colIndex]).join('__');
                        let aVal = dd[aKey]?.[colKeyStr] ?? null;
                        let bVal = dd[bKey]?.[colKeyStr] ?? null;

                        if (Array.isArray(aVal)) aVal = aVal[0];
                        if (Array.isArray(bVal)) bVal = bVal[0];

                        aVal = aVal == null || isNaN(aVal) ? -Infinity : Number(aVal);
                        bVal = bVal == null || isNaN(bVal) ? -Infinity : Number(bVal);

                        if (aVal === bVal) continue;
                        return aVal < bVal ? -direction : direction;
                    }
                    return 0;
                });
            }
        } else {
            this.options.indexOrder.map((index) => {
                if (!index) return;

                const { orderDirection, type, infoserviceField, fieldName } = index;

                sortedIndexKeys.sort((a, b) => {
                    const pkaValue = fieldName ? refs?.[infoserviceField]?.[a]?.[fieldName || view?.[infoserviceField]] : a;
                    const pkbValue = fieldName ? refs?.[infoserviceField]?.[b]?.[fieldName || view?.[infoserviceField]] : b;

                    if (pkaValue == undefined) return 1;

                    if (/asc/i.test(orderDirection?.val || orderDirection)) {
                        return this.compare(pkaValue, pkbValue, type) ? 1 : -1;
                    } else {
                        return this.compare(pkaValue, pkbValue, type) ? -1 : 1;
                    }
                });
            });
        };

        this.options.columnsOrder.map((column) => {
            if (!column) return;

            const { orderDirection, type, infoserviceField, fieldName } = column;

            df.columns.sort((arrA, arrB) => {
                const a = arrA[arrA.length - 2];
                const b = arrB[arrB.length - 2];

                const pkaValue = fieldName ? refs?.[infoserviceField]?.[a]?.[fieldName || view?.[infoserviceField]] : a;
                const pkbValue = fieldName ? refs?.[infoserviceField]?.[b]?.[fieldName || view?.[infoserviceField]] : b;

                if (pkaValue == undefined) return 1;

                if (/asc/i.test(orderDirection?.val || orderDirection)) {
                    return this.compare(pkaValue, pkbValue, type) ? 1 : -1;
                } else {
                    return this.compare(pkaValue, pkbValue, type) ? -1 : 1;
                }
            });
        });

        df.index = sortedIndexKeys.map(key => {
            const indexVal = this.hashMap[key];
            return indexVal.length === 1 ? indexVal[0] : indexVal;
        });

        df.data = sortedIndexKeys.map(rowKey => {
            return df.columns.map(col => {
                const colKey = [].concat(col).join('__');

                return dd?.[rowKey]?.[colKey] ?? null;
            });
        });

        return df;
    }

    /**
     * @param {string} a
     * @param {string} b
     * @param {string} type
     * @returns {boolean}
     */
    compare(a, b, type) {
        let result = false;

        // if (typeof a === 'number') {
        //     type = 'integer';
        // }

        // if (typeof a === 'string') {
        //     type = 'text';
        // }

        switch (type) {
            case 'integer':
            case 'float':
                result = +a >= +b;
                break;
            case 'uuid':
            case 'ref':
            case 'string':
            case 'varchar':
            case 'text':
                result = `${a}`?.localeCompare(b) >= 0;
                break;
            case 'date':
                result = +this.parseDate(a) >= +this.parseDate(b);
                break;
            default:
                result = isNil(a) ? false : `${a}`?.localeCompare(b) >= 0;
                break;
        }

        return result;
    }

    /**
     * @param {string} str 
     * @returns {Date}
     */
    parseDate(str) {
        return dayjs(str, [
            'YYYY-MM-DD HH:mm:ss',
            'YYYY/MM/DD HH:mm:ss',
            'DD/MM/YYYY HH:mm:ss',
            'DD-MM-YYYY HH:mm:ss',
            'YYYY-MM-DD',
            'YYYY/MM/DD',
            'DD/MM/YYYY',
            'DD-MM-YYYY',
        ]).toDate()
    }
}

module.exports = PivotClass;
