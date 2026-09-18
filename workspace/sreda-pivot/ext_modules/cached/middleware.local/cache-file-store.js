const { promises: fsPromises } = require('fs');
const path = require('path');

/**
 * @typedef {object} TCacheStoreOptions
 * @property {string} [path="cache"] Путь хранения кеша
 * @property {number} [lifetime=1209600000] Время жизни кеша
 * @property {number} [cleaningPeriod=3600000] Частота очистки
 */

/**
 * @typedef {object} TCacheStoreFunc
 * @property {TCacheStoreOptions} options
 * @property {(name: string) => Promise<string | void>} get
 * @property {(name: string, value: string) => Promise<void>} set
 * @property {(name: string) => Promise<boolean>} del
 */

/**
 * @param {TCacheStoreOptions} options
 * @returns {Promise<TCacheStoreFunc>}
 */
module.exports = async ({
    lifetime = 1209600000,
    path: target = 'cache',
    cleaningPeriod = 3600000,
}) => {
    // Создаем здесь папку для кешей инициализируем функции записи и чтение кешей
    const cachePath = path.join(sreda.env.VAR, target);

    try {
        await fsPromises.mkdir(cachePath, { recursive: true });
    } catch (e) {
        if (e.code !== 'EEXIST') throw e;
    }

    // Возвращает все файлы кэша в директории
    const _getCacheFromDir = async (dirname) => {
        const items = await fsPromises.readdir(dirname, { withFileTypes: true, recursive: true });
        return Promise.all(
            items
                .filter((i) => i.isFile())
                .map(async (i) => {
                    const filepath = path.join(i.parentPath, i.name);
                    const stats = await fsPromises.stat(filepath);
                    return { path: filepath, stats };
                })
        );
    };

    // Очищает устаревший кеш
    const clearOldCache = async () => {
        try {
            const stats = await _getCacheFromDir(cachePath);
            const removed = stats
                .filter(({ stats: s }) => s.mtimeMs + lifetime < +Date.now())
                .map(({ path: p, stats: s }) => {
                    return fsPromises
                        .unlink(p)
                        .then(() =>
                            console.debug(
                                '--- DELETE CACHE ---',
                                new Date(s.mtimeMs + lifetime).toISOString(),
                                p
                            )
                        );
                });

            return Promise.allSettled(removed).finally(() =>
                console.log('Проведена очистка просроченных кешей')
            );
        } catch (e) {
            console.error(e);
        }
    };

    if (!global.cacheIntervals) global.cacheIntervals = {};
    // 1000 - 1 сек / 60000 - 1 минута / 3600000 - 1 час / 86400000 - 1 день (24 часа) / 1209600000
    global.cacheIntervals[target] ??= setInterval(clearOldCache, cleaningPeriod).unref();

    const getCacheFile = async (name) => {
        const newName = name.split('/').slice(0, -1).join('/');

        try {
            await fsPromises.mkdir(path.join(cachePath, newName), { recursive: true });
        } catch (e) {
            if (e.code !== 'EEXIST') throw e;
        }

        return path.join(cachePath, `${name}.json`);
    };

    // Получить кеш по имени
    /** @type {(name: string) => Promise<string | void>} */
    const get = async (name) => {
        if (!name) return;

        const cacheFile = await getCacheFile(name);

        return fsPromises
            .readFile(cacheFile, { encoding: 'utf-8', flag: 'rs' })
            .then((content) => Buffer.from(content, 'base64').toString('utf-8'))
            .catch((e) => console.debug('ОШИБКА ПОЛУЧЕНИЯ КЕША для: ', name, e));
    };

    // Установить кеш по имени
    /** @type {(name: string, value: string) => Promise<void>} */
    const set = async (name, value) => {
        if (!name) return;

        const cacheFile = await getCacheFile(name);

        await fsPromises
            // Раньше предварительно удалялся существующий файл. Не знаю зачем, ведь writeFile заменяет содержимое
            .writeFile(cacheFile, Buffer.from(value).toString('base64'), 'utf-8')
            .then(() => console.debug('save cache to ', cacheFile))
            .catch(console.error);
    };

    // Удалить кеш по имени
    /** @type {(name: string) => Promise<boolean>} */
    const del = async (name) => {
        if (!name) return;

        const cacheFile = await getCacheFile(name);

        return fsPromises
            .unlink(cacheFile)
            .then(() => console.debug('Cache free for: ', name))
            .catch(() =>
                fsPromises
                    .rm(path.join(cachePath, `${name}`), { recursive: true })
                    .then(() => console.debug('Cache free pack for: ', name))
            )
            .then(() => true)
            .catch(() => false);
    };

    return { options: { lifetime, path: target, cleaningPeriod }, get, set, del };
};
