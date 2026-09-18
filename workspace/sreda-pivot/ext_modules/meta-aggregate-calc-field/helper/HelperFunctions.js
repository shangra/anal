const formatResultWithContext = ({ key }) => {
    return ({ val, arr }) => formatResult({ val, arr, key });
};

const formatResult = ({ val, arr, key }) => {
    const resultArr = arr.map((row) => row[key]).sort((a, b) => a[key] - b[key]);

    return JSON.stringify({ val, arr: resultArr });
};

/**
 * @param {object[]} rows
 * @param {object} row
 *
 * @returns {(arr: string[]) => object[]}
 */
const getGroupedRowsWithContext = (rows, row) => {
    return (groupKeys) => getGroupedRows(rows, row, groupKeys);
};

/**
 * @param {object[]} rows
 * @param {object} row
 * @param {string[]} groupKeys
 *
 * @returns {object[]}
 */
const getGroupedRows = (rows, row, groupKeys) => {
    return rows.filter((item) => {
        for (let i = 0; i < groupKeys.length; i++) {
            const key = groupKeys[i];

            if (item[key] !== row[key]) return false;
        }

        return true;
    });
};

/**
 * @param {object[]} rows
 * @param {object} row
 * @param {string} rowIdName
 *
 * @returns {(arr: string[]) => object[]}
 */
const getGroupedByAllKeysExeptWithContext = (rows, row, rowIdName) => {
    return (groupKeys) => {
        return getGroupedByAllKeysExept(rows, row, groupKeys, rowIdName);
    };
};

/**
 * @param {object[]} rows
 * @param {object} row
 * @param {string[]} groupKeys
 *
 * @returns {object[]}
 */
const getGroupedByAllKeysExept = (rows, row, groupKeys, rowIdName) => {
    const group = [...groupKeys, rowIdName];
    const keys = Object.keys(row || {}).filter((item) => !group.includes(item));
    return rows.filter((item) => {
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (item[key] !== row[key]) return false;
        }

        return true;
    });
};

/**
 * @param {object[]} rows
 * @param {string} key
 *
 * @returns {number}
 */
const sumByField = (rows, key) => {
    return rows.reduce((acc, row) => acc + +(row[key] || 0), 0);
};

/**
 * @param {object[]} rows
 * @param {string} key
 *
 * @returns {number}
 */
const avgByField = (rows, key) => {
    return sumByField(rows, key) / (rows.length || 1);
};

/**
 * @param {object[]} rows
 * @param {string} key
 *
 * @returns {number}
 */
const minByField = (rows, key) => {
    return Math.min(...getValuesByField(rows, key).map((i) => +i));
};

/**
 * @param {object[]} rows
 * @param {string} key
 *
 * @returns {number}
 */
const maxByField = (rows, key) => {
    return Math.max(...getValuesByField(rows, key).map((i) => +i));
};

/**
 * @param {object[]} rows
 * @param {string} key
 *
 * @returns {(number)[]}
 */
const getValuesByField = (rows, key) => {
    return rows.map((row) => row[key]);
};

/**
 * @param {object[]} rows
 * @param {string} key
 * @param {string} val
 *
 * @returns {object[]}
 */
const filterByFieldValue = (rows, key, val) => {
    return rows.filter((row) => row[key] === val);
};

module.exports = {
    sumByField,
    avgByField,
    minByField,
    maxByField,
    getValuesByField,
    filterByFieldValue,
    formatResult,
    formatResultWithContext,
    getGroupedRows,
    getGroupedRowsWithContext,
    getGroupedByAllKeysExept,
    getGroupedByAllKeysExeptWithContext,
};
