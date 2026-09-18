export const PLUGIN_REPORTS_KEY = 'PluginReports' as const;

export const MAX_REPORT_ROW = 20000;
export const AVOID_RESTRICTIONS_OF_SOVA = 5_000;

export const REPORTS_ACTION = {
    /** @deprecated Не использовать, только для обратной совместимости */
    STATE_UPDATE: 'REPORTS/STATE_UPDATE',
    /** @deprecated Не использовать, только для обратной совместимости */
    FORCE_UPDATE: 'REPORTS/FORCE_UPDATE',
    ON_FETCH_START: 'REPORTS/ON_FETCH_START',
    ON_FETCH_WAIT: 'REPORTS/ON_FETCH_WAIT',
    ON_FETCH_END: 'REPORTS/ON_FETCH_END',
    /** Событие ошибки PluginFetchError и показа модалки */
    ON_FETCH_ERROR: 'PLUGIN_FETCH_ERROR/EVENT',
} as const;
