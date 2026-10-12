'use strict';

const fs = require('fs');
const path = require('path');
const { listWorkspaces, readRootEnv, loadServiceCommands, serviceEnv, runConfigured } = require('./_utils');

/** Поиск сервисов, у которых есть непустые каталоги db внутри ext_modules */
function hasExtModuleDb(dir) {
    const extDir = path.join(dir, 'ext_modules');
    if (!fs.existsSync(extDir)) return false;
    return fs.readdirSync(extDir, { withFileTypes: true }).some((entry) => {
        if (!entry.isDirectory()) return false;
        const dbDir = path.join(extDir, entry.name, 'db');
        return fs.existsSync(dbDir) && fs.readdirSync(dbDir).length > 0;
    });
}

/** Этап 8. Синхронизация БД сервисов с ext_modules: npm run db (установка) или npm run updatedb (обновление) */
async function syncDb(ctx) {
    const mode = ctx.state.mode || readRootEnv(ctx.rootDir).BOX_MODE || 'install';
    const commands = loadServiceCommands(ctx.rootDir);
    const services = listWorkspaces(ctx.rootDir).filter(hasExtModuleDb);

    if (services.length === 0) {
        console.log('Сервисы с ext_modules/*/db не найдены, этап пропущен.');
        return;
    }

    for (const dir of services) {
        const name = path.basename(dir);
        const spec = commands[name] || {};
        const env = serviceEnv(process.env, spec, readRootEnv(ctx.rootDir));
        if (spec.prepare) {
            console.log(`${name}: подготовка ${spec.prepare}`);
            const prepared = runConfigured(spec.prepare, { cwd: dir, env });
            if (prepared.status !== 0) {
                throw new Error(`Подготовка ${name} завершилась с кодом ${prepared.status}`);
            }
        }
        const command = mode === 'update'
            ? (spec.updatedb || 'npm run updatedb')
            : (spec.db || 'npm run db');
        console.log(`${name}: ${command} (${mode === 'update' ? 'обновление' : 'установка'} БД)`);
        const result = runConfigured(command, { cwd: dir, env });
        if (result.status !== 0) {
            throw new Error(`Ошибка выполнения ${command} в сервисе ${name}`);
        }
    }
}

module.exports = syncDb;
module.exports.title = 'Синхронизация БД сервисов';
