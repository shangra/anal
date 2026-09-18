const ApiError = require('../../../core/exceptions/ApiError');
const httpContext = require('../../../core/services/http-context');

module.exports = function checkAuth(req, res, next) {
    const sessionStorage = httpContext.get('sessionStorage');
    if (!sessionStorage?.user?.id) {
        throw ApiError.UnathorizedError();
    } else {
        next();
    }
};
