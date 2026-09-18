// Уровни логов для консольных логов
const LOG_LEVEL = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
};

// Уровни логирования для OpenTelemetry diag
const DIAG_LOG_LEVEL = {
    // Отключено
    NONE: 0,
    // Только ошибки
    ERROR: 1,
    // Ошибки и предупреждения
    WARN: 2,
    // Ошибки, предупреждения и информационные сообщения
    INFO: 3,
    // Все сообщения (включая отладочные)
    DEBUG: 4,
    // Все сообщения (максимальный уровень)
    VERBOSE: 5,
};

// Наименование логгера для процесс майнинга
const PROCESS_MINING_LOGGER_NAME = 'process-mining';
// Версия логгера для процесс майнинга
const PROCESS_MINING_LOGGER_VERSION = '1.0.0';
// Наименование логгера для http-запросов
const HTTP_LOGGER_NAME = 'http-logs';
// Версия логгера для http-запросов
const HTTP_LOGGER_VERSION = '1.0.0';

// Типы пользовательских метрик
const METRIC_TYPES = {
    // Счетчик — только увеличивается (например, количество отправленных писем)
    COUNTER: 'Counter',
    // Счетчик — может увеличиваться и уменьшаться (например, количество активных пользователей)
    UP_DOWN_COUNTER: 'UpDownCounter',
    // Измеритель — произвольное числовое значение (например, текущая температура CPU)
    GAUGE: 'Gauge',
    // Гистограмма — распределение значений по корзинам (например, время ответа API)
    HISTOGRAM: 'Histogram',
};

module.exports = {
    LOG_LEVEL,
    DIAG_LOG_LEVEL,
    METRIC_TYPES,
    PROCESS_MINING_LOGGER_NAME,
    PROCESS_MINING_LOGGER_VERSION,
    HTTP_LOGGER_NAME,
    HTTP_LOGGER_VERSION,
};
