const { options } = require('../config/config');
const CacheStoreFunc = require('../middleware.local/cache-file-store');

const cacheParser = function (req, res, next) {
    // Вызывается при каждом запросе
    const CacheStore = CacheStoreFunc(options);
    CacheStore.then((data) => {
        // todo убрать везде примеси из req, использовать контекст
        req.cached = data;
        next();
    }).catch(next);
};
module.exports = cacheParser;
