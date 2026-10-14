'use strict';

const fs = require('fs');
const path = require('path');
const { listWorkspaces, runNpm } = require('./_utils');

const MISSING_VERSION = /No matching version found for (@?[^\s@]+)@/g;
const MAX_SKIPS = 40;

function missingPackages(text) {
    const names = [];
    const source = String(text || '');
    MISSING_VERSION.lastIndex = 0;
    let match = MISSING_VERSION.exec(source);
    while (match) {
        if (!names.includes(match[1])) names.push(match[1]);
        match = MISSING_VERSION.exec(source);
    }
    return names;
}

function skipPackage(dir, name) {
    const id = name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const stubDir = path.join(dir, '.box-skipped', id);
    fs.mkdirSync(stubDir, { recursive: true });
    fs.writeFileSync(
        path.join(stubDir, 'package.json'),
        `${JSON.stringify({ name, version: '0.0.0' }, null, 2)}\n`,
        'utf8'
    );

    const pkgPath = path.join(dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.overrides = pkg.overrides || {};
    pkg.overrides[name] = `file:./.box-skipped/${id}`;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

    const lockPath = path.join(dir, 'package-lock.json');
    if (fs.existsSync(lockPath)) fs.rmSync(lockPath, { force: true });
}

function installOne(dir) {
    const skipped = new Set();
    for (let attempt = 0; attempt <= MAX_SKIPS; attempt += 1) {
        const result = runNpm(['i', '--legacy-peer-deps'], {
            cwd: dir,
            encoding: 'utf8',
            stdio: 'pipe',
        });
        const output = `${result.stdout || ''}${result.stderr || ''}`;
        if (output) process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
        if (result.status === 0) return;

        const missing = missingPackages(output).filter((name) => !skipped.has(name));
        if (missing.length === 0) {
            throw new Error(`Не удалось установить зависимости в ${path.basename(dir)}`);
        }
        for (const name of missing) {
            console.log(`${path.basename(dir)}: нет на публичном npm, пропущен ${name}`);
            skipPackage(dir, name);
            skipped.add(name);
        }
    }
    throw new Error(`Не удалось установить зависимости в ${path.basename(dir)}`);
}

/** Этап 7. npm i в каждом сервисе. Пакетов, которых нет на публичном npm, не останавливают установку. */
async function installDeps(ctx) {
    const services = listWorkspaces(ctx.rootDir);
    if (services.length === 0) {
        console.log('Сервисы не найдены, этап пропущен.');
        return;
    }

    for (const dir of services) {
        console.log(`${path.basename(dir)}: npm i --legacy-peer-deps`);
        installOne(dir);
    }
    console.log('Зависимости установлены.');
}

module.exports = installDeps;
module.exports.title = 'Установка зависимостей';

if (require.main === module) {
    installDeps({ rootDir: path.join(__dirname, '..') }).catch((error) => {
        console.error('\nОшибка:', error.message || error);
        process.exit(1);
    });
}
