const vm = require('vm');

class VMClass {
    static async runUserCode(code, context) {
        const vmContext = {
            ...context,

            __result__: undefined,
            require: null,
            import: null,
        };
        vm.createContext(vmContext);
        code.replaceAll('__result__', 'result');
        code.replaceAll('return', '__result__ = ');
        vm.runInContext(code, vmContext);
        return context.__result__;
    }
}

module.exports = VMClass;
