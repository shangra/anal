const httpContext = require('../../../core/services/http-context');
const Loggers = require('../config/loggeers');
const loggers = new Loggers();

module.exports = function (req, res, next) {
    if (sreda.env.WRITE_HTTP_LOG !== true) {
        return next();
    }

    const sessionStorage = httpContext.get('sessionStorage');
    const traceId = httpContext.get('trace-id');
    const context = {
        traceId,
    };

    // const protoWrite = res.write.bind(res);
    // res.write = function (...args) {
    //     protoWrite(...args);
    //     if (typeof args[0] === 'string') {
    //         res.body = res.body === undefined ? args[0] : res.body + args[0]; // TODO переделать на buffer
    //     }
    // };

    const protoSendFile = res.sendFile.bind(res);
    res.sendFile = function (...args) {
        protoSendFile(...args);

        // не дожидаемся записи и даем ответ пользователю
        loggers
            .saveToLogFile('sendfile', req, res, sessionStorage, args, context)
            .then(() => console.log('sendfile', 'log create'))
            .catch(console.error);
    };

    const protoEnd = res.end.bind(res);
    res.end = function (...args) {
        // let body;
        // if (args.length > 0) {
        //     body = args[0];
        //     // body = res.body === undefined ? args[0] : res.body+args[0];
        // } else if (res.body) {
        //     body = res.body;
        // }
        protoEnd(...args);

        // не дожидаемся записи и даем ответ пользователю
        loggers
            .saveToLogFile('end', req, res, sessionStorage, /** body */ undefined, context)
            .then(() => console.log('sendfile', 'log create'))
            .catch(console.error);
    };

    next();
};
