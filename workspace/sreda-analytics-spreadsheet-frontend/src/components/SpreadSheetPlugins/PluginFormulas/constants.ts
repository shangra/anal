export const PLUGIN_FORMULAS_KEY = 'PluginFormulas' as const;

// единственное совпадение $A$1 A1 A$1 $A1
// { col: 'A', row: '1' }
export const REG_EXP_EXCEL_CELL_COORDINATE = /\$?(?<col>[A-Z]+)\$?(?<row>[0-9]+)/;

// для поиска ссылок на ячейки, включая  $-анкеры.
// Матчит все совпадения: A1, $A1, A$1, $A$1
// ['$', 'A', '$', '1']
export const CELL_REF_REGEXP = /(\$?)([A-Z]+)(\$?)([0-9]+)/g;

// ── Собственные action-типы плагина ───────────────────────────────────────
export const PLUGIN_FORMULAS_ACTION = {
    FOCUS_RANGE: 'PLUGIN_FORMULAS/FOCUS_RANGE',
    SET_ACTIVE_FUNCTION: 'PLUGIN_FORMULAS/SET_ACTIVE_FUNCTION',
    /** Синхронизация состояния формулы при навигации курсором */
    CURSOR_SYNC: 'PLUGIN_FORMULAS/CURSOR_SYNC',
} as const;
