const BlockedResourceError = require('./BlockedResource.error');

class ApiError extends Error {
    constructor(status, message, errors = [], payload = {}) {
        super(message);
        this.status = status;
        this.errors = errors;
        this.payload = payload;
    }

    /**
     * @returns {ApiError}
     */
    static UnathorizedError() {
        return new ApiError(403, 'Пользователь не авторизован');
    }

    /**
     * @param {string} message
     * @param {Error[]} [errors=[]]
     * @returns {ApiError}
     */
    static NotFound(message, errors = [], payload = {}) {
        return new ApiError(404, message, errors, payload);
    }

    /**
     * @param {string} message
     * @param {Error[]} [errors=[]]
     * @returns {ApiError}
     */
    static BadRequest(message, errors = [], payload = {}) {
        return new ApiError(400, message, errors, payload);
    }

    /**
     * @param {string} message
     * @param {Error[]} [errors=[]]
     * @returns {ApiError}
     */
    static AccessRestricted(message, errors = [], payload = {}) {
        return new ApiError(423, message, errors, payload);
    }

    /**
     * Источник отключён (onoff). Имя сохранено как в вызывающем коде.
     * @returns {BlockedResourceError}
     */
    static ResourseBlocked(message, errors = [], payload = {}) {
        return new BlockedResourceError(423, message, errors, payload);
    }

    /**
     * @param {string} message
     * @param {Error[]} [errors=[]]
     * @returns {ApiError}
     */
    static ServerError(message, errors = [], payload = {}) {
        return new ApiError(500, message, errors, payload);
    }
}

module.exports = ApiError;
