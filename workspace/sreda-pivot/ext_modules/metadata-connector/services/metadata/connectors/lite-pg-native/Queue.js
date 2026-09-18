const LitePgNative = require('./index');

class Queue {
    /** @type {(() => void)[]} */
    pool = [];
    isBlocked = false;

    /**
     * @param {string} str
     */
    constructor(str, Connector = LitePgNative) {
        this.connection = new Connector(str);

        this.interval = setInterval(async () => {
            if (!this.isBlocked) {
                this.isBlocked = true;
                await Promise.all(this.pool.splice(0, 1).map(f => f()));
                this.isBlocked = false;
            }
        }, 100);
    }

    /**
     * @param {string} sql
     * @returns {Promise<any[]>}
     */
    query(sql) {
        return new Promise((resolve, reject) => {
            const cb = () => this.connection.query(sql).then(resolve).catch(reject);

            this.pool.push(cb);
        });
    }
}

module.exports = Queue;
