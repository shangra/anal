const parseFloat = (req, res, next) => {
    if (typeof req.body === 'object' && req.body) {
        req.body = parse(req.body);
    }

    next();
};

const parse = (obj) => {
    for (const key in obj) {
        if (obj[key]?.isLosslessNumber) {
            obj[key] = obj[key].value;
        } else if (Array.isArray(obj[key])) {
            obj[key].map((i) => parse(i));
        } else if (typeof obj[key] === 'object') {
            parse(obj[key]);
        }
    }

    return obj;
};

module.exports = parseFloat;
