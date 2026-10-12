'use strict';

const { runNpm } = require('./_utils');

/** Этап 7. Установка всех зависимостей проекта через npm run boxi */
async function installDeps(ctx) {
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
