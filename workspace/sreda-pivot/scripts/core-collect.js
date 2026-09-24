/**
 * npm run core:collect в sreda-pivot без правок ядра и без записи package.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const shim = path.join(__dirname, 'collect-platform-shim.js');
const buildEntry = path.join(root, 'core', 'command', 'build');

const buildJs = fs.existsSync(buildEntry)
    ? buildEntry
    : fs.existsSync(`${buildEntry}.js`)
      ? `${buildEntry}.js`
      : null;

if (!buildJs) {
    console.error(
        'core:collect: нет core/command/build. Скопируйте каталог core/command/build из исходного pivot.'
    );
    process.exit(1);
}

const result = spawnSync(
    process.execPath,
    ['-r', shim, buildJs, ...process.argv.slice(2)],
    {
        cwd: root,
        stdio: 'inherit',
        env: process.env,
    }
);

process.exit(result.status === null ? 1 : result.status);
