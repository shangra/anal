import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import {
    DEFAULT_EXPORT_TIMEOUT_MILLIS,
    DEFAULT_FETCH_IGNORE_URLS,
    DEFAULT_MAX_EXPORT_BATCH_SIZE,
    DEFAULT_OTEL_COLLECTOR_URL,
    DEFAULT_SCHEDULED_DELAY_MILLIS,
    DEFAULT_SERVICE_NAME,
    DEFAULT_SERVICE_VERSION,
    DEFAULT_XHR_IGNORE_URLS,
} from './constants';
import packageJson from '../../../package.json';
// Добавляем для диагностики
import { trace } from '@opentelemetry/api';
import type { IAnalyticsProps } from 'components/statistics-agent-ui/types';

/**
 * Метод инициализации агента аналитики
 * @todo Добавить запись действий пользователя при помощи пакета @opentelemetry/instrumentation-user-interaction
 * @todo Добавить запись скачивания/загрузки файлов при помощи пакета @opentelemetry/instrumentation-document-load
 * @param data Параметры агента аналитики
 */
export const initAnalyticAgent = (data: IAnalyticsProps = {}): WebTracerProvider => {
    console.log('🚀 Инициализирую агента Аналитики...');

    try {
        // Подготавливаем базовые параметры
        const otelCollectorUrl = data.otelCollectorUrl || DEFAULT_OTEL_COLLECTOR_URL;
        const serviceName = data.serviceName || packageJson.name || DEFAULT_SERVICE_NAME;
        const serviceVersion = data.serviceVersion || packageJson.version || DEFAULT_SERVICE_VERSION;

        // Подготавливаем числа
        const maxExportBatchSize = Number.isInteger(data.maxExportBatchSize)
            ? data.maxExportBatchSize
            : DEFAULT_MAX_EXPORT_BATCH_SIZE;
        const scheduledDelayMillis = Number.isInteger(data.scheduledDelayMillis)
            ? data.scheduledDelayMillis
            : DEFAULT_SCHEDULED_DELAY_MILLIS;
        const exportTimeoutMillis = Number.isInteger(data.exportTimeoutMillis)
            ? data.exportTimeoutMillis
            : DEFAULT_EXPORT_TIMEOUT_MILLIS;

        // Подготавливаем массивы
        const fetchIgnoreUrls = data.fetchIgnoreUrls || DEFAULT_FETCH_IGNORE_URLS;
        const xhrIgnoreUrls = data.xhrIgnoreUrls || DEFAULT_XHR_IGNORE_URLS;

        // Создаем провайдер трейсов
        const tracerProvider = new WebTracerProvider({
            resource: resourceFromAttributes({
                [ATTR_SERVICE_NAME]: serviceName,
                [ATTR_SERVICE_VERSION]: serviceVersion,
            }),
            spanProcessors: [
                new BatchSpanProcessor(
                    new OTLPTraceExporter({
                        url: otelCollectorUrl,
                        headers: {},
                    }),
                    {
                        maxExportBatchSize,
                        scheduledDelayMillis,
                        exportTimeoutMillis,
                    },
                ),
            ],
        });

        // Регистрируем провайдер
        tracerProvider.register({
            contextManager: new ZoneContextManager(),
        });

        // ДИАГНОСТИКА: Проверяем, что tracer доступен
        const tracer = trace.getTracer('react-app');

        if (tracer) {
            console.log('✅ Трeйсер доступен');
        } else {
            console.log('❌ Трейсер недоступен');
        }

        // Регистрируем инструментации
        registerInstrumentations({
            tracerProvider,
            instrumentations: [
                // Собираем все запросы отправленные через fetch
                new FetchInstrumentation({
                    propagateTraceHeaderCorsUrls: [/.*/],
                    clearTimingResources: true,
                    ignoreUrls: fetchIgnoreUrls,
                }),
                // Собираем все запросы отравленные через xhr
                new XMLHttpRequestInstrumentation({
                    propagateTraceHeaderCorsUrls: [/.*/],
                    ignoreUrls: xhrIgnoreUrls,
                }),
            ],
        });

        console.log('✅ Агент аналитики был инициализирован');

        return tracerProvider;
    } catch (error) {
        console.error('❌ Произошла ошибка при инициализации агента аналитики', error);
        throw error;
    }
};
