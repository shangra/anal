const fs = require('fs');
const LoggersServiceClass = require('../services/Loggers.service');
const path = require('path');
const LoggersService = new LoggersServiceClass();

const HTTP_LOG_PATH = path.resolve(sreda.env.VAR, sreda.env.HTTP_LOG_PATH ?? 'http.log');

class Loggers {
    childrenClassName = '';

    constructor() {
        this.childrenClassName = this.constructor.name;
    }

    async saveToLogFile(typeMessage, req, res, sessionStorage, responseData, context) {
        const data = await LoggersService.buildLog(
            typeMessage,
            req,
            res,
            sessionStorage,
            responseData,
            context
        );

        const lineJson = `${JSON.stringify(data)}\n`;

        fs.open(HTTP_LOG_PATH, 'a', (err, fd) => {
            if (err) throw err;
            fs.appendFile(fd, lineJson, 'utf8', (err) => {
                fs.close(fd, (err) => {
                    if (err) throw err;
                });
                if (err) throw err;
            });
        });
    }
}

module.exports = Loggers;
