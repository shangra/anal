/**
 * Collect схлопывает разные пути в одно const-имя
 * (два AbstractConnector.js → Identifier has already been declared).
 * Ядро не трогаем: правим уже сгенерированные index-файлы.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRE_RE = /^const (\w+) = require\((['"])(.+?)\2\);/gm;

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
    const ident = parts.map(pascal).join('') || 'Module';
    return /^\d/.test(ident) ? `M${ident}` : ident;
}

function uniqueIdent(base, used) {
    let name = base;
    let n = 2;
    while (used.has(name)) {
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
            index: match.index,
            text: match[0],
        });
    }
    const counts = {};
    for (const row of rows) {
        counts[row.oldName] = (counts[row.oldName] || 0) + 1;
    }
    const dupes = new Set(
        Object.keys(counts).filter((name) => counts[name] > 1)
    );
    if (!dupes.size) {
        return 0;
    }

    const used = new Set(rows.map((row) => row.oldName).filter((name) => !dupes.has(name)));
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
        const queue = queues[oldName] || [];
        out = out.replace(new RegExp(`\\b${oldName}\\b`, 'g'), () => {
            if (queue.length > 1) {
                return queue.shift();
            }
            return queue[0] || oldName;
        });
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
