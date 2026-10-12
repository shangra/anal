'use strict';

const fs = require('fs');
const path = require('path');
const { listWorkspaces } = require('./_utils');

/** Этап 2. Копирование example.env -> .env во всех сервисах (существующие .env не перезаписываются) */
async function copyEnvs(ctx) {
    const services = listWorkspaces(ctx.rootDir);
    for (const dir of services) {
        const name = path.basename(dir);
        const examplePath = path.join(dir, 'example.env');
        const envPath = path.join(dir, '.env');

        if (!fs.existsSync(examplePath)) {
            console.log(`${name}: example.env не найден, пропущен`);
            continue;
        }
        if (fs.existsSync(envPath)) {
            console.log(`${name}: .env уже существует, не перезаписывается`);
            continue;
        }
        fs.copyFileSync(examplePath, envPath);
        console.log(`${name}: example.env скопирован в .env`);
    }
}

module.exports = copyEnvs;
module.exports.title = 'Копирование example.env сервисов';
