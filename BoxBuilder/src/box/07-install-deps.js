'use strict';

const fs = require('fs');
const path = require('path');
const { listWorkspaces, runNpm } = require('./_utils');

const MISSING_VERSION = /No matching version found for (@?[^\s@]+)@/g;
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
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

function isInside(child, parent) {
    const rel = path.relative(parent, child);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Корень, чей package.json реально читает npm: родитель с workspaces, иначе сам пакет. */
function findInstallRoot(dir, limitRoot) {
    const limit = path.resolve(limitRoot);
    let current = path.resolve(dir);
    let root = current;
    while (isInside(current, limit)) {
        const pkgPath = path.join(current, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                if (Array.isArray(pkg.workspaces) && pkg.workspaces.length) root = current;
            } catch (error) {
                /* повреждённый package.json не считаем корнем */
            }
        }
        if (current === limit) break;
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return root;
}

function walkPackages(dir, visit) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.box-skipped' || entry.name === '.git') continue;
        const target = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkPackages(target, visit);
            continue;
        }
        if (entry.name === 'package.json' || entry.name === 'package-lock.json') visit(target);
    }
}

function skipPackage(installRoot, name) {
    const id = name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const stubDir = path.join(installRoot, '.box-skipped', id);
    fs.mkdirSync(stubDir, { recursive: true });
    fs.writeFileSync(
        path.join(stubDir, 'package.json'),
        `${JSON.stringify({ name, version: '0.0.0' }, null, 2)}\n`,
        'utf8'
    );

    walkPackages(installRoot, (file) => {
        if (path.basename(file) === 'package-lock.json') {
            fs.rmSync(file, { force: true });
            return;
        }
        const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
        let changed = false;
        for (const field of DEP_FIELDS) {
            if (pkg[field] && Object.prototype.hasOwnProperty.call(pkg[field], name)) {
                delete pkg[field][name];
                changed = true;
            }
        }
        if (path.resolve(file) === path.resolve(installRoot, 'package.json')) {
            pkg.overrides = pkg.overrides || {};
            pkg.overrides[name] = `file:./.box-skipped/${id}`;
            changed = true;
        }
        if (changed) fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    });
}

function installOne(dir, boxRoot) {
    const installRoot = findInstallRoot(dir, boxRoot);
    const skipped = new Set();
    for (let attempt = 0; attempt <= MAX_SKIPS; attempt += 1) {
        const result = runNpm(['i', '--legacy-peer-deps'], {
            cwd: installRoot,
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
            console.log(`${path.basename(installRoot)}: нет на публичном npm, пропущен ${name}`);
            skipPackage(installRoot, name);
            skipped.add(name);
        }
    }
    throw new Error(`Не удалось установить зависимости в ${path.basename(dir)}`);
}

/** Этап 7. npm i. Пакетов, которых нет на публичном npm, не останавливают установку. */
async function installDeps(ctx) {
    const services = listWorkspaces(ctx.rootDir);
    if (services.length === 0) {
        console.log('Сервисы не найдены, этап пропущен.');
        return;
    }

    const seen = new Set();
    for (const dir of services) {
        const installRoot = findInstallRoot(dir, ctx.rootDir);
        if (seen.has(installRoot)) continue;
        seen.add(installRoot);
        console.log(`${path.basename(dir)}: npm i --legacy-peer-deps`);
        installOne(dir, ctx.rootDir);
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
