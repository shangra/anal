const { isNil } = require('../../predicates');
const {
    isNotEmptyArray,
    isUndefined,
    complexPredicates: { isNumber },
    isArray,
} = require('../../predicates/predicates');

const { sumOfNumbersList, map, filter } = require('../basicSet');

/**
 * Класс DataFrame представляет собой структуру данных для хранения и обработки табличных данных
 * аналогичную python pandas DataFreme(требует расширения).
 * Он позволяет выполнять операции анализа данных, такие как просмотр первых строк,
 * вычисление статистических показателей и другое.
 */
class DataFrame {
    /**
     * Конструктор класса DataFrame.
     *
     * @param {Array} data - Массив объектов или двумерный массив. Должен иметь одинаковые ключи(столбцы).
     */
    constructor(data, columns = null) {
        this.data = data;
        // Массив названий столбцов.
        this.columns = columns || this._extractColumns();
    }

    /**
     * Внутренний метод для извлечения названий столбцов из данных.
     *
     * @returns {Array<string>} - Массив названий столбцов.
     *
     * @private
     */
    _extractColumns() {
        if (isNotEmptyArray(this.data)) {
            return Object.keys(this.data[0]);
        }

        return [];
    }

    /**
     * Внутренний метод для вычисления квантеля заданного порядка.
     * Используется линейная интерполяция между значениями.
     *
     * @param {Array<number>} sortedValues - Отсортированный массив числовых значений.
     * @param {number} q - Порядок квантиля (от 0 до 1). Например, 0.5 для медианы.
     *
     * @returns {number} Значение квантиля.
     *
     * @private
     */
    _quantile(sortedValues, q) {
        const pos = (sortedValues.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;

        if (!isUndefined(sortedValues[base + 1])) {
            return (
                // Линейная интерполяция между соседними значениями.
                sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base])
            );
        } else return sortedValues[base];
    }

    /**
     * Внутренний метод для преобразования строк('rows') данных.
     *
     * @param {function(Object): Object} transformFunc - Функция, которая принимает строку('row') и возвращает
     *  преобразованную строку('row').
     *
     * @returns {Array<Object>} - Массив преобразованных строк('row').
     *
     * @private
     */
    _transformRows(transformFunc) {
        const newData = new Array(this.data.length);
        const data = this.data;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            newData[i] = transformFunc(row);
        }
        return newData;
    }

    /**
     * Возвращает первые n строк данных.
     *
     * @param {number} [n=5] - Колличество строк для вывода (по умолчанию 5).
     *
     * @returns {Array<Object>} - Массив первых n строк данных.
     */
    head(n = 5) {
        return this.data.slice(0, n);
    }

    /**
     * Вычисляет статистические показатели для числовых столбцов данных.
     * Возвращает объект, где ключами являются названия столбцов, а значениями объекты со статистикой.
     * Статистика включает в себя:
     *  колличество, среднее значение, стандартное отклонение, минимальное и максимальное значения, квартили
     *
     * @returns {Object} Объект со статистическими показателями для каждого числового столбца.
     */
    describe() {
        const numericColumns = this.columns.filter((column) => {
            this.data.every((row) => isNumber(row[column]));
        });
        const stats = {};

        for (const column of numericColumns) {
            const values = this.data.map((row) => row[column]);
            const count = values.length;
            // Вычисление среднего значения
            const mean = sumOfNumbersList(values) / count;
            // Вычисление дисперсии
            const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count;
            // Вычисление стандартного отклонения
            const std = Math.sqrt(variance);
            // Сортировка значений для вычисления квартилей
            const sortedValues = [...values].sort((a, b) => a - b);
            //Минимальное и максимальное значения
            const min = sortedValues[0];
            const max = sortedValues[sortedValues.length - 1];
            // Вычисление квартилей
            const q1 = this._quantile(sortedValues, 0.25);
            const median = this._quantile(sortedValues, 0.5);
            const q3 = this._quantile(sortedValues, 0.75);

            // Сохранение статистики для текущего столбца
            stats[column] = { count, mean, std, q1, q3, min, median, max };

            return stats;
        }
    }

    /**
     * Фильтрует строки данных на основе предиката.
     *
     * @param {function(Object): boolean} predicate - Функция предикат.
     *
     * @returns {DataFrame} - Новый DataFrame, содержащий отфильтрованные данные.
     */
    filter(predicate) {
        const filteredData = this.data.filter(predicate);

        return new DataFrame(filteredData);
    }

    /**
     * Применяет функцию к каждому значению в указаном столбце и возвращает новый DataFrame с обновленными данными.
     *
     * @param {string} column - Название столбца для применения функции.
     * @param {function(unknown): unknown} func - Функция для применения к значениям столбца.
     *
     * @returns {DataFrame} - Новый DataFrame с обновленными данными.
     */
    apply(column, func) {
        const newData = this.data.map((row) => {
            row[column] = func(row[column]);
            return row;
        });

        return new DataFrame(newData);
    }

    /**
     * Группирует данные по указанному столбцу и выполняет агрегирующую функцию над другими столбцами.
     *
     * @param {string} column - Название столбца для группировки.
     * @param {Object<string, function(Array<any>): any>} aggregations - Объект, где ключи - названия столбцов, значения - функции агрегирования.
     *
     * @returns {Array<Object>} - Массив объектов, представляющих агрегированные данные.
     */
    groupBy(column, aggregations) {
        const groups = {};

        // Группировка данных
        this.data.forEach((row) => {
            const key = row[column];
            if (!groups[key]) groups[key] = [];

            groups[key].push(row);
        });

        // Агрегирование
        const result = [];
        for (const key in groups) {
            const groupRows = groups[key];
            const aggregatedRow = { [column]: key };

            for (const aggColumn in aggregations) {
                const aggFunc = aggregations[aggColumn];
                const values = groupRows.map((row) => row[aggColumn]);
                aggregatedRow[aggColumn] = aggFunc(values);
            }
            result.push(aggregatedRow);
        }

        return result;
    }

    /**
     * Сортирует данные по указанному столбцу.
     *
     * @param {string} column - Название столбца для сортировки.
     * @param {boolean} [ascending=true] - Направление сортировки. true - по возрастанию, false - по убыванию.
     *
     * @returns {DataFrame} - Новый DataFrame с отсортированными данными.
     */
    sortValues(column, ascending = true) {
        // Проверка наличия столбца
        this._validateColumns(column);

        const sortedData = new Array(this.data.length);
        const data = this.data;

        // Копирование данных для сортировки
        for (let i = 0; i < data.length; i++) sortedData[i] = data[i];

        // (Используется метод быстрой сортировки)
        sortedData.sort((a, b) => {
            if (a[column] < b[column]) return ascending ? -1 : 1;
            if (a[column] > b[column]) return ascending ? 1 : -1;

            return 0;
        });

        return new DataFrame(sortedData, this.columns);
    }

    /**
     * Добавляет новый столбец к DataFrame, основанный на вычислениях.
     *
     * @param {string} newColumn - Название нового столбца.
     * @param {function (Object): any } func - Функция которая принимает объект('row') и возвращает значение для нового столбца.
     *
     * @returns {DataFrame} - Новый DataFrame с добавленным столбцом.
     */
    addColumn(newColumn, func) {
        const newData = this.data.map((row) => ({ ...row, [newColumn]: func(row) }));
        const newDataFrame = new DataFrame(newData);

        newDataFrame.columns.push(newColumn);

        return newDataFrame;
    }

    /**
     * Преобразует DataFrame в строку в формате CSV.
     *
     * @returns {string} - Строка, представляющая данные в формате CSV.
     */
    toCSV() {
        const header = this.columns.join(',');
        const rows = this.data.map((row) => this.columns.map((column) => row[column]).join(','));

        return [header, ...rows].join('\n');
    }

    /**
     * Удаляет строки('row') с пропущенными значениями (null или undefined).
     *
     * @returns {DataFrame} - Новый DataFrame без строк('row') с пропущенными значениями.
     */
    dropna() {
        const cleanedData = [];
        const data = this.data;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const filtered = filter(row, (value) => !isNil(value));

            cleanedData.push(...filtered);
        }

        return new DataFrame(cleanedData);
    }

    /**
     * Удаляет указанные столбцы из данных.
     *
     * @param {string | Array<string>} columnsToRemove - Название столбца или массив названий для удаления.
     *
     * @returns {DataFrame} - Новый DataFrame без указанных столбцов.
     */
    drop(columnsToRemove) {
        const columnsDrop = isArray(columnsToRemove) ? columnsToRemove : [columnsToRemove];

        // Проверка наличия столбцов
        this._validateColumns(...columnsDrop);

        const columns = this.columns;
        // Для быстрого поиска
        const columnsToDropSet = new Set(columnsDrop);

        // Функция-преобразователь для удаления столбцов.
        const transformFunc = (row) => {
            const newRow = {};
            for (let j = 0; j < columns.length; j++) {
                const column = columns[j];
                if (!columnsToDropSet.has(column)) newRow[column] = row[column];
            }
            return newRow;
        };
        const newData = this._transformRows(transformFunc);
        const newColumns = filter(this.columns, (column) => !columnsToDropSet.has(column));

        return new DataFrame(newData, newColumns);
    }

    /**
     * Заполняет пропущенные значения (null или undefined) в указанном столбце заданным значением.
     *
     * @param {string} column - Название столбца для заполнения пропущенных значений.
     * @param {unknown} value - Значение, которым будут заполнены пропущенные значения.
     *
     * @returns {DataFrame} - Новый DataFrame с заполненными пропущенными значениями.
     */
    fillna(column, value) {
        const newData = new Array(this.data.length);
        const data = this.data;

        for (let i = 0; i < data.length; i++) {
            const newRow = data[i];

            if (isNil(newRow[column])) newRow[column] = value;

            newData[i] = newRow;
        }
        return new DataFrame(newData);
    }

    /**
     * Переименовывает столбцы из данных.
     *
     * @param {Object<string, string>} columnsMapping - Объект, где ключи - текущие названия столбцов, а значения - новые.
     *
     * @returns {DataFrame} - Новый DataFrame с переименованными столбцами.
     */
    rename(columnsMapping) {
        // Проверка наличия столбцов
        this._validateColumns(...Object.keys(columnsMapping));

        const columns = this.columns;

        // Функция-преобразователь для удаления столбцов.
        const transformFunc = (row) => {
            const newRow = {};
            for (let j = 0; j < columns.length; j++) {
                const column = columns[j];
                const newColumn = columnsMapping[column] || column;
                newRow[newColumn] = row[column];
            }
            return newRow;
        };
        const newData = this._transformRows(transformFunc);
        const newColumns = map(this.columns, (column) => columnsMapping[column] || column);

        return new DataFrame(newData, newColumns);
    }

    /**
     * Получает уникальные значения из указанного столбца.
     *
     * @param {string} column - Название столбца.
     *
     * @returns {Set<any>} - Набор уникальных значений;
     *
     * @private
     */
    _getUniqueValues(column) {
        const uniqueValues = new Set();
        const data = this.data;

        for (let i = 0; i < data.length; i++) {
            uniqueValues.add(data[i][column]);
        }

        return uniqueValues;
    }

    /**
     * Строит промежуточную структуру данных для pivot.
     *
     * @param {string} index - Название столбца для индексов строк.
     * @param {string} columns - Название столбца для новых столбцов.
     * @param {string} values - Название столбца для значений.
     *
     * @returns {Object} Промежуточная структура данных для pivot.
     *
     * @private
     */
    _buildPivotData(index, columns, values) {
        const pivotedData = {};
        const data = this.data;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowIndex = row[index];
            const column = row[columns];
            const value = row[values];

            if (!pivotedData[rowIndex]) pivotedData[rowIndex] = {};

            if (!isUndefined(pivotedData[rowIndex][column])) {
                // console.error(`Duplicate entry for index ${rowIndex} and column ${column}`);
                // return;
                throw new Error(`Duplicate entry for index ${rowIndex} and column ${column}`);
            }

            pivotedData[rowIndex][column] = value;
        }

        return pivotedData;
    }

    /**
     * Конструирует новый DataFrame из промежуточной структуры данных.
     *
     * @param {string} index - Название столбца для индексов строк.
     * @param {Set<any>} uniqueColumns - Набор уникальных значений для новых столбцов.
     * @param {Object} pivotedData - Промежуточная структура данных для pivot.
     * @param {unknown} [fillValue = null] - Значение по умолчанию для отсутствующих данных.
     *
     * @returns {DataFrame} - Новый DataFrame широком формате.
     *
     * @private
     */
    _constructPivotedDataFrame(index, uniqueColumns, pivotedData, fillValue = null) {
        const newData = [];
        const uniqueColumnsArray = Array.from(uniqueColumns);

        // Формирование нового массива данных
        for (const rowIndex in pivotedData) {
            const newRow = { [index]: rowIndex };

            for (let i = 0; i < uniqueColumnsArray.length; i++) {
                const column = uniqueColumnsArray[i];
                newRow[column] = !isUndefined(pivotedData[rowIndex][column])
                    ? pivotedData[rowIndex][column]
                    : fillValue;
            }
            newData.push(newRow);
        }

        // Формирование новых столбцов без изменения исходных
        const newColumns = [index, ...uniqueColumnsArray];

        return new DataFrame(newData, newColumns); // newColumns
    }

    /**
     * Строит промежуточную структуру данных для pivotTable с агрегацией.
     *
     * @param {string} index - Название столбца для индексов строк.
     * @param {string} columns - Название столбца для новых столбцов.
     * @param {string} values - Название столбца для значений.
     * @param {function(Array<unknown>): unknown} aggFunc - Функция агрегирования.
     *
     * @returns {Object} - Промежуточная структура данных с агрегированными значениями.
     *
     * @private
     */
    _buildPivotedDataForPivotTable(index, columns, values, aggFunc) {
        const pivotedData = {};
        const data = this.data;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowIndex = row[index];
            const column = row[columns];
            const value = row[values];

            if (!pivotedData[rowIndex]) pivotedData[rowIndex] = {};
            if (!pivotedData[rowIndex][column]) pivotedData[rowIndex][column] = [];

            pivotedData[rowIndex][column].push(value);
        }

        for (const rowIndex in pivotedData)
            for (const column in pivotedData[rowIndex])
                pivotedData[rowIndex][column] = aggFunc(pivotedData[rowIndex][column]);

        return pivotedData;
    }

    /**
     * Проверяет наличие указанных столбцов в DataFrame.
     *
     * @param {...string} columns - Название столбцов для проверки.
     *
     * @throws {Error} Если один из столбцов отсутствует.
     *
     * @private
     */
    _validateColumns(...columns) {
        for (let i = 0; i < columns.length; i++) {
            if (!this.columns.includes(columns[i])) {
                throw new Error(`Column "${columns[i]}" does not exists in DataFrame`);
            }
        }
    }

    /**
     * Транспонирует DataFrame.
     *
     * @param {string} index - Название столбца для индексов строк.
     * @param {string} columns - Название столбца для новых столбцов.
     * @param {string} values - Название столбца для значений.
     * @param {unknown} [fillValue = null] - Значение по умолчанию для отсутствующих данных.
     *
     * @returns {DataFrame} - Новый DataFrame широком формате.
     */
    pivot(index, columns, values, fillValue = null) {
        // Проверка наличия столбцов
        this._validateColumns(index, columns, values);

        const uniqueColumns = this._getUniqueValues(columns);
        const pivotedData = this._buildPivotData(index, columns, values);

        return this._constructPivotedDataFrame(index, uniqueColumns, pivotedData, fillValue);
    }

    /**
     * Создает сводную таблицу, позволяющую агрегировать данные.
     *
     * @param {string} index - Название столбца для индексов строк.
     * @param {string} columns - Название столбца для новых столбцов.
     * @param {string} values - Название столбца для значений.
     * @param {function(Array<unknown>): unknown} [aggFunc = arr => arr.reduce((a, b) => a + b, 0)] - Функция агрегирования.
     * @param {unknown} [fillValue = null] - Значение по умолчанию для отсутствующих данных.
     *
     * @returns {DataFrame} - Новый DataFrame в широком формате с агрегированными значениями.
     */
    pivotTable(index, columns, values, aggFunc = sumOfNumbersList, fillValue = null) {
        // Проверка наличия столбцов
        this._validateColumns(index, columns, values);

        const uniqueColumns = this._getUniqueValues(columns);
        const pivotedData = this._buildPivotedDataForPivotTable(index, columns, values, aggFunc);

        return this._constructPivotedDataFrame(index, uniqueColumns, pivotedData, fillValue);
    }
}

module.exports = { DataFrame };
