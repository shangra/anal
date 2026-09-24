'use strict';

const fs = require('fs');
const path = require('path');
const { serviceConstName, uniqueName } = require('./uniqueIdent');

/**
 * После штатного collect: два AbstractConnector.js дают один const.
 * Правим только строки `const X = require("путь")` и значения `{ key: X }`.
 */
function fixServicesIdents() {
    const file = path.join(process.cwd(), 'ext_modules', 'services.js');
    if (!fs.existsSync(file)) {
        return 0;
    }
    const raw = fs.readFileSync(file, 'utf8');
    const nl = raw.includes('\r\n') ? '\r\n' : '\n';
    const lines = raw.split(/\r?\n/);
    const lineRe = /^const (\w+) = require\((['"])(.+?)\2\);?\s*$/;
    const used = new Set();
    const extras = {};

    for (let i = 0; i < lines.length; i++) {
        const matched = lines[i].match(lineRe);
        if (!matched) {
            continue;
        }
        const [, name, quote, req] = matched;
        if (!used.has(name)) {
            used.add(name);
            continue;
        }
        const rel = String(req)
            .replace(/^\.\//, '')
            .replace(/^metadata-connector\/services\//, '')
            .replace(/\\/g, '/');
        const neu = uniqueName(serviceConstName('metadata-connector', rel), used);
        lines[i] = `const ${neu} = require(${quote}${req}${quote});`;
        extras[name] = extras[name] || [];
        extras[name].push(neu);
    }

    const names = Object.keys(extras);
    if (!names.length) {
        return 0;
    }

    let text = lines.join(nl);
    for (const oldName of names) {
        const queue = extras[oldName].slice();
        let seen = 0;
        text = text.replace(
            new RegExp(`(:\\s*)${oldName}\\b`, 'g'),
            (all, prefix) => {
                seen += 1;
                if (seen === 1) {
                    return all;
                }
                const next = queue.shift();
                return next ? `${prefix}${next}` : all;
            }
        );
    }
    fs.writeFileSync(file, text);
    console.log(
        `core:collect: разведены дубли const в services.js (${names.join(', ')})`
    );
    return names.length;
}

module.exports = { fixServicesIdents };
