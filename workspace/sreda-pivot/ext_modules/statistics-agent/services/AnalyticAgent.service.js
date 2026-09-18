const Extensions = require('../../../core/class/Extensions.class');

const { NodeSDK } = require('@opentelemetry/sdk-node');
const {
    OTLPTraceExporter,
} = require('@opentelemetry/exporter-trace-otlp-http');
const { resourceFromAttributes } = require('@opentelemetry/resources');

// Зависимости метрик
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const {
    OTLPMetricExporter,
} = require('@opentelemetry/exporter-metrics-otlp-http');

/**
 * Агент аналитики
 */
class AnalyticAgent extends Extensions {
    /**
     * Метод инициализации агента аналитики
     */
    init(resource, data, instrumentations = []) {
        /**
         * Опции агента
         */
        const options = {
            resource: resourceFromAttributes(resource),
            instrumentations,
        };

        /**
         * Если трейсы включены то подготавливаем exporter
         */
        if (data.traces.url) {
            // ? @todo Добавить тут env и если она включена то заменять exporter на ConsoleSpanExporter;
            options.traceExporter = new OTLPTraceExporter(data.traces);
        }

        /**
         * Если метрики включены то подготавливаем reader
         */
        if (data.metrics.url) {
            // ? @todo Добавить тут env и если она включена то заменять exporter на ConsoleMetricExporter,
            options.metricReader = new PeriodicExportingMetricReader({
                exporter: new OTLPMetricExporter(data.metrics),
            });
        }

        try {
            return new NodeSDK(options);
        } catch (e) {
            console.error('Агент аналитики не был инициализирован');
        }
    }
}

module.exports = AnalyticAgent;
