const path = require('path');
const fs = require('fs');

const ext = 'ext_modules'
const main_path = path.resolve(__dirname, ext);
const dirs = fs.readdirSync(main_path);

const text = `{
    "name": "[[NAME]]",
    "version": "1.0.0",
    "description": "",
    "enabled": true,
    "scripts": {
        "build": "LOG_LEVEL=1 node ../../core/command/build",
        "pretest": "npm run build -- -d ../__mocks__",
        "test": "cd ../../ && NODE_ENV=test jest --runInBand --coverage --no-cache -i ext_modules/$npm_package_name/__tests__/tests",
        "posttest": "rm -rf ../__mocks__"
    },
    "dependencies": {
        "sequelize": "^6.26.0"
    },
    "extensions": {},
    "routes": {},
    "typeSBR": "NodeCMS",
    "dependenciesNodeCMS": {}
}`

for (const dir of dirs) {
    const p = path.join(main_path, dir, 'package.json');
    const stat = fs.statSync(path.join(main_path, dir));
    if (stat.isDirectory()) {
        const c = fs.existsSync(p);
        if (!c) {
            fs.appendFileSync(p, text.replace('[[NAME]]', dir));
        }
    }
}