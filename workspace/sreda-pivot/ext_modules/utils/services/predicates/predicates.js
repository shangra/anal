const uuid = require('uuid');

const { md5 } = require('../../../../core/services/Global.service');

/**
 * Набор предикатов для улучшения декларативности кода
 */
const isUndefined = (value) => typeof value === 'undefined';
const isNotUndefined = (value) => !isUndefined(value);
const isObjectType = (value) => typeof value === 'object';
const isNil = (value) => value === null || value === undefined;
const isNull = (value) => value === null;
const isNotNull = (value) => !isNull(value);
const isNotNaN = (value) => !Number.isNaN(value);
const isArray = (value) => Array.isArray(value);
const isNotArray = (value) => !isArray(value);
const isString = (value) => typeof value === 'string';
const isNumberType = (value) => typeof value === 'number';
const oneOf = (first, second) => (!first || !second) && (first || second);

const removeInvisibleChars = (str) =>
    str.replace(/([\u200B]+|[\u200C]+|[\u200D]+|[\u200E]+|[\u200F]+|[\uFEFF]+)/g, '');

/**
 * @param {object} obj
 * @returns {string}
 */
const hash = (obj) => {
    if (isNil(obj)) return '';

    if (Array.isArray(obj)) {
        return md5(
            JSON.stringify(
                obj.sort((a, b) => hash(a).localeCompare(hash(b))).map((item) => hash(item))
            )
        );
    }

    if (typeof obj === 'object') {
        const entries = Object.keys(obj)
            .sort()
            .map((key) => {
                return JSON.stringify([key, hash(obj[key])]);
            });
        return md5(JSON.stringify(entries));
    }

    return md5(JSON.stringify(obj));
};

function yeildEventLoop() {
    return new Promise((resolve) => setImmediate(resolve));
}

/**
 * @param {object} obj
 */
function* objectGenerator(obj) {
    for (const key in obj || {}) {
        if (hop(obj, key)) {
            yield { key, value: obj[key] };
        }
    }
}

function* arrayGenerator(array) {
    for (let i = 0; i < array.length; i++) {
        yield array[i];
    }
}

/**
 *
 * @param {any[]} arr
 * @param {Function} fn
 * @param {number} [limit]
 */
const iterateOverLargeArray = async (arr, fn, limit = sreda.env.MAX_ARRAY_CHUNCK_SIZE || 1_000) => {
    let index = 0;

    /**
     * @param {Function} resolve
     */
    const process = async (resolve) => {
        if (index >= arr.length) return resolve();

        for (; index < Math.min(index + limit, arr.length); index++) {
            const _ = await fn(arr[index], index);
        }

        setImmediate(() => process(resolve));
    };

    return new Promise((resolve) => process(resolve));
};

/**
 * @param {number} start
 * @param {number} end
 * @returns
 */
const randomIntNumberBetween = (start, end) => {
    const rand = Math.ceil(Math.abs(Math.random() * (end - start)));
    return start + rand;
};

/**
 * декартово произведение множеств
 *
 * @param {(number | string)[][]} arr
 * @param {number} i
 * @param {(number | string)[]} prev
 */
const decart = (arr, i = 0, prev = []) =>
    i > arr.length - 1 ? prev : arr[i].map((val) => decart(arr, i + 1, [...prev, val]));

/**
 * @param {object[]} rows
 * @param {string} key
 * @returns {Record<string, object[]>}
 */
const groupBy = (rows, key) => {
    return rows.reduce((acc, row) => {
        acc[row[key]] ||= [];
        acc[row[key]].push(row);
    }, {});
};

const regexExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (str) => {
    return regexExp.test(`${str}`);
};

/**
 * @param {string} str
 * @returns {string}
 */
const stringToUUID = (str) => {
    return uuid.v5(str, uuid.v5.DNS);
};

/**
 * @param {object} obj
 * @param {string | number} key
 * @returns {boolean}
 */
const hop = (obj, key) => obj && Object.prototype.hasOwnProperty.call(obj, key);

// Составные предикаты, - TODO переписать под использование конвеерных предикатных функций
const isNotEmptyArray = (arr) => isArray(arr) && arr.length > 0;
const isArrayContaining = (item) => (value) => isArray(value) && value.includes(item);

const arrToMap = (arr, key) => {
    return arr.reduce((acc, item) => {
        acc[item[key]] = item;

        return acc;
    }, {});
};

/**
 * @param {object[]} arr
 * @param {string} key
 * @returns {Record<string, object[]>}
 */
const arrToMapArr = (arr, key) => {
    return arr.reduce((acc, item) => {
        acc[item[key]] ||= [];
        acc[item[key]].push(item);

        return acc;
    }, {});
};

/**
 * @param {object} rows
 * @param {string} key
 *
 * @returns {Promise<Record<string, object[]>>}
 */
const groupDataByKey = async (rows, key) => {
    /** @type {Record<string, object[]>} */
    const mapping = {};

    const _ = await iterateOverLargeArray(rows, (row) => {
        mapping[row[key]] ||= [];
        mapping[row[key]].push(row);
    });

    return mapping;
};

/**
 * Проверяет, что аргумент является объектом без собственных свойств;
 * пустой массив, null и undefined также удовлетворяют условию
 *
 * @param {any} arg - проверяемое значение
 * @returns {boolean}
 */
function isEmptyObject(arg) {
    if (null == arg) return true; // null / undefined
    if ('object' !== typeof arg) return false;
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    for (const k in arg) if (hasOwnProperty.call(arg, k)) return false;
    return true;
}

/**
 * Создает функцию, которая возвращает `true`, если все предикаты возвращают `true`
 *  при применении к аргументам
 *
 * @param {Function[]} predicates - Массив предикатных функций.
 * @returns {Function} - Функция, принимающая любые аргументы и возвращающая `true`,
 * если все предикаты возвращают `true` для этих аргументов.
 *
 * Пример использования:
 *  1. -> const isValideArray = allPass(isNotEmptyArray, isArrayContaining('test'));
 *  2. -> isValidArray(['test', 'test_2']);
 *  3. -> `true`;
 *
 */
const allPass =
    (...predicates) =>
    (value) =>
        predicates.every((predicate) => predicate(value));

/**
 * Создает функцию, которая возвращает `true`, если хоть один предикаты возвращает `true`
 *  при применении к аргументам
 *
 * @param {Function[]} predicates - Массив предикатных функций.
 * @returns {Function} - Функция, принимающая любые аргументы и возвращающая `true`,
 * если хоть один предикат возвращает `true` для этих аргументов.
 *
 * Пример использования:
 *  1. -> const isNill = allPass(isNull, isUndefined);
 *  2. -> isNill(null);
 *  3. -> `true`;
 *
 */
const anyPass =
    (...predicates) =>
    (value) =>
        predicates.some((predicate) => predicate(value));

/**
 * Комплексные предикаты.
 */
const complexPredicates = {
    isObject: allPass(isObjectType, isNotNull, isNotArray),
    isNil: anyPass(isNull, isUndefined),
    isNumber: allPass(isNumberType, isNotNaN), // Можно расширить проверкой на бесконечность
    // isValideArray: allPass() - TODO доделать
};

const isValidJSONObject = (jsonString) => {
    try {
        const parsed = JSON.parse(jsonString);
        // Так как в parsed может без ошибки отработать например такая строка: '12345'
        return complexPredicates.isObject(parsed);
    } catch {
        return false;
    }
};

module.exports = {
    removeInvisibleChars,
    hash,
    yeildEventLoop,
    arrayGenerator,
    objectGenerator,
    decart,
    groupBy,
    isUuid,
    groupDataByKey,
    arrToMap,
    arrToMapArr,
    hop,
    isUndefined,
    isNull,
    isNil,
    isObjectType,
    isNotArray,
    isArray,
    isString,
    allPass,
    isNotEmptyArray,
    isArrayContaining,
    isValidJSONObject,
    oneOf,
    complexPredicates,
    isEmptyObject,
    stringToUUID,
    randomIntNumberBetween,
    iterateOverLargeArray,
};
