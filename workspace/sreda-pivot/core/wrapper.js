/**
 * @typedef {(module: string, id?: string) => any} TWrapper
 */

/**
 * @type {TWrapper}
 */
globalThis.wrapper = function (module, id) {
    return require(id || module);
};

module.exports = {};
