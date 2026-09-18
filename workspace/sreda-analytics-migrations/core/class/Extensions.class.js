class Extensions {
    /**
     * @constructor
     */
    constructor() {
        this.extendService();

        // при спреде эти свойства не попадают в результат
        Object.defineProperties(this, {
            childrenClassName: {
                value: this.constructor.name,
                configurable: true,
                enumerable: false,
            },
            STATE: {
                value: {
                    before: 'before',
                    inner: 'inner',
                    after: 'after',
                    decorate: 'decorate',
                },
                configurable: true,
                enumerable: false,
            },
        });
    }

    /**
     * @private
     * @param {string} functionName
     * @param {object} functionState
     * @param {object} functionResult
     * @param {object} functionParams
     * @param {object} context
     * @param {Function} [originalMethod]
     */
    static async hook(
        functionName,
        functionState,
        functionResult,
        functionParams,
        context,
        originalMethod
    ) {
        let trace = false;
        let result = await functionResult;
        const extFunctionName = `${context.childrenClassName}.${functionName}.${functionState}`;
        if (sreda.hooks[extFunctionName]) {
            const triggers = sreda.hooks[extFunctionName];

            for (const trigger of triggers) {
                const { info, hook } = trigger;
                // триггер выполняется один раз, и удаляется из памяти
                if (info.once) {
                    sreda.hooks[extFunctionName] = sreda.hooks[
                        extFunctionName
                    ].filter((globalTrigger) => globalTrigger !== trigger);
                }
                try {
                    result = await hook(result, functionParams, originalMethod);
                    trace = true;
                } catch (e) {
                    if (info.once) {
                        // если произошла ошибка при выполнении триггера, возвращаем его в память, так как он не выполнился
                        sreda.hooks[extFunctionName].push(trigger);
                    }
                    throw e;
                }
            }
        }
        return { trace, result };
    }

    /**
     * @private
     * @param {string} functionName
     * @param {any} functionResult
     * @param {object} functionParams
     * @param {object} context
     * @returns {Promise<{ trace: boolean, result: any }>}
     */
    static async before(functionName, functionResult, functionParams, context) {
        return this.hook(
            functionName,
            context.STATE.before,
            functionResult,
            functionParams,
            context
        );
    }

    /**
     * @private
     * @param {string} functionName
     * @param {object} functionResult
     * @param {object} functionParams
     * @param {object} context
     * @returns {Promise<{ trace: boolean, result: any }>}
     */
    static async inner(functionName, functionResult, functionParams, context) {
        return this.hook(
            functionName,
            context.STATE.inner,
            functionResult,
            functionParams,
            context
        );
    }

    /**
     * @private
     * @param {string} functionName
     * @param {object} functionResult
     * @param {object} functionParams
     * @param {object} context
     * @returns {Promise<{ trace: boolean, result: any }>}
     */
    static async after(functionName, functionResult, functionParams, context) {
        return this.hook(
            functionName,
            context.STATE.after,
            functionResult,
            functionParams,
            context
        );
    }

    /**
     * @private
     * @param {string} functionName
     * @param {object} functionResult
     * @param {object} functionParams
     * @param {object} context
     * @returns {Promise<{ trace: boolean, result: any }>}
     */
    static async decorate(
        functionName,
        functionResult,
        functionParams,
        context,
        originalMethod
    ) {
        return this.hook(
            functionName,
            context.STATE.decorate,
            functionResult,
            functionParams,
            context,
            originalMethod
        );
    }

    /**
     * @private
     */
    static getFuncParamNames(func) {
        const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
        const ARGUMENT_NAMES = /(?:\.{3})?([a-zA-Z0-9#_]+)/g;
        const fnStr = func.toString().replace(STRIP_COMMENTS, '');
        const fnArgs = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'));
        return fnArgs
            ? fnArgs
                  .split(',')
                  .map((arg) => arg.trim().match(ARGUMENT_NAMES)[0])
            : [];
    }

    /**
     * @private
     */
    extendService() {
        const prototype = Object.getPrototypeOf(this);
        const targets = Object.keys(sreda.hooks || {});

        // методы в прототипе перегружаются только 1 раз и после сборки
        if (!prototype._sourceMethods && targets.length) {
            /** @type {Record<string, Function>} */
            prototype._sourceMethods = {};

            const className = this.constructor.name;
            const methods = Object.getOwnPropertyNames(prototype).filter(
                (method) =>
                    method !== 'constructor' &&
                    typeof prototype[method] === 'function' &&
                    targets.find(
                        (target) =>
                            target.replace(
                                /(.inner$)|(.before$)|(.after$)|(.decorate$)/,
                                ''
                            ) === `${className}.${method}`
                    )
            );
            for (const method of methods) {
                // записываем исходные методы в скрытое поле прототипа
                prototype._sourceMethods[method] = prototype[method];

                // возвращаем новую функцию (this внутри всегда будет текущего объекта, на котором вызван метод)

                // т.к. новая функция по определению может быть только в классах, унаследованных от Extensions,
                // в объекте(this) гарантированно будут методы класса Extensions
                prototype[method] = async function (...args) {
                    const funcParamNames = Extensions.getFuncParamNames(
                        prototype._sourceMethods[method]
                    );
                    const extArgs = Object.fromEntries(
                        funcParamNames.map((_, i) => [
                            funcParamNames[i],
                            args[i],
                        ])
                    );

                    extArgs.this = this;

                    let { result, trace } = await Extensions.before(
                        method,
                        undefined,
                        extArgs,
                        this
                    );

                    ({ result, trace } = await Extensions.inner(
                        method,
                        result,
                        extArgs,
                        this
                    ));

                    if (!trace) {
                        const source = prototype._sourceMethods[method];
                        ({ result, trace } = await Extensions.decorate(
                            method,
                            result,
                            extArgs,
                            this,
                            source.bind(this)
                        ));

                        if (!trace) {
                            const { this: fthis, ...sourceArgs } = extArgs;
                            result = await source.apply(
                                this,
                                Object.values(sourceArgs)
                            );
                        }
                    }

                    ({ result } = await Extensions.after(
                        method,
                        result,
                        extArgs,
                        this
                    ));

                    return result;
                };
            }
        }
    }
}

module.exports = Extensions;
