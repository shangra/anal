const ApiError = require('../../../core/exceptions/ApiError');
const httpContext = require('../../../core/services/http-context');

module.exports = function isUserOwner(req, res, next) {
    const { id } = req.params;

    const sessionStorage = httpContext.get('sessionStorage');
    if (sessionStorage.user.id !== String(id)) {
        throw ApiError.UnathorizedError();
    } else {
        next();
    }
};
