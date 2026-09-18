const Model = require('./models/code.model');
const Extensions = require('../../../core/class/Extensions.class');
const Dto = require('../db/dtos/code.dto');

const GlobalService = require('../../../core/services/Global.service');
const vm = require('vm');

class codeService extends Extensions {
    async getAllSettings() {
        return await Model.getAllSettings();
    }

    async getChildren(id) {
        return await Model.getChildren(id);
    }

    async getMain(id) {
        const nowObject = await Model.get(id, {});
        return nowObject?.dataValues ?? nowObject;
    }

    async get(id, options) {
        let nowObject = await Model.get(id, options);
        nowObject = Object(new Dto(nowObject));
        const parentInfo = await Model.get(nowObject.parent, options);
        nowObject.ParentInfo = {
            id: parentInfo.id,
            name: parentInfo.name,
            parent: parentInfo.parent,
        };
        const children = await Model.getChildren(id, options);
        return {
            now: nowObject,
            children,
        };
    }

    async post(body) {
        const data = Object(new Dto(body));
        const result = await Model.new(data);
        return result;
    }

    async copy(body) {
        const data = Object(new Dto(body));
        const copyData = await Model.get(data.id);
        const newData = Object(new Dto(copyData));
        delete newData.id;
        delete newData.code;
        newData.name = data.name;
        const result = await Model.new(newData);
        return result;
    }

    async put(id, body) {
        const data = Object(new Dto(body));
        const result = await Model.update(id, data);
        return result;
    }

    async runCode(code, params, options) {
        code = `result = async () => {${code}}`;
        const vmContext = {
            ...params,
            result: null,
            import: null,
            console: console,
        };

        if (!options.require) {
            vmContext.require = require; // null;
        } else if (options.require && options.require !== '*') {
            vmContext.require = options.require;
            vmContext.wrapper = wrapper;
            vmContext.GlobalService = GlobalService;
        }

        vm.createContext(vmContext);
        vm.runInContext(code, vmContext);
        const result = await vmContext.result();
        return result; //data?.items?.[0]
    }

    async consoleLog(accumulator, type, args) {
        for (const arg of args) {
            if (typeof arg === 'object') {
                if (arg.name === 'TypeError' || arg.name === 'ReferenceError') {
                    accumulator[type] = `${accumulator[type] + arg.stack}\n${arg.message}\n`;
                } else {
                    accumulator[type] = `${accumulator[type] + JSON.stringify(arg)}\n`;
                }
            } else {
                accumulator[type] = `${accumulator[type] + arg}\n`;
            }
        }
    }

    async run(id, inputParams) {
        const data = await Model.get(id, {});
        const consoleHok = {
            log: '',
            error: '',
            warning: '',
        };
        const asyncConsole = [];
        const params = {
            ...inputParams,
            console: {
                log: (...args) => {
                    asyncConsole.push(this.consoleLog(consoleHok, 'log', args));
                },
                error: (...args) => {
                    asyncConsole.push(this.consoleLog(consoleHok, 'error', args));
                },
                warning: (...args) => {
                    asyncConsole.push(this.consoleLog(consoleHok, 'warning', args));
                },
            },
        };
        const options = {
            require: GlobalService.require,
            GlobalService,
        };

        let resultCode = '';
        try {
            resultCode = await this.runCode(data.codeSource, params, options);
        } catch (error) {
            asyncConsole.push(this.consoleLog(consoleHok, 'error', [error]));
        }

        await Promise.all(asyncConsole);
        return { result: resultCode, consoleHok };
    }

    async del(id) {
        const result = await Model.del(id);
        return result;
    }
}

module.exports = codeService;
