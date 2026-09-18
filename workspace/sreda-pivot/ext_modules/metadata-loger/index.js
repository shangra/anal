const Extensions = require("../../core/class/Extensions.class");

class LoggerClass extends Extensions {
    /**
     * @param {string} msg 
     * @param {any} meta 
     */
    log(msg, meta) {
        let dd = new Date();
        console.log(`------- ${dd.getMinutes()}:${dd.getSeconds()}.${dd.getMilliseconds()} --------`, msg);
    }
}

module.exports = LoggerClass;