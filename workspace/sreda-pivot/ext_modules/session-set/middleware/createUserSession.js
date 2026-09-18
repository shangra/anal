const path = require('path');
const httpContext = require('../../../core/services/http-context');
const ApiError = require('../../../core/exceptions/ApiError');
// const v8 = require('v8');

const options = {
    path: sreda.env.SESSIONS_DIR || 'sessions',
    lifetime: +(sreda.env.SESSIONS_LIFETIME ?? 1209600000),
};
const CacheStoreFunc = require('../../cached/middleware.local/cache-file-store');

const createUserSession = async (req, res, next) => {
    const CacheStore = await CacheStoreFunc(options);
    req.sessionCache = CacheStore;

    let sessionStorage = httpContext.get('sessionStorage');
    if (!sessionStorage.user) {
        sessionStorage.user = {};
    }

    if (sessionStorage.SID) {
        try {
            const name = sessionStorage.SID.slice(2, 34);
            const data = await CacheStore.get(name);
            if (data) {
                sessionStorage = JSON.parse(data);
            }
        } catch (e) {
            return next(new ApiError(500, e.message));
        }
    }

    // const sessionStorageOriginalSerialized = v8.serialize(sessionStorage).toString('utf8');
    const sessionStorageOriginalSerialized = JSON.stringify(sessionStorage);
    httpContext.set('sessionStorage', sessionStorage);

    const protoEnd = res.end.bind(res);
    res.end = function (...args) {
        const sessionStorageCurrent = httpContext.get('sessionStorage');
        if (sessionStorageCurrent && sessionStorageCurrent.SID) {
            const name = sessionStorageCurrent.SID.slice(2, 34);
            const sessionStorageCurrentSerialized = JSON.stringify(
                sessionStorageCurrent
            );
            // const sessionStorageCurrentSerialized = v8.serialize(sessionStorageCurrent).toString('utf8');
            // TODO: serialized ALWAYS different
            // if (sessionStorageCurrentSerialized !== sessionStorageOriginalSerialized) {
            if (
                sessionStorageCurrentSerialized !==
                sessionStorageOriginalSerialized
            ) {
                res.req.sessionCache
                    .set(name, sessionStorageCurrentSerialized)
                    .then(() => {
                        protoEnd(...args);
                    });
            } else {
                protoEnd(...args);
            }
        } else {
            protoEnd(...args);
        }
    };

    next();
};

module.exports = createUserSession;
