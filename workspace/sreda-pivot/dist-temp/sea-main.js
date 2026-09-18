// входная точка исполняемого файла: сам бандл лежит в assets exe,
// а require строится от папки с exe, чтобы видел node_modules рядом с ним
const path = require('node:path');
const vm = require('node:vm');
const sea = require('node:sea');
const { createRequire } = require('node:module');

const execDir = path.dirname(process.execPath);
const filename = path.join(execDir, 'bundle-obf.js');
const code = sea.getAsset('bundle-obf', 'utf8');

const mod = { exports: {} };
const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) {\n${code}\n})`,
    { filename }
);
wrapper(mod.exports, createRequire(filename), mod, filename, execDir);
