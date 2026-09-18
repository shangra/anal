const crypto = require('crypto');

function sortKeys(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sortKeys);
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj)
            .sort()
            .reduce((acc, key) => {
                acc[key] = sortKeys(obj[key]);
                return acc;
            }, {});
    }
    return obj;
}

function stableStringify(obj) {
    const sorted = sortKeys(obj);
    return JSON.stringify(sorted);
}

function hash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = { stableStringify, hash };
