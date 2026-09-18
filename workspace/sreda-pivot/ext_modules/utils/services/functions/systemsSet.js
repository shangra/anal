const util = require('node:util');
const {
    complexPredicates: { isObject },
    isValidJSONObject,
} = require('../predicates/predicates');

/**
 * @param {any[]} arr
 * @returns {any}
 */
const getLast = (arr) => arr[arr.length - 1];

/**
 * Функция задержки для микротаск, - обернутая в промис макротаска
 */
const sleep = util.promisify(setTimeout);

/**
 * Переводит строку JSON формата в объект если она валидна, либо возвращает исходное значение
 *
 * @param {string | any} value
 */
const toJSON = (value) => (isValidJSONObject(value) ? JSON.parse(value) : value);

/**
 * Глубокое слияние двух объектов.
 *
 * @param {object} target - Объект который будет мутирован и дополнен полями последующих.
 * @param {object[]} sources - Массив объектов для глубокого копирования в первый.
 * @returns {object} - Ссылка на измененный объект.
 */
function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else if (Array.isArray(source[key])) {
                target[key] = [].concat(target[key] || [], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}

/**
 * Переписывает строку с заглавной буквы.
 *
 * @param {string} str - Строка для преобразования.
 * @returns {string} - Строка переписанная с заглавной буквы.
 */
const capitallize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Оставляет только уникальные значения в массиве.
 *
 * @param {Array} array - Массив для преобразования.
 * @returns {Array} - Массив с уникальными элементами.
 */
const uniqueValues = (array) => [...new Set(array)];

/**
 * Находит наибольший массив среди n переданных массивов
 *
 * @param {Array[]} arrays - Выборка массивов.
 * @returns {Array} - Ссылка на наибольший массив.
 */
const findLargestArray = (arrays) => {
    let largest = arrays[0];

    arrays.forEach((array) => {
        if (arrays.length > largest.length) largest = array;
    });

    return largest;
};

/**
 * Находит наименьший массив среди n переданных массивов
 *
 * @param {Array[]} arrays - Выборка массивов.
 * @returns {Array} - Ссылка на наибольший массив.
 */
const findSmallestArray = (arrays) => {
    let smallest = arrays[0];
    arrays.forEach((array) => {
        if (arrays.length < smallest.length) smallest = array;
    });

    return smallest;
};

/**
 * Находит наибольшую длинну среди n переданных массивов
 *
 * @param {Array[]} arrays - Выборка массивов.
 * @returns {Number} - Длина наибольшего массива.
 */
const findLargestOfArrayLength = (arrays) => findLargestArray(arrays).length;

/**
 * Возвращает списки ключей по всем переданным объектам.
 *
 * @param {Object[]} objects - Объекты.
 * @returns {Array[]} - Списки ключей.
 */
const getAllKeys = (...objects) => objects.map((object) => Object.keys(object));

/**
 * @param {string[]} a
 * @param {string[]} b
 * @returns {string[]}
 */
const diff = (a, b) => a.filter((i) => b.indexOf(i) < 0);

module.exports = {
    findLargestArray,
    findLargestOfArrayLength,
    findSmallestArray,
    getAllKeys,
    uniqueValues,
    capitallize,
    mergeDeep,
    getLast,
    toJSON,
    sleep,
    diff,
};
