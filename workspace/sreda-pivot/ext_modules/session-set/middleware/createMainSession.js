const httpContext = require('../../../core/services/http-context');
const signature = require('cookie-signature');
const crypto = require('crypto');

module.exports = (req, res, next) => {
    if (global.env?.NODE_ENV !== 'test') {
        if (!req.session) {
            req.session = {};
        }
        if (!req.session?.user) {
            req.session.user = {};
        }
    }

    const traceId = req.headers['trace-id'] ?? crypto.randomUUID();
    httpContext.set('trace-id', traceId);

    const sessionStorage = httpContext.get('sessionStorage') ?? {};

    let SID = req.cookies.SID ?? sessionStorage?.SID;
    if (!SID) {
        SID = `s:${signature.sign(req.sessionID, sreda.env.SESSION_SECRET)}`;
    }

    sessionStorage.SID = req.cookies.SID ?? SID;

    httpContext.set('sessionStorage', sessionStorage);

    next();
};
