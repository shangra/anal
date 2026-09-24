/**
 * Collect даёт одно const-имя двум разным AbstractConnector.js.
 * Разбор по строкам, без глобальной замены require/module.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const LINE_RE =
    /^const (\w+) = require\((['"])(.+?)\2\);?\s*$/;

const RESERVED = new Set([
    'require',
    'module',
    'exports',
    'import',
    'export',
    'default',
    'global',
    'process',
    'Buffer',
    '__dirname',
    '__filename',
    'console',
    'undefined',
    'eval',
    'arguments',
]);

function pascal(part) {
    return String(part)
        .replace(/\.js$/i, '')
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
}

function identFromRequire(req) {
    const parts = String(req)
        .replace(/^\.\//, '')
        .replace(/\\/g, '/')
        .replace(/\.js$/i, '')
        .split('/')
        .filter((p) => p && p !== 'services');
    let ident = parts.map(pascal).join('') || 'CollectedModule';
    if (/^\d/.test(ident)) {
        ident = `M${ident}`;
    }
    if (RESERVED.has(ident)) {
        ident = `Ident${ident}`;
    }
    return ident;
}

function uniqueIdent(base, used) {
    let name = base;
    let n = 2;
    while (used.has(name) || RESERVED.has(name)) {
        name = `${base}${n}`;
        n += 1;
    }
    used.add(name);
    return name;
}

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return 0;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const nl = raw.includes('\r\n') ? '\r\n' : '\n';
    const lines = raw.split(/\r?\n/);
    const used = new Set();
    const firstReqByName = new Map();
    const extras = {};

    for (let i = 0; i < lines.length; i++) {
        const matched = lines[i].match(LINE_RE);
        if (!matched) {
            continue;
        }
        const [, name, quote, req] = matched;
        if (RESERVED.has(name)) {
            continue;
        }
        if (!firstReqByName.has(name)) {
            firstReqByName.set(name, req);
            used.add(name);
            continue;
        }
        const neu = uniqueIdent(identFromRequire(req), used);
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

    fs.writeFileSync(filePath, text);
    console.log(
        `core:collect: ${path.basename(filePath)} — дубли: ${names.join(', ')}`
    );
    return names.length;
}

function fixGeneratedIdents(root) {
    const ext = path.join(root, 'ext_modules');
    const files = ['services.js', 'rest.js', 'hooks.js', 'models.js', 'index.js'];
    let total = 0;
    for (const name of files) {
        total += fixFile(path.join(ext, name));
    }
    if (!total) {
        console.log(
            'core:collect: дублей const в generated-файлах не найдено (проверьте, что postprocess вообще запустился).'
        );
    }
    return total;
}

module.exports = { fixGeneratedIdents, fixFile };

if (require.main === module) {
    const n = fixGeneratedIdents(path.join(__dirname, '..'));
    process.exit(n < 0 ? 1 : 0);
}
