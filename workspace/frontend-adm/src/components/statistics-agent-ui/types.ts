// Параметры агента аналитики
export interface IAnalyticsProps {
    otelCollectorUrl?: string;
    serviceName?: string;
    serviceVersion?: string;
    maxExportBatchSize?: number;
    scheduledDelayMillis?: number;
    exportTimeoutMillis?: number;
    fetchIgnoreUrls?: (string | RegExp)[];
    xhrIgnoreUrls?: (string | RegExp)[];
}
