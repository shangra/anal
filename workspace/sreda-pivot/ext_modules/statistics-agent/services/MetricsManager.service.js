const { metrics } = require('@opentelemetry/api');
const Extensions = require('../../../core/class/Extensions.class');
const {
    name: packageName,
    version: packageVersion,
} = require('../../../package.json');

/**
 * Менеджер пользовательских метрик.
 *
 * Предоставляет абстракцию над OpenTelemetry Metrics API.
 * Пользователь не работает напрямую с OpenTelemetry, а использует готовые методы:
 *   - createCounter / createUpDownCounter / createHistogram — для создания метрик
 *   - add / record / set — для изменения значений метрик
 *
 * Поддерживает два типа метрик:
 *   - Локальные — используются в рамках одного модуля
 *   - Глобальные — используются во всем сервисе (единый Meter)
 *
 * @example
 * // Локальная метрика в модуле mailings-chat-bots
 * const counter = MetricsManager.createCounter('mailings.sent', { scope: 'module-name', description: 'Кол-во отправленных писем' });
 * counter.add(1, { module: 'mailings-chat-bots' });
 *
 * @example
 * // Глобальная метрика
 * const errCounter = MetricsManager.createCounter('errors.total', { description: 'Все ошибки сервиса' });
 * errCounter.add(1);
 */
class MetricsManager extends Extensions {
    /**
     * Хранилище созданных метрик
     * @type {Map<string, object>}
     */
    _metrics = new Map();

    /**
     * Возвращает или создаёт Meter для указанного модуля/префикса.
     * @param {string} name - Наименование Meter (обычно имя модуля)
     * @param {string} [version='1.0.0'] - Версия Meter
     * @returns {Promise<object>} Meter OpenTelemetry
     */
    async getMeter(name, version = '1.0.0') {
        return metrics.getMeterProvider().getMeter(name, version);
    }

    /**
     * Формирует уникальный ключ метрики в хранилище.
     * @param {string} name Имя метрики
     * @param {string} scope Область видимости
     * @param {string} version Версия области видимости
     * @returns {Promise<string>} Уникальный ключ
     */
    async buildMetricKey(name, scope, version) {
        return `${scope}:${version}:${name}`;
    }

    /**
     * Создаёт Counter (счётчик, только увеличение).
     *
     * @param {string} name Имя метрики
     * @param {object} [options] Опции
     * @param {string} [options.scope] Область видимости
     * @param {string} [options.version] Версия области видимости
     * @param {string} [options.description] Описание метрики
     * @param {string} [options.unit] Единица измерения
     * @returns {Promise<object>} { add(value, attributes) } - объект для работы с метрикой
     *
     * @example
     * const sentCounter = MetricsManager.createCounter('mails.sent', {
     *   scope: 'handle-mails',
     *   version: '1.0.0',
     *   description: 'Кол-во отправленных писем',
     * });
     * sentCounter.add(1, { type: 'notification' });
     */
    async createCounter(name, options = {}) {
        const {
            scope = packageName,
            version = packageVersion,
            description,
            unit,
        } = options;
        const key = await this.buildMetricKey(name, scope, version);
        const cached = this._metrics.get(key);

        if (cached) return cached;

        // Получаем метр для заданного скопа
        const meter = await this.getMeter(`${scope}:${version}`);
        // Создаем новую метрику
        const counter = meter.createCounter(name, { description, unit });

        // Обертка-абстракция для работы с метрикой
        const wrapper = {
            /**
             * Увеличивает значение счётчика.
             * @param {number} value - Значение приращения (по умолчанию 1)
             * @param {object} [attributes] - Атрибуты метрики
             */
            add: (value = 1, attributes = {}) => {
                counter.add(value, attributes);
            },
        };

        // Кешируем созданную метрику
        this._metrics.set(key, wrapper);

        return wrapper;
    }

    /**
     * Создаёт UpDownCounter (счётчик с возможностью увеличения и уменьшения).
     *
     * @param {string} name Имя метрики
     * @param {object} [options] Опции (аналогично createCounter)
     * @returns {Promise<object>} { add(value, attributes) }
     *
     * @example
     * const activeUsers = MetricsManager.createUpDownCounter('users.active', {
     *   description: 'Активные пользователи',
     * });
     * activeUsers.add(1);  // пользователь вошёл
     * activeUsers.add(-1); // пользователь вышел
     */
    async createUpDownCounter(name, options = {}) {
        const {
            scope = packageName,
            version = packageVersion,
            description,
            unit,
        } = options;
        const key = await this.buildMetricKey(name, scope, version);
        const cached = this._metrics.get(key);
        if (cached) return cached;

        const meter = await this.getMeter(`${scope}:${version}`);
        const counter = meter.createUpDownCounter(name, { description, unit });

        const wrapper = {
            /**
             * Изменяет значение счётчика (положительное или отрицательное число).
             * @param {number} value - Значение изменения
             * @param {object} [attributes] - Атрибуты метрики
             */
            add: (value, attributes = {}) => {
                counter.add(value, attributes);
            },
        };

        this._metrics.set(key, wrapper);

        return wrapper;
    }

    /**
     * Создаёт Histogram (гистограмма распределения значений).
     *
     * @param {string} name Имя метрики
     * @param {object} [options] Опции
     * @param {string} [options.scope] Область видимости
     * @param {string} [options.version] Версия области видимости
     * @param {string} [options.description] Описание метрики
     * @param {string} [options.unit] Единица измерения
     * @param {number[]} [options.boundaries] Границы корзин гистограммы
     * @returns {Promise<object>} { record(value, attributes) }
     *
     * @example
     * const latency = MetricsManager.createHistogram('api.latency', {
     *   description: 'Время ответа API',
     *   unit: 'ms',
     *   boundaries: [10, 50, 100, 500, 1000],
     * });
     * latency.record(42, { endpoint: '/users' });
     */
    async createHistogram(name, options = {}) {
        const {
            scope = packageName,
            version = packageVersion,
            description,
            unit,
            boundaries,
        } = options;
        const key = await this.buildMetricKey(name, scope, version);
        const cached = this._metrics.get(key);
        if (cached) return cached;

        const meter = await this.getMeter(`${scope}:${version}`);
        const histogramOptions = { description, unit };

        if (boundaries) {
            histogramOptions.advice = { explicitBucketBoundaries: boundaries };
        }

        const histogram = meter.createHistogram(name, histogramOptions);

        const wrapper = {
            /**
             * Записывает значение в гистограмму.
             * @param {number} value - Значение для записи
             * @param {object} [attributes] - Атрибуты метрики
             */
            record: (value, attributes = {}) => {
                histogram.record(value, attributes);
            },
        };

        this._metrics.set(key, wrapper);
        return wrapper;
    }

    /**
     * Создаёт Gauge (ObservableGauge — произвольное числовое значение).
     *
     * В отличие от других метрик, Gauge требует callback, который будет вызываться
     * при сборе метрик для получения текущего значения.
     *
     * @param {string} name Имя метрики
     * @param {object} [options] Опции
     * @param {string} [options.scope] Область видимости
     * @param {string} [options.version] Версия области видимости
     * @param {string} [options.moduleName] Имя модуля (для локальных)
     * @param {string} [options.description] Описание метрики
     * @param {string} [options.unit] Единица измерения
     * @returns {Promise<object>} { set(value, attributes) } - объект для ручного обновления значения
     *
     * @example
     * const memoryUsage = MetricsManager.createGauge('memory.usage', {
     *   description: 'Использование памяти',
     *   unit: 'bytes',
     * });
     * // При каждом сборе метрик будет вызван callback
     * memoryUsage.set(process.memoryUsage().heapUsed, { region: 'heap' });
     */
    async createGauge(name, options = {}) {
        const {
            scope = packageName,
            version = packageVersion,
            description,
            unit,
        } = options;
        const key = await this.buildMetricKey(name, scope, version);
        const cached = this._metrics.get(key);

        if (cached) return cached;

        const meter = await this.getMeter(`${scope}:${version}`);

        // Для ObservableGauge используется callback-механизм OTel.
        // Мы используем замыкание для хранения текущего значения.
        let currentValue = 0;
        let currentAttributes = {};

        const observableGauge = meter.createObservableGauge(name, {
            description,
            unit,
        });

        observableGauge.addCallback((observableResult) => {
            observableResult.observe(currentValue, currentAttributes);
        });

        const wrapper = {
            /**
             * Устанавливает текущее значение метрики (будет передано при следующем сборе).
             * @param {number} value - Текущее значение
             * @param {object} [attributes] - Атрибуты метрики
             */
            set: (value, attributes = {}) => {
                currentValue = value;
                currentAttributes = attributes;
            },
        };

        this._metrics.set(key, wrapper);
        return wrapper;
    }

    /**
     * Возвращает список всех зарегистрированных метрик (для отладки/мониторинга).
     * @returns {Array<string>}
     */
    listMetrics() {
        return Array.from(this._metrics.keys());
    }

    /**
     * Возвращает зарегистрированную метрику
     * @param {string} name Наименование метрики
     * @param {string} scope Область видимости
     * @param {string} version Версия области видимости
     * @returns {Promise<object | null>}
     */
    async getMetric(name, scope = packageName, version = packageVersion) {
        const key = await this.buildMetricKey(name, scope, version);
        return this._metrics.get(key) || null;
    }

    /**
     * Сбрасывает все метрики (полезно в тестах).
     */
    reset() {
        this._metrics.clear();
    }
}

module.exports = new MetricsManager();
