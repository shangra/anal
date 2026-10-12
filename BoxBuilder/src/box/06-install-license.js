'use strict';

const fs = require('fs');
const path = require('path');
const { listWorkspaces, openPrompt } = require('./_utils');

const DEFAULT_LICENSE_PATH = './.LICENSE.KEY';
const LICENSE_FILE_NAME = '.LICENSE.KEY';

/** Бэкенд-сервисы: в packages есть папка ext_modules и нет папки src */
function listBackendServices(rootDir) {
    return listWorkspaces(rootDir).filter(
        (dir) => fs.existsSync(path.join(dir, 'ext_modules')) && !fs.existsSync(path.join(dir, 'src'))
    );
}

/** Этап 6. Установка лицензионного ключа в backend-сервисы */
async function installLicense(ctx) {
    const services = listBackendServices(ctx.rootDir);
    if (services.length === 0) {
        console.log('Backend-сервисы (с ext_modules) не найдены, этап пропущен.');
        return;
    }

    console.log('Укажите путь к файлу лицензионного ключа.');
    console.log(`Нажмите Enter, чтобы использовать путь по умолчанию: ${DEFAULT_LICENSE_PATH}`);

    const prompt = openPrompt();
    let sourcePath;
    try {
        for (;;) {
            const answer = await prompt.ask(`Путь к файлу ключа [${DEFAULT_LICENSE_PATH}]: `);
            sourcePath = path.resolve(ctx.rootDir, answer || DEFAULT_LICENSE_PATH);
            if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile()) break;
            console.log(`Файл не найден: ${sourcePath}, попробуйте ещё раз.`);
        }
    } finally {
        prompt.close();
    }

    for (const dir of services) {
        const targetPath = path.join(dir, LICENSE_FILE_NAME);
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`${path.basename(dir)}: лицензия установлена (${targetPath})`);
    }
}

module.exports = installLicense;
module.exports.title = 'Установка лицензионного ключа';
module.exports.listBackendServices = listBackendServices;
