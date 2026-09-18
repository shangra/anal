const path = require('path');

sreda = {};
sreda.env = {};
if (process.env) {
    Object.keys(process.env).forEach((key) => {
        try {
            sreda.env[key] = JSON.parse(process.env[key]);
        } catch (e) {
            sreda.env[key] = process.env[key];
        }
    });
}

/** DEFAULTS */
sreda.env.NODE_ENV = process.env.NODE_ENV || 'development';
sreda.env.VAR = path.resolve(
    process.cwd(),
    process.env.VAR ?? 'var',
    sreda.env.NODE_ENV
);

module.exports = {};
