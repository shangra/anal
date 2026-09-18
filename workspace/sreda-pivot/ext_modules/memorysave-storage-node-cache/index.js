const NodeCache = require('node-cache');

/**
 * @implements {IMemorySave}
 */
class NodeLocalCache {
    isExternal = false;

    constructor() {
        this.storage = new NodeCache();
    }

    async init() {}

    async get(key) {
        return this.storage.get(key);
    }

    async set(key, value, options = {}) {
        const { ttl = 1000 * 60 * 60 * 24 } = options;

        this.storage.set(key, value, ttl / 1000);
    }

    async del(key) {
        if (key instanceof RegExp) {
            const keys = this.storage.keys();

            return this.storage.del(keys.filter((k) => key.test(k)));
        }

        return this.storage.del(key);
    }
}

module.exports = new NodeLocalCache();
