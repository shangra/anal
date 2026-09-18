import { Cell, Range } from '../../AdapterSpreadSheet/models';
import { IRangeStyles } from '../../AdapterSpreadSheet/types';
import { PLUGIN_CURSOR_CELL_KEY } from './constants';
import { PluginCursorCell } from './PluginCursorCell';

/** Состояние активной ячейки */
export interface ICursor {
    /** Ячейка-курсор */
    cell: Cell;
    /** Источник перемещения курсора */
    // source: 'internal' | 'keyboard' | 'mouse';
}

export interface PluginCursorCellOptions {}

export interface PluginCursorCellState {
    /** Выбранные диапазоны */
    ranges: Range[];

    /** Активный диапазон */
    activeRangeIndex: number;

    /** Визуальные стили диапазонов (для анимации формул и пр.) */
    rangesStyles: Record<string, IRangeStyles>;
}

type PluginCursorCellActionMap = {
    /** Внешняя установка курсора — сбрасывает ranges до одноклеточного */
    CURSOR_SET: { cell: Cell };
    /** Перемещает курсок в текущем диапазоне */
    CURSOR_MOVE: { cell: Cell };
    RANGES_SET: Range[];
    RANGE_ADD: Range;
    RANGE_DRAG_START: { cell: Cell; operation: 'add' | 'set'; range: Range };
    RANGE_DRAG_MOVE: { cell: Cell; range: Range | null };
    RANGE_DRAG_END: { range: Range; isSubtraction: boolean } | undefined;
    RANGES_STYLES_SET: Record<string, IRangeStyles>;
    RANGE_STYLE_SET: { range: string; styles: IRangeStyles };
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginCursorCellActionMap {}
}

interface PluginCursorCellPluginRegistry {
    [PLUGIN_CURSOR_CELL_KEY]: PluginCursorCell;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginCursorCellPluginRegistry {}
}
