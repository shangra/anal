const ApiError = require('../../../core/exceptions/ApiError');
const httpContext = require('../../../core/services/http-context');

/**
 * @param {string[]} accessRules
 * @param {boolean} [oneOf]
 * @returns
 */
function checkAccess(accessRules, oneOf = false) {
    return (req, res, next) => {
        const sessionStorage = httpContext.get('sessionStorage');

        const userRules = sessionStorage?.user?.rulesName || {};
        let isAllowed = true;
        // todo включить проверку на администратора после добавления всех доступов

        // if (!userRules['Administrator']) {
        if (oneOf) {
            isAllowed = accessRules.some((i) => userRules[i]);
        } else {
            isAllowed = accessRules.every((i) => userRules[i]);
        }
        // for (const rule of accessRules) {
        //     if (!userRules[rule]) {
        //         isAllowed = false;
        //         break;
        //     }
        // }
        // }
        if (isAllowed) {
            next();
        } else {
            next(ApiError.AccessRestricted('Доступ отсутствует'));
        }
    };
}

module.exports = checkAccess;
