const fsp = require('fs').promises;

require('../../../core');

const DumpBDService = require('../../dump-cms/services/DumpDB.service');

async function loadDumpsFromDir(dir) {
    const files = await fsp.readdir(dir);
    const absoluteFilePaths = files.map((fileName) => `${dir}/${fileName}`);
    const asyncIterator = {
        [Symbol.asyncIterator]() {
            return {
                i: 0,
                next() {
                    const path = absoluteFilePaths[this.i];
                    if (this.i < absoluteFilePaths.length) {
                        this.i++;
                        return DumpBDService.restoreFromFile(path).then((data) => ({ value: data, done: false }));
                    }
                    return Promise.resolve({ done: true });
                },
            };
        },
    };
    const result = [];
    for await (const data of asyncIterator) {
        result.push(data);
    }
    return result;
}

module.exports = loadDumpsFromDir;
