class OutOfBoundRequestError extends Error {
    /**
     * @param {*} message
     * @param {*} errors
     * @param {*} payload
     */
    constructor(message) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, OutOfBoundRequestError);
        }
    }
}

module.exports = OutOfBoundRequestError;
