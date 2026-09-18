const AnalyticAgentServiceClass = require('./AnalyticAgent.service');
const AnalyticAgentService = new AnalyticAgentServiceClass();
const LoggerService = require('./Logger.service');
const DiagLoggerService = require('./DiagLogger.service');
const ConfigServiceClass = require('./Config.service');
const ConfigService = new ConfigServiceClass();
const { LOG_LEVEL } = require('../src/constants');
const {
    // Флаг включения сбора метрик
    METRICS_EXPORT_ENABLED = false,
    // Флаг включения сборка трейсов
    TRACES_EXPORT_ENABLED = false,
    // Флаг включения сборка логов консоли
    CONSOLE_EXPORT_ENABLED = false,
    // API сбора логов консоли
    CONSOLE_EXPORT_URL = '',
    // Максимальный размер батча для отправки
    CONSOLE_LOGGER_MAX_EXPORT_BATCH_SIZE,
    // Максимальная очередь ожидающих логов
    CONSOLE_LOGGER_MAX_QUEUE_SIZE,
    // Интервал отправки в миллисекундах
    CONSOLE_LOGGER_SCHEDULED_DELAY_MILLIS,
    // Таймаут экспорта в миллисекундах
    CONSOLE_LOGGER_EXPORT_TIMEOUT_MILLIS,
    // Перегружаемые консольные методы
    CONSOLE_INTERCEPT_METHODS = ['log', 'error', 'warn', 'info', 'debug'],
} = sreda.env;

/**
 * Метод инициализации агента
 * @todo Добавить функционал маскирования данных
 */
function init() {
    try {
        // 1. Инициализация OpenTelemetry diag логгера (должен быть ДО всех остальных действий)
        const diagEnabled = DiagLoggerService.init();

        if (diagEnabled) {
            console.log(
                `Логгер статистики включен (уровень: ${sreda.env.STATISTICS_LOG_LEVEL})`
            );
        }

        // Формируем конфигурацию ресурса (сервиса)
        const resourceConfig = ConfigService.getResourceConfig();

        // Агент сбора телеметрии
        if (TRACES_EXPORT_ENABLED || METRICS_EXPORT_ENABLED) {
            // Формируем конфигурацию агента аналитики
            const agentConfig = ConfigService.getAgentConfig();
            // Формируем инструментации
            const instrumentations = ConfigService.getAgentInstrumentations();
            // Создаем агента
            const agent = AnalyticAgentService.init(
                resourceConfig,
                agentConfig,
                instrumentations
            );

            // Запускаем агент
            agent.start();

            // Выходим из sdk при закрытии приложения
            process.on('SIGTERM', () => {
                agent
                    .shutdown()
                    .then(() => console.log('Tracing terminated'))
                    .catch((error) =>
                        console.log('Error terminating tracing', error)
                    )
                    .finally(() => process.exit(0));
            });

            if (TRACES_EXPORT_ENABLED) {
                console.log('Сбор трейсов был запущен');
            }

            if (METRICS_EXPORT_ENABLED) {
                console.log('Сбор метрик был запущен');
            }
        }

        // Логгер сбора консольных логов
        // ? @todo Возможно объединить с агентом
        if (CONSOLE_EXPORT_ENABLED && CONSOLE_EXPORT_URL) {
            // Формируем конфигурацию логгера консоли
            const loggerConfig = ConfigService.getLoggerConfig({
                url: CONSOLE_EXPORT_URL,
                maxExportBatchSize: CONSOLE_LOGGER_MAX_EXPORT_BATCH_SIZE,
                maxQueueSize: CONSOLE_LOGGER_MAX_QUEUE_SIZE,
                scheduledDelayMillis: CONSOLE_LOGGER_SCHEDULED_DELAY_MILLIS,
                exportTimeoutMillis: CONSOLE_LOGGER_EXPORT_TIMEOUT_MILLIS,
            });

            // Инициализируем общий провайдер логов
            LoggerService.init(resourceConfig, loggerConfig);
            // Получаем общий логгер
            const logger = LoggerService.getLogger();

            // Перегружаем методы вывода информации в консоль
            pathProcessStreams(logger);
            // Перегружаем глобальные обработчики
            setupGlobalHandlers(logger);

            console.log('Сбор логов был запущен');
        }
    } catch (e) {
        console.error('Произошла ошибка при инициализации агента аналитики');
    }
}

// Сохраняем оригинальные методы console перед переопределением
const originalConsoleMethods = {};

if (Array.isArray(CONSOLE_INTERCEPT_METHODS)) {
    CONSOLE_INTERCEPT_METHODS.forEach((method) => {
        if (typeof console[method] === 'function') {
            originalConsoleMethods[method] = console[method].bind(console);
        }
    });
}

/**
 * Метод обогащение методов вывода в консоль
 * @param logger Логгер
 */
function pathProcessStreams(logger) {
    if (!Array.isArray(CONSOLE_INTERCEPT_METHODS)) {
        console.warn(
            'В env `CONSOLE_INTERCEPT_METHODS` указано некорректное значение'
        );
        return;
    }

    interceptConsoleMethods(logger, CONSOLE_INTERCEPT_METHODS);
}

/**
 * Метод декорирования методов console (log, error, warn, info, debug)
 * @param logger Логгер
 */
function interceptConsoleMethods(logger, methods = []) {
    methods.forEach((method) => {
        if (typeof originalConsoleMethods[method] === 'function') {
            console[method] = (...args) => {
                // Отправляем в OpenTelemetry
                sendToOpenTelemetry(
                    logger,
                    LOG_LEVEL[method.toUpperCase()],
                    args
                );

                // Вызываем оригинальный метод для вывода в консоль
                originalConsoleMethods[method](...args);
            };
        }
    });
}

/**
 * Метод перегрузки глобальных параметров
 * @param logger Логгер
 */
function setupGlobalHandlers(logger) {
    // Перехват глобальных ошибок
    process.on('uncaughtException', (error) => {
        sendToOpenTelemetry(logger, LOG_LEVEL.ERROR, [
            `Uncaught Exception: ${error.message}`,
            error.stack,
        ]);
    });

    process.on('unhandledRejection', (reason) => {
        sendToOpenTelemetry(logger, LOG_LEVEL.ERROR, [
            `Unhandled Rejection: ${reason}`,
        ]);
    });
}

/**
 * Метод отправки логов в коллектор
 * @param logger Логгер
 * @param level Уровень логирования
 * @param args Дополнительные аргументы
 */
function sendToOpenTelemetry(logger, level = LOG_LEVEL.INFO, args) {
    const message = args
        .map((arg) =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        )
        .join(' ');

    logger.emit({
        severityText: level,
        body: message,
        attributes: {
            'log.source': 'console',
            'log.level': level?.toLowerCase(),
            timestamp: new Date().toISOString(),
        },
    });
}

init();
