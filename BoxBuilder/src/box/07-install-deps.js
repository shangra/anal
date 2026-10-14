'use strict';

const fs = require('fs');
const path = require('path');
const { runNpm } = require('./_utils');

/** Этап 7. Зависимости с registry банка уже лежат в node_modules после сборки. */
async function installDeps(ctx) {
    const installed = path.join(ctx.rootDir, 'node_modules');
    if (fs.existsSync(installed)) {
        console.log('Зависимости уже установлены при сборке коробки.');
        return;
    }

    console.log('Выполняется: npm run boxi');
    const result = runNpm(['run', 'boxi'], {
        cwd: ctx.rootDir,
    });
    if (result.status !== 0) {
        throw new Error('Не удалось установить зависимости (npm run boxi)');
    }
    console.log('Зависимости установлены.');
}

module.exports = installDeps;
module.exports.title = 'Установка зависимостей';
