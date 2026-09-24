/**
 * Только на время core:collect: сборщик читает package.json.platform
 * и path.join падает на объектах structure/core.
 * Файл package.json на диске не меняем.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

function filterPlatformJson(text) {
    const json = JSON.parse(text);
    if (!json.platform || typeof json.platform !== 'object') {
        return text;
    }
    const next = {};
    let stripped = false;
    for (const [key, value] of Object.entries(json.platform)) {
        if (typeof value === 'string' && value.trim()) {
            next[key] = value;
        } else {
            stripped = true;
        }
    }
    if (!stripped) {
        return text;
    }
    json.platform = next;
    return JSON.stringify(json);
}

function looksLikePackageJson(file) {
    return path.basename(String(file)) === 'package.json';
}

const origReadFileSync = fs.readFileSync;
fs.readFileSync = function patchedReadFileSync(file, encoding, ...rest) {
    const data = origReadFileSync.call(this, file, encoding, ...rest);
    try {
        if (!looksLikePackageJson(file)) {
            return data;
        }
        const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
        if (!text.includes('"platform"')) {
            return data;
        }
        const out = filterPlatformJson(text);
        if (out === text) {
            return data;
        }
        if (typeof encoding === 'string' || encoding === null) {
            return out;
        }
        return Buffer.from(out);
    } catch (e) {
        return data;
    }
};

const origJson = Module._extensions['.json'];
Module._extensions['.json'] = function patchedJson(module, filename) {
    if (looksLikePackageJson(filename)) {
        try {
            const text = origReadFileSync.call(fs, filename, 'utf8');
            if (text.includes('"platform"')) {
                module.exports = JSON.parse(filterPlatformJson(text));
                return;
            }
        } catch (e) {
            // штатный json loader
        }
    }
    return origJson.call(this, module, filename);
};
