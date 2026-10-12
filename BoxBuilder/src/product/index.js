'use strict';

const fs = require('fs');
const path = require('path');

const boxDir = path.join(__dirname, 'box');

/** CLI установки и настройки проекта. Подключает этапы из папки box и выполняет их последовательно */
async function main() {
    const stageFiles = fs
        .readdirSync(boxDir)
        .filter((name) => name.endsWith('.js') && !name.startsWith('_'))
        .sort();

    const ctx = {
        rootDir: __dirname,
        argv: process.argv.slice(2),
        state: {},
    };

    // Этапы с runOnSetup === false выполняются только вручную
    const stages = stageFiles
        .map((name) => ({ name, stage: require(path.join(boxDir, name)) }))
        .filter(({ stage }) => stage.runOnSetup !== false);

    console.log(`Всего этапов: ${stages.length}`);

    for (let i = 0; i < stages.length; i++) {
        const { name, stage } = stages[i];
        console.log(`\n=== Этап ${i + 1}/${stages.length}: ${stage.title || name} ===`);
        await stage(ctx);
    }

    console.log('\nУстановка и настройка завершены.');
    console.log('Для запуска сервисов выполните: npm start');
}

main().catch((error) => {
    console.error('\nОшибка:', error.message || error);
    process.exit(1);
});
