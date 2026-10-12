'use strict';

const fs = require('fs');
const path = require('path');
const { DB_KEYS, parseEnv, serializeEnv, openPrompt } = require('./_utils');

/** Маппинг имён переменных окружения на пользовательские названия */
const DB_LABELS = {
    DB_HOST: 'Сервер',
    DB_PORT: 'Порт',
    DB_DATABASE: 'Имя базы данных (БД)',
    DB_SCHEMA: 'Схема БД',
    DB_USER: 'Имя пользователя БД',
    DB_PASS: 'Пароль пользователя БД',
};

const DEFAULTS = {
    DB_HOST: "localhost",
    DB_PORT: '5432',
    DB_DATABASE: "public",
    DB_SCHEMA: 'pivot',
    DB_USER: "postgres",
    DB_PASS: ""
};

const REQUIRED_KEYS = ['DB_HOST', 'DB_DATABASE', 'DB_USER', 'DB_PASS'];
const ALL_DB_KEYS = [...REQUIRED_KEYS, 'DB_PORT', 'DB_SCHEMA'];

/** Этап 1. Проверка настроек БД в корневом .env и опрос пользователя при их отсутствии */
async function setupDbEnv(ctx) {
    const envPath = path.join(ctx.rootDir, '.env');
    const current = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {};

    // DB_PASS может быть намеренно пустым — считаем заданным, если ключ присутствует
    const missing = ALL_DB_KEYS.filter((key) => {
        const value = current[key];
        if (key === 'DB_PASS') return value === undefined;
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
            // Для DB_PORT и DB_SCHEMA: если пустое, подставляем дефолт — считаем заданным
            return value === undefined || value === '';
        }
        return value === undefined || value === '';
    });

    if (missing.length === 0) {
        console.log('Настройки БД в .env уже заданы, опрос пропущен.');
        // Убедимся, что дефолты тоже подставлены
        for (const [key, def] of Object.entries(DEFAULTS)) {
            if (!current[key]) {
                current[key] = def;
            }
        }
        ctx.state.db = current;
        return;
    }

    console.log(`В ${envPath} отсутствуют настройки: ${missing.join(', ')}`);
    console.log('Введите значения для подключения к базе данных:');

    const prompt = openPrompt();
    const answers = {};
    try {
        for (const key of missing) {
            const label = DB_LABELS[key] || key;
            const defaultVal = DEFAULTS[key] || '';
            const question = defaultVal ? `${label} [${defaultVal}]: ` : `${label}: `;

            answers[key] = await prompt.ask(
                question,
                key === 'DB_PASS'
                    ? null
                    : (v) => v !== '' || defaultVal !== ''
            );
        }
    } finally {
        prompt.close();
    }

    const text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    // Подставляем дефолты для тех, что пропустили
    for (const [key, def] of Object.entries(DEFAULTS)) {
        if (!answers[key]) {
            answers[key] = def;
        }
    }

    fs.writeFileSync(envPath, serializeEnv(text, answers));

    Object.assign(current, answers);
    ctx.state.db = current;
    console.log('Настройки БД сохранены в .env');
}

module.exports = setupDbEnv;
module.exports.title = 'Настройка подключения к БД';
