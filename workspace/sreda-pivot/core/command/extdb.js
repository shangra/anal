// Перегрузка уровней логирования
require('../console');

// Загрузка зашифрованных переменных окружения
require('../crypto-env');

// Инициализация переменных окружения и установка значений по-умолчанию
require('../sreda-env');

console.log('DB collect started...');

const fs = require('fs');
const path = require('path');

const DB_DIR = path.resolve(sreda.env.VAR, sreda.env?.DB_DIR ?? 'db');

try {
    fs.rmSync(DB_DIR, { recursive: true, force: true });
} catch (e) {
    console.error(e);
}

try {
    fs.mkdirSync(path.join(DB_DIR, 'migrations'), { recursive: true });
    fs.mkdirSync(path.join(DB_DIR, 'seeders'), { recursive: true });
    fs.mkdirSync(path.join(DB_DIR, 'dumps'), { recursive: true });
} catch (e) {
    console.error(e);
}

const ext_modulesDir = path.join(process.cwd(), 'ext_modules');

/**
 * @param {string} module Модуль
 * @param {"migrations" | "seeders" | "dumps"} type Тип данных
 * @param {boolean} deep Собирать ли из вложенных директорий
 */
const collect = (module, type, deep = false) => {
    const spath = path.join(ext_modulesDir, module, 'db', type);

    if (!fs.existsSync(spath)) return;

    const items_old = fs.readdirSync(spath, {
        withFileTypes: true,
        recursive: deep,
    }); //Не работает в Linux
    const items = fs.readdirSync(spath, { recursive: deep });

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const fpath = path.join(spath, item);

        if (!fs.statSync(fpath).isFile()) continue;

        const itemSplitting = item.split('/');
        const filename = itemSplitting[itemSplitting.length - 1]; //Для windows не будет работать
        const dfpath = path.join(DB_DIR, type, filename);

        console.debug(fpath, dfpath);

        fs.copyFileSync(fpath, dfpath);
    }
};

const models = require('../../ext_modules/models');

for (let i = 0; i < Object.keys(models).length; i++) {
    const module = Object.keys(models)[i];

    // MIGRATIONS
    collect(module, 'migrations');

    // SEEDERS
    collect(module, 'seeders');

    // DUMPS
    collect(module, 'dumps', true);
}

console.log('DB collect complete');
