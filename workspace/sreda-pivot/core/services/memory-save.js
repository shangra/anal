const cluster = require('cluster');
const crypto = require('crypto');

const {
    MEMORY_OPERATION_GET,
    MEMORY_OPERATION_SET,
    MEMORY_OPERATION_DEL,
    CLUSTER_MSG_MEMORY_OPERATION,
    CLUSTER_MSG_MEMORY_OPERATION_RESULT,
    MEMORY_OPERATION_ERROR_MSG,
} = require('../src/constants');

class MemorySave {
    executors = {};

    constructor() {
        if (!sreda.memorysave) {
            sreda.memorysave = require('./object-memory');
        }

        this.storage = sreda.memorysave;

        // if (!cluster.isMaster) {
        //     const handler = (message) => {
        //         try {
        //             const { msg, result, isSucceed, operationId } = message;
        //             if (msg !== CLUSTER_MSG_MEMORY_OPERATION_RESULT) {
        //                 return;
        //             }
        //             const executor = this.executors[operationId];
        //             if (isSucceed) {
        //                 executor.resolve(result);
        //             } else {
        //                 executor.reject(result);
        //             }
        //             delete this.executors[operationId];
        //         } catch (err) {
        //             console.error(MEMORY_OPERATION_ERROR_MSG, err);
        //         }
        //     };

        //     process.on('message', handler);
        // }
    }

    /**
     * @private
     */
    async sendOperationToCLuster(operation, args) {
        const operationId = crypto.randomUUID();
        return new Promise((resolve, reject) => {
            process.send({
                msg: CLUSTER_MSG_MEMORY_OPERATION,
                data: { args, operation, operationId },
            });
            this.executors[operationId] = { resolve, reject };
        });
    }

    /**
     * @param {string} key
     * @param {{ isLocal?: boolean }} [options]
     * @returns {Promise<any>}
     */
    async get(key, options) {
        const { isLocal } = options || {};

        try {
            const result = this.storage.get(key);
            // const result = this.isMaster(!isLocal)
            //     ? this.storage.get(key)
            //     : this.sendOperationToCLuster(MEMORY_OPERATION_GET, [key]);

            return await result;
        } catch (err) {
            console.error(MEMORY_OPERATION_ERROR_MSG, err);
        }
    }

    /**
     * @param {string} key
     * @param {any} value
     * @param {{ isLocal?: boolean, ttl?: number }} [options]
     * @returns
     */
    async set(key, value, options) {
        const { isLocal, ttl } = options || {};

        try {
            const res = this.storage.set(key, value, { ttl });
            // const res = this.isMaster(!isLocal)
            //     ? this.storage.set(key, value, { ttl })
            //     : this.sendOperationToCLuster(MEMORY_OPERATION_SET, [key, value, { ttl }]);

            return await res;
        } catch (err) {
            console.error(MEMORY_OPERATION_ERROR_MSG, err);
        }
    }

    /**
     * @param {string | RegExp} key
     * @param {{ isLocal?: boolean, isRegExp?: boolean }} [options]
     * @returns
     */
    async del(key, options) {
        const { isLocal, isRegExp = false } = options || {};
        const _isRegExp = key instanceof RegExp;

        try {
            const res = this.storage.del(
                isRegExp && !_isRegExp ? new RegExp(key) : key
            );
            // const res = this.isMaster(!isLocal)
            //     ? this.storage.del(isRegExp && !_isRegExp ? new RegExp(key) : key)
            //     : this.sendOperationToCLuster(MEMORY_OPERATION_DEL, [_isRegExp ? key.toString() : key, { isRegExp: _isRegExp }]);

            return await res;
        } catch (err) {
            console.error(MEMORY_OPERATION_ERROR_MSG, err);
        }
    }

    /**
     * @param {boolean} [isCluster]
     * @returns {boolean}
     */
    isMaster(isCluster) {
        return !isCluster
            ? cluster.isPrimary || this.storage.isExternal
            : cluster.isPrimary;
    }
}

module.exports = new MemorySave();
