import { Component } from 'react';

class Extensions extends Component {
    childrenClassName = '';

    // STATE = {
    //     before: "before",
    //     inner: "inner",
    //     after: "after"
    // }

    constructor(props) {
        super(props);
        this.childrenClassName = this.constructor.name;
        this.extendService(this);
    }

    hook(functionName, functionState, functionResult, functionParams) {
        const trace = false;
        const result = functionResult;
        const extFunctionName = `${this.childrenClassName}.${functionName}`;
        console.log('hook', extFunctionName, functionParams);
        return { trace, result };
    }

    after(functionName, functionResult, functionParams) {
        const res = this.hook(functionName, 'after', functionResult, functionParams);
        return res.result;
    }

    getFuncParamNames(func) {
        const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
        const ARGUMENT_NAMES = /(?:\.{3})?([a-zA-Z0-9#_]+)/g;
        const fnStr = func.toString().replace(STRIP_COMMENTS, '');
        const fnArgs = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'));
        return fnArgs ? fnArgs.split(',').map((arg) => arg.trim().match(ARGUMENT_NAMES)[0]) : [];
    }

    extendService(context) {
        const prototype = Object.getPrototypeOf(context);
        const methods = Object.getOwnPropertyNames(prototype).filter(
            (method) => method !== 'constructor' && typeof prototype[method] === 'function',
        );

        for (const method of methods) {
            this[method] = (...args) => {
                const funcParamNames = this.getFuncParamNames(prototype[method]);
                const objArgs = {};
                args.forEach((elem, i) => {
                    objArgs[funcParamNames[i]] = args[i];
                });

                this.after(method, {}, { this: context, ...objArgs });
                return prototype[method].apply(context, args);
            };
        }
    }
}

export { Extensions };
