class BlockedResourceError extends Error {
    /**
     * 
     * @param {number} status 
     * @param {string} message 
     * @param {Error[]} [errors] 
     * @param {any} [payload] 
     */
    constructor(status, message, errors = [], payload = {}) {
        super(message);

        this.status = status;
        this.errors = errors;
        this.payload = payload;

        this.name = 'BlockedResourceError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, BlockedResourceError);
        }
    }
}

module.exports = BlockedResourceError;