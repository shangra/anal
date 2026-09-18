const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const copy = require('rollup-plugin-copy');
const json = require('@rollup/plugin-json');
const fs = require('fs');

// TODO Для env нужен образец с незаполненными переменными, пока копируем наш для теста
// TODO Скорее всего и package.json надо переработать

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = Object.keys({
    ...pkg.dependencies || {},
    ...pkg.devDependencies || {},
    ...pkg.peerDependencies || {},
    ...pkg.optionalDependencies || {}
});

module.exports = {
    input: 'server.js',
    output: {
        file: 'dist-temp/bundle.js',
        format: 'cjs',
        inlineDynamicImports: true,
    },
    external: allDeps,
    plugins: [
        json(),
        resolve({ preferBuiltins: false }),
        commonjs({ ignoreDynamicRequires: true }),
        copy({
            targets: [
                { src: '.env', dest: 'dist/' },
                {
                    src: 'package.json',
                    dest: 'dist/',
                    transform: (contents) => {
                        const pkg = JSON.parse(contents.toString());
                        delete pkg.scripts;
                        delete pkg.devDependencies;
                        return JSON.stringify(pkg, null, 2);
                    }
                },
                { src: 'package-lock.json', dest: 'dist/' }
            ],
            verbose: true
        })
    ]
};