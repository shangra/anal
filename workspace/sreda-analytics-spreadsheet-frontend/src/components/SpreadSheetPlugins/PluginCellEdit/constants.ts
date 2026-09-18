export const PLUGIN_CELL_EDIT_KEY = 'PluginCellEdit' as const;

// координаты строго без знаков $
// { col: 'A', row: '1' }
export const REG_EXP_EXCEL_CELL_COORDINATE = /(?<col>[A-Z]+)(?<row>[0-9]+)/;
/**
 * Все action-типы, принадлежащие PluginCellEdit.
 * Другие плагины могут реагировать на эти события в своих reducer/appendTransaction,
 * но не должны их диспатчить — это право PluginCellEdit и AdapterSpreadSheet.
 */
export const CELL_EDIT_ACTION = {
    /** Начало редактирования ячейки */
    START: 'CELL_EDIT_START',
    /** Изменение значения в процессе редактирования */
    INPUT: 'CELL_EDIT_INPUT', // изменение текста — дорогая обработка
    CARET_MOVE: 'CELL_EDIT_CARET', // только каретка — дешёвая обработка
    /** Завершение редактирования (apply=true — сохранить, false — отменить) */
    END: 'CELL_EDIT_END',

    /**
     * Точка расширения: внешние плагины могут вернуть VALUE_SYNC
     * из appendTransaction, чтобы переопределить значение в строке формул
     * без записи в dataMatrix (например, показать формулу вместо результата).
     */
    VALUE_SYNC: 'PLUGIN_CELL_EDIT/VALUE_SYNC',

    /** Копирование выделенного диапазона в буфер обмена */
    ON_COPY: 'CELL_EDIT_COPY',
    /** Вставка данных из буфера обмена */
    ON_PASTE: 'CELL_EDIT_PASTE',

    /** редактирование formula input */
    EDIT_FORMULA_INPUT: 'CELL_EDIT_FORMULA_INPUT',
    APPLY_FORMULA_INPUT: 'CELL_EDIT_FORMULA_INPUT_APPLY',
    SET_MARKDOWN_RULES: 'SET_MARKDOWN_RULES',
} as const;
