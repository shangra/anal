const createError = require('http-errors');

const ApiError = require('./exceptions/ApiError');
const httpContext = require('./services/http-context');

const rest = require('../ext_modules/rest');

const middlewares = [];
const routers = {};

Object.values(rest).forEach(({ middlewares: m, routers: r }) => {
    middlewares.push(...m);

    Object.entries(r)
        .reverse()
        .forEach(([k, v]) => {
            routers[k] ||= [];
            routers[k].unshift(v);
        });
});

sreda.restmodule.use((req, res, next) => {
    const { CHECK_CERT, SERVER_KEY, SERVER_CERT, SERVER_CA } = process.env;
    const isHttps =
        CHECK_CERT === 'true' &&
        SERVER_KEY !== undefined &&
        SERVER_CERT !== undefined &&
        SERVER_CA !== undefined;

    if (isHttps) {
        res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains;'
        );
    }

    next();
});

// Собственная имплементация контекста
sreda.restmodule.use(httpContext.middleware);

for (const i in middlewares) {
    const module = middlewares[i];

    if (Array.isArray(module)) {
        sreda.restmodule.use(...module);
    } else if (typeof module === 'function') {
        sreda.restmodule.use(module);
    }
}

for (const route of [...Object.keys(routers)].reverse()) {
    for (const i in routers[route]) {
        sreda.restmodule.use(route, routers[route][i]);
    }
}

// Отдает список всех доступных маршрутов
sreda.restmodule.use('/core/routes', (req, res, next) => {
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(Object.keys(routers), null, 2));
});

// Отдает список всех подключенных модулей
sreda.restmodule.use('/core/modules', (req, res, next) => {
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(sreda.versions, null, 2));
});

sreda.restmodule.use('/ping', (req, res, next) => {
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify({ ping: 'pong' }, null, 2));
});

// errorMiddleware
sreda.restmodule.use(function (err, req, res, next) {
    console.error(err);

    const stack = typeof err === 'string' ? err : err.stack || '';

    res.status(err.errors?.[0]?.status || err.status || 500).json({
        stack,
        original: err.original || {},
        errors: err instanceof ApiError ? err.errors : [err.message],
        message: err.errors ? err.message : 'Непредвиденная ошибка',
        payload: err.payload,
    });
});
sreda.restmodule.use((req, res, next) => next(createError(404)));

module.exports = {};
