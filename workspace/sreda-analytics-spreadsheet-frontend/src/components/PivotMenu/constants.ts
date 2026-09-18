import { IPivotParams } from './pivot-menu-types';

// Параметры меню по умолчанию
const DEFAULT_PIVOT_PARAMS: IPivotParams = {
    columns: [],
    rows: [],
    values: [],
    filter: [],
    layers: [],
    fields: [],
    columnsTotal: false,
    recalculate: true,
    rowsTotal: true,
    isMask: false,
    isClassic: false,
    columnsAllValues: false,
    rowsAllValues: false,
};

// Наименование БД в indexDb для сохранения значений
const DB_NAME = 'pivot';

// Наименование таблицы в indexDb для сохранения значений
const STORE_NAME = 'pivotMenu';

export { DEFAULT_PIVOT_PARAMS, DB_NAME, STORE_NAME };
