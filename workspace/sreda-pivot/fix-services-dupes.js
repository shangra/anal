'use strict';

const fs = require('fs');
const path = require('path');

function toPascal(part) {
    return String(part)
        .replace(/\.js$/i, '')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
}

function nameFromRequire(req) {
    const posix = String(req).replace(/^\.\//, '').replace(/\\/g, '/').replace(/\.js$/i, '');
    const parts = posix.split('/').filter(Boolean);
    const mod = parts[0] || 'Mod';
    const afterServices = posix.includes('/services/')
        ? posix.split('/services/')[1]
        : parts.slice(1).join('/');
    const segs = String(afterServices)
        .split('/')
        .filter(Boolean)
        .map(toPascal);
    const ident = [toPascal(mod), ...segs].join('');
    return /^\d/.test(ident) ? `M${ident}` : ident;
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

function sync() {
    const file = path.join(__dirname, 'ext_modules', 'services.js');
    if (!fs.existsSync(file)) {
        return;
    }
    const raw = fs.readFileSync(file, 'utf8');
    const nl = raw.includes('\r\n') ? '\r\n' : '\n';
    const lines = raw.split(/\r?\n/);
    const lineRe = /^const (\w+) = require\((['"])(.+?)\2\);?\s*$/;
    const used = new Set();
    const extras = {};
    let changed = false;

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
        const neu = uniqueName(nameFromRequire(req), used);
        lines[i] = `const ${neu} = require(${quote}${req}${quote});`;
        extras[name] = extras[name] || [];
        extras[name].push(neu);
        changed = true;
    }

    if (!changed) {
        return;
    }

    let text = lines.join(nl);
    for (const oldName of Object.keys(extras)) {
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
        '[fix-services-dupes] разведены дубли const в ext_modules/services.js'
    );
}

module.exports = { sync };

if (require.main === module) {
    sync();
}
