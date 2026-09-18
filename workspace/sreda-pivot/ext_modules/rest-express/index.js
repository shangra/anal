const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const { checkSchema, validationResult } = require('express-validator');
const ApiError = require('../../core/exceptions/ApiError');

function validateMiddleware(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.BadRequest('Ошибка при валидации', errors.array());
    } else {
        next();
    }
}

/**
 * @implements {IRestWrapper}
 */
class ExpressRouterWrapper {
    constructor(origin) {
        this.origin = origin;
        this.router = this.origin();

        Object.freeze(this);
    }

    init() {
        this.router.disable('etag');
        this.router.use(logger('dev'));
        this.router.use(this.origin.urlencoded({ extended: false }));
        this.router.use(cookieParser());
        this.router.use(bodyParser.text());
        this.router.use(this.origin.static(path.join(process.cwd(), 'public')));
        this.router.use(this.origin.json({ limit: `${sreda.env.JSON_REQUEST_LIMIT ?? 10}mb` }));

        return this;
    }

    start(req, res) {
        this.router(req, res);

        return this;
    }

    disable(...args) {
        this.router.disable(...args);

        return this;
    }

    use(...args) {
        args = args.map((arg) =>
            arg.constructor.name === this.constructor.name ? arg.router : arg
        );

        this.router.use(...args);

        return this;
    }

    route(...args) {
        // TODO
        // for (let i = 0; i < args.length; i < args.length) {
        //     if (typeof args[i] === 'object' && args[i].schema) {
        //         args.splice(i, 1, [checkSchema(args[i].schema), validateMiddleware]);
        //     }
        // }

        return this.router.route(...args);
    }

    Router() {
        return new ExpressRouterWrapper(this.origin.Router);
    }
}

module.exports = new ExpressRouterWrapper(express).init();
