const Extensions = require('../../../core/class/Extensions.class');

const httpContext = require('../../../core/services/http-context');

class MemorySaveExtHelpersService extends Extensions {
    /**
     * перегружаемый метод
     *
     * @returns {Promise<string>}
     */
    async getUserRoles() {
        const sessionStorage = httpContext.get('sessionStorage');
        return sessionStorage?.user?.id;
    }

    /**
     * перегружаемый метод
     */
    async getCache(innerResult, functionParams, originalMethod) {
        const { key } = functionParams;

        // FYI: наличие профилировщика правильно проверять не совсем так; см. MetaQueryExplainService

        const cacheEnabled =
            true && // кеш доступен по умолчанию, если только...
            !sreda.env.DISABLE_OVERRITE_CACHE; // ...не выключен из env
        // && (null == httpContext.get('explain')) // ...и не активен профилировщик
        let result = cacheEnabled ? await originalMethod.apply(this, [key]) : null;
        return result;
    }
}

module.exports = MemorySaveExtHelpersService;
