const fsp = require('fs').promises;
const path = require('path');
const { DumpMeta } = sreda.models;
const loadDumpsFromDir = require('./loadDumpsFromDir');

async function loadAllExtDumps(extArr) {
    if (!Array.isArray(extArr)) {
        throw new Error('Должен быть передан массив имен расширений');
    }
    console.log('Чистим таблицу с мета информацией дампов');
    if (DumpMeta) {
        await DumpMeta.truncate({});
    }

    const extCheckPromises = extArr.map((extName) => {
        const dumpDirPath = path.join(process.cwd(), 'ext_modules', extName, 'db/dumps');
        return fsp
            .stat(dumpDirPath)
            .then(() => dumpDirPath)
            .catch(() => false);
    });

    const dumpDirs = await Promise.all(extCheckPromises).then((data) => data.filter((elem) => elem));

    const asyncIterator = {
        [Symbol.asyncIterator]() {
            return {
                i: 0,
                next() {
                    const dir = dumpDirs[this.i];
                    if (this.i < dumpDirs.length) {
                        this.i++;
                        return loadDumpsFromDir(dir).then((data) => ({ value: data, done: false }));
                    }
                    return Promise.resolve({ done: true });
                },
            };
        },
    };
    console.log('ЗАГРУЗКА ДАМПОВ');
    const result = [];
    for await (const data of asyncIterator) {
        result.push(data);
    }
    return result;
}

module.exports = loadAllExtDumps;
