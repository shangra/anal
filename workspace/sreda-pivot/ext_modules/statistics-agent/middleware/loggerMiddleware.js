const httpContext = require('../../../core/services/http-context');
const LoggerService = require('../services/Logger.service');
const {
    LOG_LEVEL,
    HTTP_LOGGER_NAME,
    HTTP_LOGGER_VERSION,
} = require('../src/constants');
const {
    // Флаг включения сбора http-логов
    HTTP_EXPORT_ENABLED = false,
} = sreda.env;

let logger = null;

// Формируем конфигурацию для http-логов
if (HTTP_EXPORT_ENABLED) {
    // Инициализируем логгер
    logger = LoggerService.getLogger(HTTP_LOGGER_NAME, HTTP_LOGGER_VERSION);
    console.log('Сбор http-логов был запущен');
}

// @todo Скорее всего рудимент
module.exports = function (req, res, next) {
    if (!logger) {
        return next();
    }

    const sessionStorage = httpContext.get('sessionStorage');
    const traceId = httpContext.get('trace-id');
    const context = {
        traceId,
    };

    const protoWrite = res.write.bind(res);
    res.write = function (...args) {
        protoWrite(...args);
        if (typeof args[0] === 'string') {
            res.body = res.body === undefined ? args[0] : res.body + args[0]; // TODO переделать на buffer
        }
    };

    const protoSendFile = res.sendFile.bind(res);
    res.sendFile = function (...args) {
        protoSendFile(...args);

        // не дожидаемся записи и даем ответ пользователю
        LoggerService.buildLog(
            'sendfile',
            req,
            res,
            sessionStorage,
            args,
            context
        )
            .then((body) => {
                logger.emit({
                    severityText: LOG_LEVEL.INFO,
                    body: body.description,
                    attributes: body,
                });
            })
            .catch(console.error);
    };

    const protoEnd = res.end.bind(res);
    res.end = function (...args) {
        let body;
        if (args.length > 0) {
            body = args[0];
            // body = res.body === undefined ? args[0] : res.body+args[0];
        } else if (res.body) {
            body = res.body;
        }
        protoEnd(...args);

        // не дожидаемся записи и даем ответ пользователю
        LoggerService.buildLog('end', req, res, sessionStorage, body, context)
            .then((body) => {
                logger.emit({
                    severityText: LOG_LEVEL.INFO,
                    body: body.description,
                    attributes: body,
                });
            })
            .catch(console.error);
    };

    next();
};
