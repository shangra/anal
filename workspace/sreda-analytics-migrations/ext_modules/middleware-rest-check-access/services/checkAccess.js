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

        const UserRule = sessionStorage?.user?.rulesName || {};
        let isAllowed = true;
        // todo включить проверку на администратора после добавления всех доступов

        // if (!UserRule['Administrator']) {
        if (oneOf) {
            isAllowed = accessRules.some((i) => UserRule[i]);
        } else {
            isAllowed = accessRules.every((i) => UserRule[i]);
        }
        // for (const rule of accessRules) {
        //     if (!UserRule[rule]) {
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
