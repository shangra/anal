const httpContext = require('../../../core/services/http-context');

class SessionSetService {
    get() {
        return httpContext.get('sessionStorage');
    }

    set(session) {
        return httpContext.set('sessionStorage', session);
    }
}

module.exports = SessionSetService;
