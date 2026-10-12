'use strict';

const { openPrompt, writeRootEnv } = require('./_utils');

const MODE_BY_ANSWER = {
    1: 'install',
    2: 'update',
    'установка': 'install',
    'обновление': 'update',
    install: 'install',
    update: 'update',
};

const MODE_LABEL = {
    install: 'Установка',
    update: 'Обновление',
};

/** Этап 4. Опрос режима работы (Установка/Обновление); ответ сохраняется в state и в корневой .env (BOX_MODE) */
async function askMode(ctx) {
    const prompt = openPrompt();
    let mode;
    try {
        console.log('Выберите режим работы:');
        console.log('  1 — Установка');
        console.log('  2 — Обновление');
        const answer = await prompt.ask('Режим [1/2]: ', (value) => Boolean(MODE_BY_ANSWER[value.toLowerCase()]));
        mode = MODE_BY_ANSWER[answer.toLowerCase()];
    } finally {
        prompt.close();
    }

    ctx.state.mode = mode;
    writeRootEnv(ctx.rootDir, { BOX_MODE: mode });
    console.log(`Режим: ${MODE_LABEL[mode]} (сохранён в .env как BOX_MODE=${mode})`);
}

module.exports = askMode;
module.exports.title = 'Выбор режима (Установка/Обновление)';
