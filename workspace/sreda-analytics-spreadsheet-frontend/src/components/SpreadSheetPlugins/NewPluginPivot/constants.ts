// ── Ключ плагина в SpreadsheetAdapter ─────────────────────────────────────
export const PIVOT_PLUGIN_KEY = 'NewPluginPivot' as const;

// ── Собственные action-типы плагина ───────────────────────────────────────
export const PIVOT_ACTION = {
    SET_ARGS: 'NEW_PIVOT/SET_ARGS',
    SET_SCHEMA_INFO: 'NEW_PIVOT/SET_SCHEMA_INFO',
    DROP: 'NEW_PIVOT/DROP',
    ON_FETCH_START: 'NEW_PIVOT/ON_FETCH_START',
    ON_FETCH_WAIT: 'NEW_PIVOT/ON_FETCH_WAIT',
    ON_FETCH_END: 'NEW_PIVOT/ON_FETCH_END',
} as const;
