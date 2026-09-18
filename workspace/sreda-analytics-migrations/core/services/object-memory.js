/**
 * @implements {IMemorySave}
 */
class ObjectMemory {
    isExternal = false;

    _memory = {};

    async init() {
        this._memory = this._memory ?? {};
    }

    async get(key) {
        await this.init();

        return this._clone(this._memory[key]);
    }

    async set(key, value, options = {}) {
        const { ttl = 1000 * 60 * 60 * 24 } = options;

        await this.init();

        this._memory[key] = this._clone(value);

        setTimeout(() => this.del(key), ttl).unref();
    }

    async del(key) {
        await this.init();

        if (key instanceof RegExp) {
            return Promise.all(
                Object.keys(this._memory).map((k) => key.test(k) && this.del(k))
            ).then((r) => r.filter(Boolean).reduce((a, c) => a + c, 0));
        }

        const exist = Object.keys(this._memory).includes(key);
        if (exist) {
            delete this._memory[key];
        }

        return +exist;
    }

    /**
     * @private
     *
     * @param {any} value
     * @returns {any}
     */
    _clone(value) {
        return value && typeof value === 'object'
            ? structuredClone(value)
            : value;
    }
}

module.exports = new ObjectMemory();
