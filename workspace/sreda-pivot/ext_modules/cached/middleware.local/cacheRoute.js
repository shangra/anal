/** DEMO
 /dynpage/usernews/groups/test?nocache - отключает кеш
 * */

const setCache = (req, name, body) => {
    req.cached.set(name, body).catch(console.error);
    return true;
};

const getCache = async (req, name) => {
    const value = await req.cached.get(name);
    return value;
};

const delCache = (req, name) => {
    req.cached.del(name).catch(console.error);
    return true;
};

const getSetCacheMiddleware = async (req, res, next, options) => {
    let { name } = options;
    if (typeof options.name === 'function') {
        name = await options.name(req, res);
    }

    const protoWrite = res.write.bind(res);
    res.write = function (...args) {
        protoWrite(...args);
        if (name) {
            if (typeof args[0] === 'string') {
                res.locals.body =
                    res.locals.body === undefined ? args[0] : res.locals.body + args[0];
            } else if (Buffer.isBuffer(args[0])) {
                res.locals.body = res.locals.body === undefined ? Buffer.alloc(0) : res.locals.body;
                const totalLength = res.locals.body.length + args[0].length;
                res.locals.body = Buffer.concat([res.locals.body, args[0]], totalLength);
            }
        }
    };

    const protoEnd = res.end.bind(res);
    res.end = function (...args) {
        if (name) {
            if (typeof args[0] === 'string') {
                res.locals.body =
                    res.locals.body === undefined ? args[0] : res.locals.body + args[0];
            } else if (Buffer.isBuffer(args[0])) {
                res.locals.body = res.locals.body === undefined ? Buffer.alloc(0) : res.locals.body;
                const totalLength = res.locals.body.length + args[0].length;
                res.locals.body = Buffer.concat([res.locals.body, args[0]], totalLength);
            }

            if (!res.disableCache) {
                if (res.statusCode === 200) {
                    const contentType = res.getHeader('content-type');
                    const body = {
                        contentType,
                        body: Buffer.from(res.locals.body).toString('base64'),
                    };
                    setCache(req, name, JSON.stringify(body));
                } else {
                    console.log('КЕШ отклонен! Статус возврата: ', res.statusCode);
                }
            }
        }

        protoEnd(...args);
    };

    const nocache = req.query.nocache !== undefined;
    if (name && !nocache) {
        const cacheData = await getCache(req, name);
        if (cacheData) {
            const data = JSON.parse(cacheData);
            if (data.contentType && data.body) {
                res.setHeader('content-type', data.contentType);
                const dataBuffer = Buffer.from(data.body, 'base64');
                res.disableCache = true;
                res.send(dataBuffer);
                console.log('КЕШ отправлен по: ', req.originalUrl);
                return;
            }
        }
    }
    next();
};

const delCacheMiddleware = async (req, res, next, options) => {
    let { name } = options;
    if (typeof options.name === 'function') {
        name = options.name(req, res);
    }

    delCache(req, name);

    next();
};

const cached = (options) => {
    let result = getSetCacheMiddleware;
    if (options.delete) {
        result = delCacheMiddleware;
    }
    //
    return (req, res, next) => result(req, res, next, options).catch(console.error);
};

module.exports = { cached, getCache, setCache, delCache };
