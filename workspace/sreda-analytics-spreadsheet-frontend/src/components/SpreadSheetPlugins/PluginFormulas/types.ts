import { Cell, Range } from '../../AdapterSpreadSheet/models';
import { PLUGIN_FORMULAS_ACTION, PLUGIN_FORMULAS_KEY } from './constants';
import { PluginFormulas } from './PluginFormulas';

export interface IFormulaRange {
    range: Range;
    text: string;
    color: string;
}

export interface PluginFormulasState {
    /** Является ли текущее редактируемое значение формулой */
    isExpression: boolean;
    /** Диапазоны, упомянутые в формуле (для подсветки) */
    expressionRanges: IFormulaRange[];
    /** Индекс сфокусированного range-тега, null если нет фокуса */
    focusedRangeIndex: number | null;
    /** Имя функции под кареткой (для подсветки в List). null если каретка не внутри функции. */
    activeFunctionName: string | null;

    /** Координаты последнего скопированного диапазона */
    copiedRange: { range: Range } | null;
}

export interface PluginFormulasOptions {}

// ─── Action-типы, принадлежащие PluginFormulas ────────────────────────────────

type PluginFormulasActionMap = {
    [PLUGIN_FORMULAS_ACTION.FOCUS_RANGE]: number;
    [PLUGIN_FORMULAS_ACTION.SET_ACTIVE_FUNCTION]: string | null;
    /** Payload: формула ячейки под курсором или null если её нет */
    [PLUGIN_FORMULAS_ACTION.CURSOR_SYNC]: { expression: string | null };
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginFormulasActionMap {}
}

// ─── Расширение ICellPluginsConfig для хранения оригинальной формулы ──────────

export interface PluginFormulaPluginConfig {
    /** Оригинальная формула, введённая пользователем, напр. "=СУММ(A1:A3)" */
    expression?: string;
}

type PluginFormulasPluginConfig = {
    [PLUGIN_FORMULAS_KEY]?: PluginFormulaPluginConfig;
};

interface PluginFormulasPluginRegistry {
    [PLUGIN_FORMULAS_KEY]: PluginFormulas;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface ICellPluginsConfig extends PluginFormulasPluginConfig {}
    export interface PluginRegistry extends PluginFormulasPluginRegistry {}
}
