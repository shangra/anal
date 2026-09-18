const Extensions = require('../../../core/class/Extensions.class');
const MetricsManager = require('./MetricsManager.service');
const { METRIC_TYPES } = require('../src/constants');

/**
 * Сервис пользовательских метрик.
 *
 * Предоставляет высокоуровневую абстракцию для создания и изменения
 * пользовательских метрик. Пользователь НЕ работает напрямую
 * с OpenTelemetry, а вызывает готовые методы:
 *
 *   - createMetric(name, type, options) — создаёт метрику
 *   - getMetric(name) — получает существующую метрику
 *
 * @example
 * // Создание локальной метрики (например, в модуле mailings-chat-bots)
 * const mailSentMetric = MetricsService.createMetric('mails.sent', 'Counter', {
 *   scope: 'mailings-chat-bots',
 *   description: 'Кол-во отправленных писем',
 * });
 * mailSentMetric.add(1, { type: 'notification' });
 *
 * @example
 * // Создание глобальной метрики (например, количество ошибок)
 * const errorMetric = MetricsService.createMetric('errors.total', 'Counter', {
 *   description: 'Все ошибки сервиса',
 * });
 * errorMetric.add(1);
 *
 * @example
 * // Создание гистограммы
 * const latencyMetric = MetricsService.createMetric('api.latency', 'Histogram', {
 *   description: 'Время ответа API',
 *   unit: 'ms',
 * });
 * latencyMetric.record(42, { endpoint: '/users' });
 */
class MetricsService extends Extensions {
    /**
     * Создаёт новую пользовательскую метрику.
     *
     * @param {string} name Уникальное имя метрики (например, 'mails.sent')
     * @param {object} [options] Дополнительные опции
     * @param {string} [options.type='Counter'] Тип метрики (см. METRIC_TYPES): 'Counter', 'UpDownCounter', 'Gauge', 'Histogram'
     * @param {string} [options.scope] Область видимости метрики
     * @param {string} [options.version] Версия области видимости метрики
     * @param {string} [options.description] Описание метрики
     * @param {string} [options.unit] Единица измерения
     * @param {number[]} [options.boundaries] Границы гистограммы (только для Histogram)
     * @returns {Promise<object>} Объект метрики с методами add/record/set
     *
     * @throws {Error} Если указан неизвестный тип метрики
     */
    async createMetric(name, options = {}) {
        const {
            scope,
            version,
            description,
            unit,
            boundaries,
            type = METRIC_TYPES.COUNTER,
        } = options;
        const metricOptions = {
            scope,
            version,
            description,
            unit,
            boundaries,
        };

        switch (type) {
            case METRIC_TYPES.COUNTER:
                return MetricsManager.createCounter(name, metricOptions);

            case METRIC_TYPES.UP_DOWN_COUNTER:
                return MetricsManager.createUpDownCounter(name, metricOptions);

            case METRIC_TYPES.HISTOGRAM:
                return MetricsManager.createHistogram(name, metricOptions);

            case METRIC_TYPES.GAUGE:
                return MetricsManager.createGauge(name, metricOptions);

            default:
                throw new Error(
                    `Неизвестный тип метрики "${type}". Допустимые типы: ${Object.values(
                        METRIC_TYPES
                    ).join(', ')}`
                );
        }
    }

    /**
     * Получает существующую метрику по имени.
     *
     * @param {string} name Имя метрики
     * @param {object} [options] Дополнительные параметры
     * @param {string} [options.scope] Область видимости
     * @param {string} [options.version] Версия области видимости
     * @returns {Promise<object | null>} Метрика или undefined, если не найдена
     */
    async getMetric(name, options = {}) {
        const { scope, version } = options;
        return MetricsManager.getMetric(name, scope, version);
    }

    /**
     * Возвращает список всех созданных метрик (для отладки).
     * @returns {Array}
     */
    static listAllMetrics() {
        return MetricsManager.listMetrics();
    }

    /**
     * Сбрасывает все метрики (используется в тестах).
     */
    static resetMetrics() {
        MetricsManager.reset();
    }
}

module.exports = MetricsService;
