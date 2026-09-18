const Extensions = require('../../core/class/Extensions.class');
const { generateKey } = require('./helper');
const {
    hop,
    uniqueValues,
    toJSON,
    groupDataByKey,
    iterateOverLargeArray,
} = require('../utils/services');
const {
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
} = require('./helper/HelperFunctions');

const GlobalService = require('../../core/services/Global.service');

const litePattern = require('lite-pattern');
const ApiError = require('../../core/exceptions/ApiError');
const { Aggregation } = require('./helper/aggregation-functions');

const AGGREGATE_DELIMETER = ':->:';
const ROW_ID_NAME = '###__id__###';

/**
 * @typedef {object} CalcFieldI
 * @property {string[]} values
 * @property {string[]} columns
 * @property {string[]} indexes
 * @property {Record<string, IAggFunc[]>} aggFunc
 * @property {Record<string, VirtualFieldI>} calculatedFields
 */

/**
 * @typedef {object} LayerI
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} type
 * @property {string} label
 * @property {boolean} isSelected
 * @property {boolean} hasCheck
 * @property {boolean} hasChild
 * @property {boolean} hasSorted
 * @property {boolean} hasFilter
 * @property {boolean} hasDelete
 * @property {boolean} isIrrelevant
 * @property {{ settings: { ref: string } }} manifest
 */

/**
 * @typedef {object} IAggFunc
 * @property {{ id: string, name: string, layer: { manifest: { settings: {ref: string | { link: string, value: string } } } } }} layer
 * @property {string} [name]
 * @property {string} field
 * @property {string} [windowFunc]
 * @property {string[]} [aggrFields]
 */

/**
 * @typedef {object} SettingI
 * @property {Array<MaybeArrayString>} initialOrder
 * @property {Array<MaybeArrayString>} order
 * @property {object} accountDimension
 * @property {object} dateDimension
 * @property {Record<string, IAggFunc[]>} aggfunc
 * @property {string[]} columns
 * @property {string[]} index
 * @property {string[]} values
 * @property {{ indexes?: boolean, columns?: boolean, totals?: boolean }} [totals]
 */

/**
 * @typedef {object} ConvertDataI
 * @property {boolean} [withoutTotal]
 * @property {Record<string, string>} mapValues
 * @property {object} options
 * @property {object} inputOptions
 * @property {Record<string, VirtualFieldI>} fields
 * @property {object} data
 * @property {string} layerId
 * @property {object} treeObject
 */

/**
 * @typedef {object} DelFieldI
 * @property {string} fieldName
 * @property {string} aggfunc
 */

/**
 * @typedef {object} VirtualFieldChildI
 * @property {string} aggfunc
 * @property {string} id
 * @property {{ link: string, value: string }} measures
 */

/**
 * @typedef {object} VirtualFieldI
 * @property {string} value
 * @property {string} totalValue
 * @property {string} type
 * @property {boolean} onoff
 * @property {string} name
 * @property {string[]} infoservice_owner
 * @property {string} id
 * @property {string} field
 * @property {string} description
 * @property {string} class_id
 * @property {Record<string, VirtualFieldChildI>} children
 */

class CalcFieldAggregateClass extends Extensions {
    /**
     * Логгер
     *
     * @public
     *
     * @param {object} meta
     * @param {string} msg
     * @returns {void}
     */
    console(msg, meta) {
        let dd = new Date();
        console.log(
            `------- ${dd.getMinutes()}:${dd.getSeconds()}.${dd.getMilliseconds()} --------`,
            msg
        );
    }

    /**
     * @param {{ aggPrefix?: string }} [param0]
     */
    constructor({ aggPrefix } = {}) {
        super();
        /** @private */
        this.aggPrefix = aggPrefix || AGGREGATE_DELIMETER;
    }

    /**
     * @public
     *
     * парсим данные и возврашаем новые агрегируемые значения
     *
     * @param {SettingI} options
     * мета вирутальных полей
     * @param {Record<string, VirtualFieldI>} fields
     */
    matrix(options, fields) {
        const plain = structuredClone(options);

        const matrix = [plain];

        for (const key in fields) {
            if (!plain.aggfunc[key]) continue;

            delete plain.aggfunc[key];
            plain.values = plain.values.filter((i) => i !== key);

            const newOptions = structuredClone(options);

            newOptions.totals = null;

            newOptions.values = [key];

            newOptions.aggfunc = { [key]: newOptions.aggfunc[key] };

            matrix.push(newOptions);
        }

        return matrix.filter((item) => item.values.length);
    }

    /**
     * @public
     *
     * парсим данные и возврашаем новые агрегируемые значения
     *
     * @param {SettingI} options
     * мета вирутальных полей
     * @param {Record<string, VirtualFieldI>} fields
     * мета мер
     * @param {Record<string, { field: string }>} measures
     * мета измерений
     * @param {Record<string, { field: string }>} dimensions
     * @returns {CalcFieldI}
     */
    get({ values, columns, index, aggfunc }, fields, measures, dimensions) {
        /** @type {string[]} */
        const newValues = [];

        /** @type {Record<string, IAggFunc[]>} */
        const newAggFunc = structuredClone(aggfunc);

        const newColumns = [...columns];

        const newIndexes = [...index];

        // мапа виртупльных мер которые используются в данном запросе
        /** @type {Record<string, VirtualFieldI>} */
        const calculatedFields = {};

        const windowFunc = 'OVER';

        const originalWindowFields = [...index, ...columns];

        values.forEach((field) => {
            // флаг который говорит что это виртуальная мера
            /** @type {Record<string, VirtualFieldChildI>}  */
            const fieldMeta = fields[field]?.children;

            if (!fieldMeta) {
                if (newAggFunc[field]) {
                    newAggFunc[field] = newAggFunc[field].map((func) => ({
                        ...func,
                        windowFunc,
                        aggrFields: originalWindowFields,
                    }));
                }

                return newValues.push(field);
            }

            const calcFields = this.buildCalculateFieldsName(field, aggfunc[field]);

            //TODO проверить нужна ли эта функция
            calcFields.forEach(
                (cField) => (calculatedFields[cField] = this.mutateAggFuncs(fields[field]))
            );

            const windowFields = [...index, ...columns];

            for (const fieldId in fieldMeta) {
                /** @type {VirtualFieldChildI} */
                const child = fieldMeta[fieldId];

                const parsedAggFunc = this.sqlFunc(child.aggfunc);

                const key = child.measures.value;

                const originalField = measures[key]?.field || dimensions[key]?.field;
                if (!originalField) {
                    throw ApiError.BadRequest(
                        `Неверно указанно поле на котором основывается агрегация данных`
                    );
                }
                const fieldName = this.generateName(originalField, field);

                /**
                 * если сторит тип агрегации parent выставим всем чайлдам тип агрегации родителя
                 */
                if (
                    !parsedAggFunc ||
                    !child.aggfunc ||
                    child.aggfunc === 'parent' ||
                    parsedAggFunc === 'parent'
                ) {
                    newAggFunc[fieldName] = newAggFunc[field].map((field) => ({
                        ...field,
                        windowFunc,
                        aggrFields: windowFields,
                    }));

                    continue;
                }

                /**
                 * если стоит тип агрегации nonagg это значит что его нужно докинуть в колонки чтобы система достала его из бд
                 */
                if (parsedAggFunc === 'nonagg') {
                    newColumns.push(originalField);
                    windowFields.push(originalField);

                    delete newAggFunc[fieldName];

                    continue;
                }

                /**
                 * пробегаемся по всем функциям агрегации
                 * если на поле не было агрегации добавляем ее
                 */
                newAggFunc[field].forEach(({ layer }) => {
                    if (!newAggFunc[fieldName]) {
                        newAggFunc[fieldName] = [
                            {
                                name: parsedAggFunc,
                                layer: layer,
                                field: originalField,
                                windowFunc,
                                aggrFields: windowFields,
                            },
                        ];

                        values.push(
                            `${fieldName}${AGGREGATE_DELIMETER}${parsedAggFunc.toUpperCase()}`
                        );

                        return;
                    }

                    const check = newAggFunc[fieldName].some(
                        (el) =>
                            el.name.toLowerCase() === parsedAggFunc.toLowerCase() &&
                            el.layer.id === layer.id
                    );

                    if (!check) {
                        newAggFunc[fieldName].push({
                            name: parsedAggFunc,
                            layer: layer,
                            field: originalField,
                            windowFunc,
                            aggrFields: windowFields,
                        });

                        values.push(
                            `${fieldName}${AGGREGATE_DELIMETER}${parsedAggFunc.toUpperCase()}`
                        );
                    }
                });
            }

            const windowKey = windowFields.sort().join(AGGREGATE_DELIMETER);
        });

        return {
            values: uniqueValues(newValues),
            columns: uniqueValues(newColumns),
            indexes: uniqueValues(newIndexes),
            aggFunc: newAggFunc,
            calculatedFields,
        };
    }

    /**
     * @public
     *
     * @param {ConvertDataI} data
     * @returns
     */
    async convertData(data) {
        const result = await this.convert(data);

        result.rows = await this.mapData(result.rows, data.mapValues);

        return result;
    }

    /**
     * @private
     *
     * преобразуем свойства объектов по переданному маппингу
     *
     * @param {object[]} rows
     * @param {Record<string, string>} mapValues
     * @returns {Promise<object[]>}
     */
    async mapData(rows, mapValues) {
        const _ = await iterateOverLargeArray(rows, (row) => {
            for (const oldKey in mapValues) {
                const newKey = mapValues[oldKey];

                row[newKey] = row[oldKey];
            }
        });

        return rows;
    }

    /**
     * @private
     *
     * @param {ConvertDataI} options
     * @returns {Promise<object>}
     */
    async convert({ withoutTotal, inputOptions, options, layerId, fields, data }) {
        if (!Object.keys(fields).length) return data;

        const originalRows = data.rows;

        data.rows = await this.calculate({
            calculatedField: fields,
            options,
            data,
        });

        if (withoutTotal) return data;

        data.totals = await this.total({
            data: { ...data, rows: originalRows, aggRows: data.rows },
            fields,
            layerId,
            options: inputOptions,
        });

        return data;
    }

    /**
     *
     * @param {object[]} rows
     * @param {string[]} markers
     */
    groupByFields(rows, markers) {
        const mapping = {};

        rows.forEach((row) => {
            const data = {};

            markers.forEach((marker) => (data[marker] = row[marker]));

            mapping[JSON.stringify(data)] = data;
        });

        return Object.values(mapping);
    }

    /**
     * @private
     *
     * мутируем data.rows расчитывая для них значения вирутальной меры и записывая его
     * в результате получаем маппинг группировки - формата [1, 2, 3, 4, 5]: row
     * в дальнейшем его можно использовать получить сгруппированные значения
     *
     * data - массив данных для генерации виртуальных мер
     * keys - массив ключей для генерации
     * options - объект для передачи в скрипт генерации
     * calculatedField - мапа с метой виртуальных мер
     *
     * @param {{ data: { rows: object[], refs: object }, options: { settings: SettingI }, calculatedField: Record<string, VirtualFieldI> }} param0
     * @returns {Promise<object[]>}
     */
    async calculate({ data, options, calculatedField }) {
        const _ = await iterateOverLargeArray(
            data.rows,
            (row, index) => (row[ROW_ID_NAME] = index)
        );

        const keys = Object.keys(calculatedField);

        const res = [];

        // Вычисляем значение виртуальных мер в теле таблице
        for (let i = 0; i < keys.length; i++) {
            const fieldName = keys[i];
            const field = calculatedField[fieldName];

            const blockedIds = new Set();

            const _ = await iterateOverLargeArray(data.rows || [], async (row) => {
                if (blockedIds.has([row[ROW_ID_NAME]])) return;

                const calulationResult = await this.calculateField({
                    options: options.settings,
                    calculationCommand: field.value,
                    row,
                    rows: data.rows,
                    refs: data.refs,
                });

                for (const key in calulationResult.blockedIds) {
                    blockedIds.add(key);
                }

                row[fieldName] = calulationResult?.val;

                res.push(row);
            });
        }

        return res;
    }

    async total({ layerId, fields, options, data }) {
        const [index] = options.settings.index;
        const [column] = options.settings.columns;

        const total = {};

        const requstedTotals = options?.settings?.totals || {};

        const promise = [
            { key: index, type: 'columns' },
            { key: column, type: 'indexes' },
        ].map(async ({ key, type }) => {
            if (!requstedTotals[type]) return;

            const mapping = await groupDataByKey(data.rows, key);
            const aggMapping = await groupDataByKey(data.aggRows, key);

            const promise = Object.entries(fields).map(async ([key, measure]) => {
                // получим тип агрегации
                const [_, name] = key.split(AGGREGATE_DELIMETER);
                // const [{ name }] = options.settings.aggfunc[measure.field];
                // приведем к стандартному виду
                const aggfnKey = name.toLowerCase();
                // id меры
                const measureKey = measure.id;
                // id слоя
                const layerKey = layerId;

                for (const valueKey in mapping) {
                    const fieldKey = generateKey({
                        measure: measureKey,
                        layer: layerKey,
                        value: valueKey,
                        aggfn: aggfnKey,
                    });

                    total[type] ||= {};
                    total[type][fieldKey] = await this.getTotal({
                        aggfnKey,
                        data: {
                            ...data,
                            rows: mapping[valueKey] || [],
                            aggRows: aggMapping[valueKey],
                        },
                        options,
                        measure,
                    });
                }
            });

            const _ = await Promise.all(promise);
        });

        const _ = await Promise.all(promise);

        return total;
    }

    /**
     * @private
     *
     * @param {*} param0
     * @returns
     */
    async getTotal({ aggfnKey, measure, data, options }) {
        if (!measure.totalValue) {
            const key = `${measure.field}${AGGREGATE_DELIMETER}${aggfnKey.toUpperCase()}`;

            const arr = getValuesByField(data.aggRows, `${key}`);

            this.console(`Счтитаем стандартные итоги по ключу ${`${key}`}`);

            const func = Aggregation[aggfnKey.toLowerCase()] || Aggregation.sum;

            return func(arr) || 0;
        }

        const result = await this.calculateField({
            options: options.settings,
            calculationCommand: measure.totalValue,
            row: {},
            rows: data.rows,
            aggRows: data.aggRows,
            refs: data.refs,
        });

        return result.val;
    }

    /**
     * @private
     *
     * проходимся по виртуальным мерам и парсим функцию агренации
     *
     * @param {VirtualFieldI} cubeField
     */
    mutateAggFuncs(cubeField) {
        for (const childId in cubeField.children) {
            if (hop(cubeField.children, childId)) {
                const child = cubeField.children[childId];

                child.aggfunc = this.sqlFunc(child.aggfunc);
            }
        }

        return cubeField;
    }

    /**
     * @public
     *
     * @param {{ options?: object, calculationCommand: string, row: object, aggRows?: object[], rows: object[], refs?: object }} param0
     * @returns {Promise<{ val: number, arr: string[], blockedIds: Record<string, boolean> }>}
     */
    async calculateField({ options, calculationCommand, row, aggRows, rows, refs }) {
        if (!calculationCommand) {
            return { val: null, arr: [], blockedIds: {} };
        }

        const params = {
            options,
            row,
            rows,
            refs,
            aggRows,

            console: { log: console.log },

            rowIdName: ROW_ID_NAME,

            formatResult,
            formatResultWithContext: formatResultWithContext({ key: ROW_ID_NAME }),

            minByField,
            maxByField,
            sumByField,
            avgByField,
            getValuesByField,
            filterByFieldValue,

            getGroupedRows,
            getGroupedRowsWithContext: getGroupedRowsWithContext(rows, row),
            getGroupedByAllKeysExept,
            getGroupedByAllKeysExeptWithContext: getGroupedByAllKeysExeptWithContext(
                rows,
                row,
                ROW_ID_NAME
            ),
        };
        const value = await litePattern.render({ main: calculationCommand }, params, {
            require: GlobalService.require,
        });

        return this.parseCalcField(value, null);
    }

    /**
     * @public
     *
     * @param {string} innerResult
     * @param {{ options: { row: object, rows: object[], calculationCommand: string } }} functionParams
     */
    async calculateOverride(innerResult, functionParams) {
        const { options } = functionParams;

        const { val } = await this.calculateField(options);

        return val;
    }

    /**
     * @private
     *
     * @param {string} field
     * @param {string} attribute
     * @returns {string}
     */
    generateName(field, attribute) {
        return `${attribute}${AGGREGATE_DELIMETER}${field}`;
    }

    /**
     * @private
     *
     * @param {any} num
     * @param {number} value
     * @returns {number}
     */
    getNumberOrDefValue(num, value) {
        return isFinite(+num) ? num : value;
    }

    /**
     * @private
     *
     * @param {string} str
     * @param {any} value
     * @returns {{ val: number, arr: string[], blockedIds: Record<string, boolean> }}
     */
    parseCalcField(str, value) {
        /** @type {string | { val: string, arr: string[] } } */
        const data = toJSON(str);

        let val = this.getNumberOrDefValue(data, value);
        let arr = [];
        /** @type {Record<string, boolean>} */
        let blockedIds = {};
        if (typeof data === 'object') {
            const num = +data.val;

            val = this.getNumberOrDefValue(num, value);

            arr = data?.arr || [];

            blockedIds = arr.reduce((acc, item) => {
                acc[item] = true;

                return acc;
            }, {});
        }

        return { val, blockedIds, arr };
    }

    // TODO Надо выпилить!!!
    /**
     * @private
     *
     * @param {string} func
     * @returns {string}
     */
    sqlFunc(func) {
        switch (func?.toLocaleLowerCase()) {
            case 'nonagg':
                return 'nonagg';
            case 'sum':
                return 'sum';
            case 'avg':
            case 'mean':
                return 'avg';
            case 'min':
                return 'min';
            case 'max':
                return 'max';
            case 'len':
            case 'count':
                return 'count';
            case 'firstchild':
            case 'first_value':
                return 'first_value';
            case 'lastchild':
            case 'last_value':
                return 'last_value';
            case 'firstnonempty':
                return 'first_value';
            case 'lastnonempty':
                return 'last_value';
            case 'account':
                return 'account';
            default:
                return 'sum';
        }
    }

    /**
     * @private
     *
     * @param {string} calcFieldName
     * @param {IAggFunc[]} aggfunc
     * @returns {string[]}
     */
    buildCalculateFieldsName(calcFieldName, aggfunc) {
        return aggfunc.map((func) => `${calcFieldName}${this.aggPrefix}${func.name}`);
    }
}

module.exports = CalcFieldAggregateClass;
