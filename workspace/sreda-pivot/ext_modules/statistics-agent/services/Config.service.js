const Extensions = require('../../../core/class/Extensions.class');

// Основные настройки
const {
    // Наименование сервиса
    SERVICE_NAME = 'Неизвестный сервис',
    // API сбора метрик
    METRICS_EXPORT_URL = '',
    // API сбора трейсов
    TRACES_EXPORT_URL = '',
} = sreda.env;
const pkg = require('../../../package.json');
const {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
} = require('@opentelemetry/semantic-conventions');
const {
    getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node');
const httpContext = require('../../../core/services/http-context');

/**
 * Сервис конфигурации агента
 */
class ConfigService extends Extensions {
    /**
     * Фабричный метод формирования конфигурации ресурса
     */
    getResourceConfig() {
        return {
            [ATTR_SERVICE_NAME]: SERVICE_NAME,
            [ATTR_SERVICE_VERSION]: pkg.version || '0.0.0',
        };
    }

    /**
     * Метод получения конфигурации HTTP-агента для передачи телеметрии
     * @returns
     */
    getHttpAgentConfig() {
        return {
            httpAgentOptions: {
                rejectUnauthorized: sreda.env.STATISTICS_AGENT_USE_SSL ?? true,
            },
        };
    }

    /**
     * Метод получения заголовков для локальной разработки
     */
    getDevHeaders() {
        // Получаем переменные окружения
        const {
            // Тестовый заголовок для локальной разработки
            STATISTICS_DEV_CN_HEADER = 'x-original-client-cn',
            // Тестовый CN-сертификата для локальной разработки
            STATISTICS_DEV_CN = '',
            // Флаг локальной разработки
            STATISTICS_DEV_MODE = false,
        } = sreda.env;

        let devHeaders = {};

        if (STATISTICS_DEV_MODE && STATISTICS_DEV_CN) {
            devHeaders = {
                [STATISTICS_DEV_CN_HEADER]: STATISTICS_DEV_CN,
            };
        }

        return devHeaders;
    }

    /**
     * Фабричный метод формирования конфигурации агента
     * @todo Возможно разделить для каждого типа конфига (метрики/трейсы)
     * @returns
     */
    getAgentConfig() {
        // Получаем конфигурацию HTTPS-агента (с проверкой или без сертификатов)
        const httpAgentConfig = this.getHttpAgentConfig();
        // Получаем заголовки для локальной разработки
        const devHeaders = this.getDevHeaders();

        return {
            traces: {
                url: TRACES_EXPORT_URL,
                headers: { ...devHeaders },
                ...httpAgentConfig,
            },
            metrics: {
                url: METRICS_EXPORT_URL,
                headers: { ...devHeaders },
                ...httpAgentConfig,
            },
        };
    }

    /**
     * Метод формирования конфигурации логгера
     * @param {object} options Дополнительные параметры
     */
    getLoggerConfig(options) {
        return {
            url: options.url || '',
            processorConfig: {
                /**
                 * Максимальный размер батча для отправки
                 * По умолчанию: 512
                 */
                maxExportBatchSize: options.maxExportBatchSize ?? 512,
                /**
                 * Максимальная очередь ожидающих логов
                 * По умолчанию: 2048
                 */
                maxQueueSize: options.maxQueueSize ?? 2048,
                /**
                 * Интервал отправки в миллисекундах
                 * По умолчанию: 5000 (5 секунд)
                 */
                scheduledDelayMillis: options.scheduledDelayMillis ?? 5000,
                /**
                 * Таймаут экспорта в миллисекундах
                 * По умолчанию: 30000 (30 секунд)
                 */
                exportTimeoutMillis: options.exportTimeoutMillis ?? 30_000,
            },
        };
    }

    /**
     * Метод получения инструментаций агента
     * @returns Возвращает список готовых инструментаций агента
     */
    getAgentInstrumentations() {
        return [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-http': {
                    applyCustomAttributesOnSpan: (span, req, res) => {
                        const { user = {} } =
                            httpContext.get('sessionStorage') || {};
                        // Добавляем в span пользовательские значения запроса
                        // @ts-ignore
                        span.setAttribute(
                            'request.locals',
                            JSON.stringify(res.locals || {})
                        );
                        // Добавляем информацию о пользователе
                        span.setAttribute('user', JSON.stringify(user));
                    },
                },
                '@opentelemetry/instrumentation-express': {
                    requestHook: (span, info) => {
                        const { user = {} } =
                            httpContext.get('sessionStorage') || {};
                        const { locals = {} } = info.request.res;

                        // Добавляем информацию о пользователе
                        span.setAttribute('user', JSON.stringify(user));
                        // Добавляем в span пользовательские значения запроса
                        span.setAttribute(
                            'request.locals',
                            JSON.stringify(locals)
                        );
                    },
                },
            }),
        ];
    }
}

module.exports = ConfigService;
