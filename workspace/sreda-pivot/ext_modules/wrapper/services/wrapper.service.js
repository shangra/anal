const fs = require('node:fs');
const path = require('node:path');
const Extensions = require('../../../core/class/Extensions.class');

class wrapperService extends Extensions {
    getSearchRoots() {
        const roots = [];
        const add = (dir) => {
            if (!dir || typeof dir !== 'string') {
                return;
            }
            const resolved = path.resolve(dir);
            if (!roots.includes(resolved)) {
                roots.push(resolved);
            }
        };

        const starts = [process.cwd(), __dirname];
        if (require.main?.filename) {
            starts.push(path.dirname(require.main.filename));
        }

        // В sreda-pivot модули лежат в ext_modules/auth, не в auth/ у корня
        for (const start of starts) {
            let dir = path.resolve(start);
            for (let i = 0; i < 8; i++) {
                const extModules = path.join(dir, 'ext_modules');
                if (fs.existsSync(extModules)) {
                    add(extModules);
                }
                const parent = path.dirname(dir);
                if (parent === dir) {
                    break;
                }
                dir = parent;
            }
        }

        // Исходная раскладка без бандла: wrapper/services → соседние модули
        add(path.join(__dirname, '..', '..'));
        add(path.join(__dirname, '..'));
        add(process.cwd());

        if (typeof sreda !== 'undefined' && sreda.env) {
            add(sreda.env.SR_PATH);
            add(sreda.env.ROOT);
            add(sreda.env.APP_ROOT);
            add(sreda.env.MODULES_PATH);
        }

        return roots;
    }

    resolveLocalPath(servicePathArray, serviceName) {
        const names = [serviceName];
        if (serviceName.endsWith('.service')) {
            names.push(`${serviceName}.js`);
        }

        const tried = [];
        for (const root of this.getSearchRoots()) {
            for (const name of names) {
                const candidate = path.resolve(root, ...servicePathArray, name);
                tried.push(candidate);
                try {
                    return require.resolve(candidate);
                } catch (e) {
                    // пробуем следующий корень
                }
            }
        }

        const error = new Error(
            `Сервис не найден: ${servicePathArray.join('/')}/${serviceName}`
        );
        error.tried = tried;
        throw error;
    }

    loadLocalClass(servicePathArray, serviceName) {
        const ext = servicePathArray[0];
        const registry =
            typeof services !== 'undefined' ? services : globalThis.services;
        const byFile = registry?.[ext]?.services?.[serviceName];
        const byName =
            registry?.[ext]?.services?.[path.parse(serviceName).name];
        if (typeof byFile === 'function') {
            return byFile;
        }
        if (typeof byName === 'function') {
            return byName;
        }
        const embedded = Extensions.lookupEmbeddedService(
            servicePathArray,
            serviceName
        );
        if (typeof embedded === 'function') {
            return embedded;
        }
        return require(this.resolveLocalPath(servicePathArray, serviceName));
    }

    async findService(servicePathArray, serviceName) {
        const embedded = Extensions.lookupEmbeddedService(
            servicePathArray,
            serviceName
        );
        if (typeof embedded === 'function') {
            return true;
        }
        try {
            this.resolveLocalPath(servicePathArray, serviceName);
            return true;
        } catch (e) {
            return false;
        }
    }

    async getFunctionResult(
        serviceArgumentsList,
        constructorArgumentsList,
        functionName,
        functionArgumentsList
    ) {
        let servicePath = serviceArgumentsList[1] || serviceArgumentsList[0];

        const pathParse = path.parse(servicePath);
        let servicePathArray = servicePath.split('/');
        servicePathArray.pop(); // удаляем имя сервиса
        servicePathArray = servicePathArray.filter(
            (dir) => dir !== '..' && dir !== '.'
        );
        let serviceName = pathParse.base;

        const body = {
            servicePathArray,
            serviceName,
            constructorArgumentsList,
            functionName,
            functionArgumentsList,
        };

        return this.post(
            serviceArgumentsList[0],
            servicePathArray[0],
            body
        );
    }

    async post(from, service, body) {
        const moduleClass = this.loadLocalClass(
            body.servicePathArray,
            body.serviceName
        );
        const moduleInstance = new moduleClass(
            ...body.constructorArgumentsList
        );
        const result = await moduleInstance[body.functionName](
            ...body.functionArgumentsList
        );
        return result;
    }
}

globalThis.wrapper = function (module, id) {
    function newClass(...args) {
        // Заглушка
    }

    const myClass = new Proxy(newClass, {
        construct: function (target, constructorArgumentsList) {
            const myProxy = new Proxy(
                {},
                {
                    get: function get(target, name) {
                        return function wrapper() {
                            const functionArgumentsList =
                                Array.prototype.slice.call(arguments);
                            const wrapperClass = new wrapperService();
                            return wrapperClass.getFunctionResult(
                                [module, id],
                                constructorArgumentsList,
                                name,
                                functionArgumentsList
                            );
                        };
                    },
                }
            );
            return myProxy;
        },
    });

    return myClass;
};

module.exports = wrapperService;