'use strict';

/**
 * Точка входа `node core/command/build`.
 *
 * 1) Если рядом лежит index.vendor.js — это ваш исходный collect, запускаем его.
 * 2) Иначе пишем services.js своим генератором (полный путь в имени const).
 * 3) Всегда разводим дубли AbstractConnector в уже записанном services.js.
 *
 * Один раз: переименуйте штатный index.js → index.vendor.js и положите этот файл как index.js.
 */
const fs = require('fs');
const path = require('path');

const vendor = path.join(__dirname, 'index.vendor.js');

if (fs.existsSync(vendor)) {
    require(vendor);
} else {
    console.log(
        'core:collect: нет index.vendor.js — генерируем services.js с полными путями в const'
    );
    require('./services')();
    try {
        const pkg = require(path.join(process.cwd(), 'package.json'));
        require('./platform')(pkg.platform);
    } catch (e) {
        console.warn('core:collect: platform.js', e.message);
    }
}

require('./fixServicesIdents').fixServicesIdents();
