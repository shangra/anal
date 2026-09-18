const ApiError = require('../../../core/exceptions/ApiError');
const { validationResult } = require('express-validator');

function validateMiddleware(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.BadRequest('Ошибка при валидации', errors.array());
    } else {
        next();
    }
}

module.exports = validateMiddleware;
