import { MarkdownRule } from 'ui-kit';

import { Cell, Range } from '../../AdapterSpreadSheet/models';
import { ColumnIndex, ICell, RowIndex } from '../../AdapterSpreadSheet/types';
import { CELL_EDIT_ACTION, PLUGIN_CELL_EDIT_KEY } from './constants';
import { PluginCellEdit } from './PluginCellEdit';

export interface PluginCellEditState {
    /** Ячейка, которая редактируется прямо сейчас */
    editingCell: Cell | null;
    /** Текущее значение в строке формул */
    currentValue: string;
    markdownRules: MarkdownRule[];
}

export interface PluginCellEditOptions {}

// ─── Action-типы, принадлежащие PluginCellEdit ────────────────────────────────
//
// CELL_EDIT_START / INPUT / END — жизненный цикл редактирования.
// Декларируются здесь, чтобы все плагины получили типизацию через SpreadsheetActionMap.
//
// Аналогия с другими плагинами:
//   PluginCursorCell  -> CURSOR_SET, RANGES_SET, RANGE_DRAG_*
//   PluginFill        -> FILL_START, FILL_MOVE, FILL_END, FILL_CANCEL
//   PluginCellEdit    -> CELL_EDIT_START, CELL_EDIT_INPUT, CELL_EDIT_END
// ─────────────────────────────────────────────────────────────────────────────

type PluginCellEditActionMap = {
    /** Инициирует режим редактирования для указанной ячейки */
    [CELL_EDIT_ACTION.START]: {
        cell: Cell;
        /** Начальное значение (отображается в строке формул) */
        value: string | number;
    };

    /** Обновляет значение в процессе редактирования */
    [CELL_EDIT_ACTION.INPUT]: {
        cell: Cell;
        value: string | number;
        /** Позиция каретки после программной вставки. Если не передана — конец строки. */
        caretPosition: number;
    };

    /**
     * Завершает редактирование.
     * apply=true  -> сохранить value в ячейку
     * apply=false -> отменить без сохранения
     */
    [CELL_EDIT_ACTION.END]: {
        cell: Cell;
        value: string | number;
        apply: boolean;
        source: string;
    };

    [CELL_EDIT_ACTION.CARET_MOVE]: {
        cell: Cell;
        /** Позиция каретки после программной вставки. Если не передана — конец строки. */
        caretPosition: number;
    };

    [CELL_EDIT_ACTION.ON_COPY]: {
        range: Range;
    };

    [CELL_EDIT_ACTION.ON_PASTE]: {
        data: Map<RowIndex, Map<ColumnIndex, ICell>>;
        range: Range;
    };

    /** Точка расширения: переопределение отображаемого значения в строке формул */
    [CELL_EDIT_ACTION.VALUE_SYNC]: {
        value: string;
    };

    [CELL_EDIT_ACTION.EDIT_FORMULA_INPUT]: {
        value: string;
    };

    [CELL_EDIT_ACTION.APPLY_FORMULA_INPUT]: {
        value: string;
    };

    [CELL_EDIT_ACTION.SET_MARKDOWN_RULES]: {
        markdownRules: MarkdownRule[];
    };
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginCellEditActionMap {}
}

interface PluginCellEditPluginRegistry {
    [PLUGIN_CELL_EDIT_KEY]: PluginCellEdit;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginCellEditPluginRegistry {}
}
