'use strict';

function toPascal(part) {
    return String(part)
        .replace(/\.js$/i, '')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
}

/**
 * Имя const для collect: модуль + ВЕСЬ относительный путь.
 * metadata/connectors/AbstractConnector и connectors/AbstractConnector
 * больше не схлопываются в AbstractconnectorAbstractConnector.
 */
function serviceConstName(moduleName, relFromServices) {
    const parts = String(relFromServices)
        .replace(/\\/g, '/')
        .replace(/\.js$/i, '')
        .split('/')
        .filter(Boolean);
    const name = [toPascal(moduleName), ...parts.map(toPascal)].join('');
    return /^\d/.test(name) ? `M${name}` : name;
}

function uniqueName(base, used) {
    let name = base;
    let n = 2;
    while (used.has(name)) {
        name = `${base}${n}`;
        n += 1;
    }
    used.add(name);
    return name;
}

module.exports = { toPascal, serviceConstName, uniqueName };
