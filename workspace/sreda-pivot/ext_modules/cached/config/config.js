const path = require('node:path');

const options = {
    path: sreda.env.CACHE_PATH || 'cache',
    lifetime: +(sreda.env.CACHE_LIFETIME ?? 1209600000),
};

module.exports = { options };
