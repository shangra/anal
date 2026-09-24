/**
 * Collect схлопывает разные пути в одно const-имя.
 * Правим только строки `const X = require` и значения `{ key: X }`.
 * Глобальная замена \\bX\\b ломала require/module.exports.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRE_RE = /^const (\w+) = require\((['"])(.+?)\2\);/gm;

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
    'const',
    'let',
    'var',
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
    const parts = req
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
    const src = fs.readFileSync(filePath, 'utf8');
    const rows = [];
    REQUIRE_RE.lastIndex = 0;
    let match;
    while ((match = REQUIRE_RE.exec(src))) {
        rows.push({
            oldName: match[1],
            quote: match[2],
            req: match[3],
        });
    }
    const counts = {};
    for (const row of rows) {
        counts[row.oldName] = (counts[row.oldName] || 0) + 1;
    }
    const dupes = new Set(
        Object.keys(counts).filter(
            (name) => counts[name] > 1 && !RESERVED.has(name)
        )
    );
    if (!dupes.size) {
        return 0;
    }

    const used = new Set(
        rows.map((row) => row.oldName).filter((name) => !dupes.has(name))
    );
    const queues = {};
    for (const row of rows) {
        if (!dupes.has(row.oldName)) {
            row.newName = row.oldName;
            continue;
        }
        row.newName = uniqueIdent(identFromRequire(row.req), used);
        queues[row.oldName] = queues[row.oldName] || [];
        queues[row.oldName].push(row.newName);
    }

    let out = src.replace(REQUIRE_RE, (full, name, quote, req) => {
        const row = rows.find(
            (item) => item.oldName === name && item.req === req && !item.done
        );
        if (!row) {
            return full;
        }
        row.done = true;
        return `const ${row.newName} = require(${quote}${req}${quote});`;
    });

    for (const oldName of dupes) {
        const queue = (queues[oldName] || []).slice();
        out = out.replace(
            new RegExp(`(:\\s*)${oldName}\\b`, 'g'),
            (_, prefix) => {
                const next =
                    queue.length > 1 ? queue.shift() : queue[0] || oldName;
                return `${prefix}${next}`;
            }
        );
    }

    fs.writeFileSync(filePath, out);
    return dupes.size;
}

function fixGeneratedIdents(root) {
    const ext = path.join(root, 'ext_modules');
    const files = ['services.js', 'rest.js', 'hooks.js', 'models.js', 'index.js'];
    let total = 0;
    for (const name of files) {
        total += fixFile(path.join(ext, name));
    }
    if (total) {
        console.log(
            `core:collect: исправлены дубли имён в сгенерированных файлах (${total}).`
        );
    }
    return total;
}

module.exports = { fixGeneratedIdents, fixFile };

if (require.main === module) {
    fixGeneratedIdents(path.join(__dirname, '..'));
}
