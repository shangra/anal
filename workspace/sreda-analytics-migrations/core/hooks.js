const services = require('../ext_modules/services');

sreda.hooks = {};

for (const ext in services) {
    for (const target in services[ext].hooks) {
        sreda.hooks[target] ||= [];
    }
}

const cache = new Map();
for (const ext in services) {
    for (const target in services[ext].hooks) {
        for (const info of services[ext].hooks[target]) {
            const HookClass = info.class;
            if (typeof HookClass.prototype[info.function] !== 'function') {
                console.warn(
                    `Не найдена подключаемая функция | module: ${ext}; class: ${HookClass.name}; function: ${info.function}`
                );

                continue;
            }

            let instance = cache.get(`${ext}:${HookClass.name}`);
            if (!instance) {
                instance = new HookClass();

                cache.set(`${ext}:${HookClass.name}`, instance);
            }

            const hook = instance[info.function].bind(instance);

            sreda.hooks[target].push({ info, hook });
        }
    }
}

module.exports = {};
