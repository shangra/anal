/**
 * @typedef {(module: string, id?: string) => any} TWrapper
 */

/**
 * @type {TWrapper}
 */
wrapper = function (module, id) {
    return require(id || module);
};

module.exports = {};
