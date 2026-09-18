const Extensions = require("../../../core/class/Extensions.class");

class TimeOutService extends Extensions {
    addTagsBefore(innerResult, functionParams, originalMethod) {
        const { inputOptions } = functionParams;

        if (sreda.env.SQL_REQUEST_TIMEOUT) {
            inputOptions.timeOut = sreda.env.SQL_REQUEST_TIMEOUT
        }

        return innerResult;
    }
}

module.exports = TimeOutService;