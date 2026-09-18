import { SelectOption } from 'ui-kit';

import { NumericScale } from './types';

export const SCALES: Record<NumericScale, string> = {
    none: 'Единицы',
    thousands: 'Тысячи',
    millions: 'Миллионы',
    billions: 'Миллиарды',
};

export const SCALE_OPTIONS: SelectOption<NumericScale>[] = Object.keys(SCALES).map((value) => ({
    value: value as NumericScale,
    label: SCALES[value as NumericScale],
}));

export const PLUGIN_PIVOT_KEY = 'PluginPivot' as const;

export const PLUGIN_PIVOT_CHANK_TYPE = {
    HIERARCHY: 'hierarchy',
    OPEN: 'open',
} as const;

export const PLUGIN_PIVOT_HEADER_TYPE = {
    COLUMNS: 'columns',
    INDEX: 'index',
} as const;

export const PIVOT_ACTION = {
    /** @deprecated Не использовать, только для обратной совместимости */
    STATE_UPDATE: 'PIVOT/STATE_UPDATE',
    /** @deprecated Не использовать, только для обратной совместимости */
    FORCE_UPDATE: 'PIVOT/FORCE_UPDATE',
    ON_FETCH_START: 'PIVOT/ON_FETCH_START',
    ON_FETCH_WAIT: 'PIVOT/ON_FETCH_WAIT',
    ON_FETCH_ERROR: 'PLUGIN_FETCH_ERROR/EVENT',
    ON_FETCH_END: 'PIVOT/ON_FETCH_END',
    RESET_CACHE: 'PIVOT/RESET_CACHE',
    DRP_DATA_LOADED: 'PIVOT/DRP_DATA_LOADED',
    DRP_DATA_LOADED_RESET: 'PIVOT/DRP_DATA_LOADED_RESET',
} as const;

/**
 * Количество служебных строк в шапке пивота перед таблицей данных.
 */
export const PIVOT_HEADER_ROWS_COUNT = 4;
