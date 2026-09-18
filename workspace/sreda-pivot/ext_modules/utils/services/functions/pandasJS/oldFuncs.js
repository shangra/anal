const { filter } = require('../basicSet');

// Старый код пытающийся в имитацию pandas

/**
 * Конвертация в пандас.
 * (Не выходит в лоб снизить асимптотическую сложность из-за комбинации всех возможных вариантов на нижнем уровне)
 *
 * Происходит мутация двух входящих объектов, по хорошему, это нужно исправлять.
 * @param {object} dataFrame
 * @param {object} hashMap
 *
 * @returns {object}
 */
const convertToPandas = (dataFrame, hashMap, newDataFrame) => {
    const dData = {};
    const checkColumnsValues = (valueList) => filter(valueList, (value) => value !== '');

    for (const rowKey in newDataFrame) {
        const rowName = hashMap[rowKey]?.length === 1 ? hashMap[rowKey][0] : hashMap[rowKey];

        dataFrame.index.push(rowName);
        dData[rowKey] = dData[rowKey] ?? {};

        for (const columnKey in newDataFrame[rowKey]) {
            const columnName = hashMap[columnKey];

            for (const valueKey in newDataFrame[rowKey][columnKey]) {
                for (const funcKey in newDataFrame[rowKey][columnKey][valueKey]) {
                    const columnValues = checkColumnsValues([valueKey, funcKey, columnKey]);
                    const columnValue = columnValues.join('__');
                    console.log('=columnValues=', { columnValues }); // =columnValues= { columnValues: [ 'r_bal_avg', 'layerУПР Куб Показатели', '0' ] }
                    if (!hashMap[columnValue]) {
                        dataFrame.columns.push([valueKey, funcKey, ...columnName]);
                        hashMap[columnValue] = columnValues;
                    }
                    dData[rowKey][columnValue] = newDataFrame[rowKey][columnKey][valueKey][funcKey];
                }
            }
        }
    }
    return dData;
};

module.exports = { convertToPandas };
