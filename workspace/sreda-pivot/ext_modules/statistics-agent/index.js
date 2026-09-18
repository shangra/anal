// Метрики
const MetricsServiceClass = require('./services/Metrics.service');
const MetricsService = new MetricsServiceClass();
const { METRIC_TYPES } = require('./src/constants');

// Логи
const LoggerService = require('./services/Logger.service');

/**
 * Метод создания метрики
 * @param {string} name Наименование метрики
 * @param {object} [options] Дополнительные параметры метрики
 * @returns {Promise<object>} Созданная метрика
 */
const createMetric = (name, options = {}) => {
    return MetricsService.createMetric(name, options);
};

/**
 * Метод получения метрики
 * @param {string} name Наименование метрики
 * @param {object} [options] Дополнительные параметры
 * @param {string} [options.scope] Область видимости
 * @param {string} [options.version] Версия области видимости
 */
const getMetric = (name, options) => {
    return MetricsService.getMetric(name, options);
};

/**
 * Метод регистрации события ProcessMining
 * @param {string} body Сообщение
 * @param {object} [attributes] Дополнительные атрибуты
 * @param {object} [logger]  Опциональный логгер (если не передан, используется базовый логгер)
 * @returns
 */
const recordProcessMiningEvent = (body = '', attributes = {}, logger) => {
    return LoggerService.recordProcessMiningEvent(body, attributes, logger);
};

module.exports = {
    // Метрики
    createMetric,
    getMetric,
    METRIC_TYPES,
    // Логи
    recordProcessMiningEvent,
};
