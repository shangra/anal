'use strict';

const fs = require('fs');
const path = require('path');
const { listWorkspaces, parseEnv, readRootEnv, serializeEnv } = require('./_utils');

const REQUIRED_KEYS = ['DB_HOST', 'DB_DATABASE', 'DB_USER', 'DB_PASS'];
const ALL_DB_KEYS = [...REQUIRED_KEYS, 'DB_PORT', 'DB_SCHEMA'];

/** Проверка: обязательные ключи заданы */
function isDbConfigSet(config) {
    return REQUIRED_KEYS.every((key) => {
        if (key === 'DB_PASS') return config[key] !== undefined;
        return Boolean(config[key]);
    });
}

/** Этап 3. Подстановка настроек БД из корневого .env в .env сервисов */
async function fillDbEnvs(ctx) {
    const rootEnv = readRootEnv(ctx.rootDir);
    const stateDb = ctx.state.db || {};
    const dbSettings = { ...rootEnv, ...stateDb };

    if (!isDbConfigSet(dbSettings)) {
        console.log('В корневом .env не заданы необходимые настройки БД (DB_HOST, DB_DATABASE, DB_USER, DB_PASS).');
        console.log('Сначала выполните шаг "Настройка подключения к БД" или задайте переменные вручную.\n');
        return;
    }

    for (const dir of listWorkspaces(ctx.rootDir)) {
        const name = path.basename(dir);
        const envPath = path.join(dir, '.env');
        if (!fs.existsSync(envPath)) continue;

        const text = fs.readFileSync(envPath, 'utf8');
        const env = parseEnv(text);

        // Подставляем ВСЕ DB_* из настроек БД — значение из example.env перезаписывается
        const updates = ALL_DB_KEYS.reduce((acc, key) => {
            const value = dbSettings[key];
            if (value !== undefined && value !== '') {
                acc[key] = value;
            }
            return acc;
        }, {});

        if (Object.keys(updates).length === 0) continue;

        fs.writeFileSync(envPath, serializeEnv(text, updates));
        console.log(`${name}: заполнены переменные ${Object.keys(updates).join(', ')}`);
    }
}

module.exports = fillDbEnvs;
module.exports.title = 'Заполнение настроек БД в сервисах';
