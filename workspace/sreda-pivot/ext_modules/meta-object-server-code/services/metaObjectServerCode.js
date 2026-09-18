const CodeServiceClass = require('../../code-manager/services/code.service');
const CodeService = new CodeServiceClass();
const ApplicationClass = require('../../Application/services/Application.services');

class MetaObjectServerCode {
    static async run(func, ...args) {
        // @ts-ignore
        const [treeObject, item, ...nextArgs] = args;

        const Application = new ApplicationClass();

        const consoleHok = {
            log: '',
            error: '',
            warn: '',
        };
        let asyncConsole = [];
        const params = {
            Application: Application,
            options: nextArgs,
            console: {
                log: (...args) => {
                    asyncConsole.push(CodeService.consoleLog(consoleHok, 'log', args));
                },
                error: (...args) => {
                    asyncConsole.push(CodeService.consoleLog(consoleHok, 'error', args));
                },
                warn: (...args) => {
                    asyncConsole.push(CodeService.consoleLog(consoleHok, 'warn', args));
                },
            },
        };

        let result;
        try {
            const codeserver = item?.manifest?.settings?.codeserver ?? '';
            if (codeserver.trim() !== '') {
                const template = `${codeserver} \n return await ${func}(options);`;
                // @ts-ignore
                result = await CodeService.runCode(template, params, {});
            }
        } catch (e) {
            if (e.stack.indexOf(`ReferenceError: ${func} is not defined`) >= 0) {
                // Эти ошибки мы не обрабатываем, просто "проглатываем" и не обращаем внимания
                // Как правило, это из-за того, что пользовательского кода может не быть, а мы пытаемся его вызвать
                // Для исправления нужно предварительно вызывать интерпретатор или как-то "компилировать"
                // console.log(e)
            } else {
                //Это ошибка в коде подпрограммы нужно прокинуть соообщение дальше
                throw e;
            }
        }

        asyncConsole = await Promise.all(asyncConsole);
        if (asyncConsole.length > 0) {
            if (consoleHok.error !== '') console.error(consoleHok.error);
            if (consoleHok.log !== '') console.log(consoleHok.log);
            if (consoleHok.warn !== '') console.warn(consoleHok.warn);
        }

        return result;
    }

    static async onBeforeLoad(...args) {
        return MetaObjectServerCode.run('onBeforeLoad', ...args);
    }

    static async onAfterLoad(...args) {
        return MetaObjectServerCode.run('onAfterLoad', ...args);
    }

    static async onBeforeSave(...args) {
        return MetaObjectServerCode.run('onBeforeSave', ...args);
    }

    static async onAfterSave(...args) {
        return MetaObjectServerCode.run('onAfterSave', ...args);
    }

    static async onBeforeDelete(...args) {
        return MetaObjectServerCode.run('onBeforeDelete', ...args);
    }

    static async onAfterDelete(...args) {
        return MetaObjectServerCode.run('onAfterDelete', ...args);
    }

    static async onBeforeMarkDelete(...args) {
        return MetaObjectServerCode.run('onBeforeMarkDelete', ...args);
    }

    static async onAfterMarkDelete(...args) {
        return MetaObjectServerCode.run('onAfterMarkDelete', ...args);
    }
}

module.exports = MetaObjectServerCode;
