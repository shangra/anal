import { Cell } from '../models';
import { ObjectIndexes } from '../types';

// ─── Core ────────────────────────────────────────────────────────────────────

export interface SpreadsheetActionMap {
    /** Сырое событие нажатия клавиши */
    ON_KEY_DOWN: { event: React.KeyboardEvent };
    /** Сырое событие отпускания клавиши */
    ON_KEY_UP: { event: React.KeyboardEvent };
    /** Клик по ячейке с модификаторами */
    CELL_MOUSE_DOWN: {
        cell: ObjectIndexes;
        ctrlKey: boolean;
        metaKey: boolean;
        shiftKey: boolean;
    };
    /** Отпускание мыши */
    CELL_MOUSE_UP: undefined;
    /** Диспатчится при двойном клике на ячейку. */
    CELL_DBL_CLICK: { cell: ObjectIndexes };
    /** Вход курсора в ячейку (для drag-выделения) */
    CELL_ENTER: { cell: ObjectIndexes };
    /** Клик по угловому root-элементу (выделить всё) */
    ROOT_MOUSE_DOWN: undefined;
    /** Вход в заголовок строки при drag */
    ROW_HEADER_CELL_ENTER: { rowIndex: number };
    /** Вход в заголовок колонки при drag */
    COL_HEADER_CELL_ENTER: { columnIndex: number };
    /** Нажатие на заголовок строки */
    ROW_HEADER_MOUSE_DOWN: { cell: ObjectIndexes; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean };
    /** Отпускание на заголовке строки */
    ROW_HEADER_MOUSE_UP: undefined;
    /** Нажатие на заголовок колонки */
    COL_HEADER_MOUSE_DOWN: { cell: ObjectIndexes; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean };
    /** Отпускание на заголовке колонки */
    COL_HEADER_MOUSE_UP: undefined;
    /** Контекстное меню — PluginCursorCell обновляет выделение при необходимости */
    CONTEXT_MENU: { cell: Cell; x: number; y: number };

    // ── Протяжка ──────────────────────────────────────────────────────────────

    /** Нажатие на маркер fill handle */
    FILL_HANDLE_MOUSE_DOWN: { cell: ObjectIndexes };
    /** Движение мыши при протягивании */
    FILL_HANDLE_MOUSE_MOVE: { cell: ObjectIndexes };
    /** Отпускание мыши — применить заполнение */
    FILL_HANDLE_MOUSE_UP: { cell: ObjectIndexes };
    /** Отмена протягивания (программная или по Escape) */
    FILL_HANDLE_CANCEL: undefined;

    // ── Zoom ──────────────────────────────────────────────────────────────────

    ZOOM_SET: number;
}

// type Debug = { [K in keyof SpreadsheetActionMap]: K };

export type SpreadsheetAction = {
    [K in keyof SpreadsheetActionMap]: SpreadsheetActionMap[K] extends undefined
        ? { type: K; payload?: never }
        : { type: K; payload: SpreadsheetActionMap[K] };
}[keyof SpreadsheetActionMap];
