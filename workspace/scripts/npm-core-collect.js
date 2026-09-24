/**
 * Обёртка npm run core:collect без правок ядра.
 * core/command/build/platform.js делает path.join(..., platform[key])
 * и падает, если в package.json.platform лежит объект (structure/core).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const buildEntry = path.join(root, 'core', 'command', 'build');

if (!fs.existsSync(pkgPath)) {
    console.error('core:collect: нет package.json в', root);
    process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const platform = pkg.platform && typeof pkg.platform === 'object' ? pkg.platform : {};
const cleaned = {};
for (const [key, value] of Object.entries(platform)) {
    if (typeof value === 'string' && value.trim()) {
        cleaned[key] = value;
    }
}

if (JSON.stringify(platform) !== JSON.stringify(cleaned)) {
    pkg.platform = cleaned;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`);
    console.log(
        'core:collect: из package.json.platform убраны не-строки (structure/core), иначе path.join падает.'
    );
}

const buildJs = fs.existsSync(buildEntry)
    ? buildEntry
    : fs.existsSync(`${buildEntry}.js`)
      ? `${buildEntry}.js`
      : null;

if (!buildJs) {
    console.error(
        'core:collect: нет core/command/build. Это штатный сборщик NodeCMS, его нельзя подменить правкой ядра. Скопируйте каталог core/command/build из исходного pivot и повторите npm run core:collect.'
    );
    process.exit(1);
}

const result = spawnSync(process.execPath, [buildJs, ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
