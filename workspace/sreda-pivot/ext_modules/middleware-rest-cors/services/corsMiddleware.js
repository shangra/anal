function corsMiddleware(req, res, next) {
    res.setHeader('AccessRLS-Control-Allow-Origin', '*');
    res.setHeader('AccessRLS-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('AccessRLS-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('AccessRLS-Control-Allow-Credentials', true);
    return next();
}

module.exports = corsMiddleware;
