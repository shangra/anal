const ApiError = require('../../../core/exceptions/ApiError');
const httpContext = require('../../../core/services/http-context');

const { ADMINISTRATOR_ID, METADATA_ADMINISTRATOR_ID } = require("../../schemas-manager/constants");

class RestrictedSchemasManager {
    async editSchemaBefore(inner, fargs) {
        const [schemaInfo] = fargs._args;
        if (schemaInfo.forAll === true) {
            const sessionStorage = httpContext.get('sessionStorage');
            const userRules = sessionStorage?.user?.rules || {};

            if (
                !(ADMINISTRATOR_ID in userRules)
                && !(METADATA_ADMINISTRATOR_ID in userRules)
            ) {
                throw ApiError.AccessRestricted('Общедоступную схему может создать только администратор');
            }
        }

        return inner;
    }
}

module.exports = RestrictedSchemasManager;