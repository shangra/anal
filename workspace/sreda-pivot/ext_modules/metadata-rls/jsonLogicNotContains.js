const jsonLogic = require("json-logic-js");

/**
 * Добавляет notContains в jsonLogic
 * Проверяет, что значение НЕ содержится в коллекции
 * 
 * @param {Array<string>} collection - массив строк
 * @param {string} value - искомое значение (ID)
 * @returns {boolean} true - если значение не найдено в коллекции
 */
jsonLogic.add_operation("notContains", function (collection, value) {
    if (!Array.isArray(collection)) return true;
    return !collection.includes(value);
});