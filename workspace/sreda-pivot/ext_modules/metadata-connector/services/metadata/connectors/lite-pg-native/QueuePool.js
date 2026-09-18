const Queue = require("./Queue");

let item = null

class QueuePool {
    /**
     * @param {any} options 
     * @param {any} connector 
     */
    constructor(options, connector) {
        if (item) return item;

        this.pool = new Array(sreda.env.MAX_POOL_SIZE || 3).fill(null);
        this.pool = this.pool.map(() => new Queue(options, connector))
    }

    /**
     * @param {string} sql 
     */
    async query(sql) {
        return this.pool.sort((a, b) => a.pool.length - b.pool.length)[0].query(sql);
    }
}

module.exports = QueuePool;