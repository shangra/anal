import { Plugin, SpreadsheetAction, Transaction, TransactionBuilder } from '../../AdapterSpreadSheet/plugin';
import { ContextMenuContext, TContextMenuItem } from '../../AdapterSpreadSheet/types';
import { ISpreadSheet } from '../../TableAdapters/types';
import { PLUGIN_GROUPS_KEY } from './constants';
import { PluginGroupsOptions, PluginGroupsState } from './types';

export class PluginGroups extends Plugin<typeof PLUGIN_GROUPS_KEY, PluginGroupsState, PluginGroupsOptions> {
    readonly key = PLUGIN_GROUPS_KEY;

    readonly initialState: PluginGroupsState = {
        rowGroups: [],
        columnGroups: [],
    };

    // ─── СТАДИЯ 1: collectVeto ──────────────────────────────────────────

    override collectVeto(_tr: Transaction, _state: PluginGroupsState): string | null {
        return null; // не блокируем
    }

    // ─── СТАДИЯ 2: reducer ────────────────────────────────────────────────────

    override reducer(state: PluginGroupsState, tr: Transaction): PluginGroupsState {
        const { action } = tr;
        switch (action?.type) {
            case 'ROW_GROUP_ADD':
                return { ...state, rowGroups: [...state.rowGroups, action.payload] };

            case 'COLUMN_GROUP_ADD':
                return { ...state, columnGroups: [...state.columnGroups, action.payload] };

            case 'GROUP_TOGGLE': {
                const { id, groupType } = action.payload;
                if (groupType === 'row') {
                    return {
                        ...state,
                        rowGroups: state.rowGroups.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)),
                    };
                }
                return {
                    ...state,
                    columnGroups: state.columnGroups.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)),
                };
            }

            case 'ROW_GROUP_REMOVE':
                return { ...state, rowGroups: state.rowGroups.filter((g) => g.id !== action.payload) };

            case 'COLUMN_GROUP_REMOVE':
                return { ...state, columnGroups: state.columnGroups.filter((g) => g.id !== action.payload) };

            // case 'ROW_COLLAPSE': {
            //     const { rowIndex, originalHeight } = action.payload;
            //     const newCollapsedRows = new Set(state.collapsedRows).add(rowIndex);
            //     const newOriginalRowHeights = new Map(state.originalRowHeights);
            //     // Сохраняем исходную высоту, если передана
            //     if (originalHeight !== undefined) {
            //         newOriginalRowHeights.set(rowIndex, originalHeight);
            //     }
            //     return {
            //         ...state,
            //         collapsedRows: newCollapsedRows,
            //         originalRowHeights: newOriginalRowHeights,
            //     };
            // }
            // case 'ROW_INSERT': {
            //     const { index, position, count } = action.payload;
            //     const insertIdx = position === 'before' ? index : index + 1;

            //     // Используем rowsMeta из PluginMetadata как source of truth для свёрнутых строк.
            //     // collapsedRows в PluginGroups может быть рассинхронизирован с rowsMeta (например,
            //     // после серии вставок/удалений), что приводит к накоплению ошибок при сдвиге.
            //     // Строки с height === 0 в rowsMeta — это реально свёрнутые строки (установлены
            //     // через appendTransaction -> ROWS_RESIZE при ROW_COLLAPSE).
            //     const metadata = this.context.getPluginState(PLUGIN_METADATA_KEY);
            //     const rowsMeta = metadata?.rowsMeta ?? {};

            //     // Находим все свернутые строки в исходном rowsMeta (до сдвига)
            //     const originalCollapsed = new Set<number>(
            //         Object.keys(rowsMeta)
            //             .map(Number)
            //             .filter((idx) => (rowsMeta[idx]?.height ?? -1) === 0),
            //     );

            //     // Получаем последний клик из PluginCursorCell
            //     const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY);
            //     const lastClickedCell = cursorState?.ranges?.[0]?.cursor;
            //     const clickedRow = lastClickedCell?.coordinates.rowIndex;

            //     // Определяем, находится ли клик ниже всех свернутых строк
            //     let shouldShift = true;
            //     if (clickedRow !== undefined && originalCollapsed.size > 0) {
            //         const maxCollapsedRow = Math.max(...originalCollapsed);
            //         if (clickedRow > maxCollapsedRow) {
            //             // Клик ниже всех свернутых строк - сдвиг не требуется
            //             shouldShift = false;
            //         }
            //     }

            //     // Применяем сдвиг к индексам свернутых строк
            //     const shiftedCollapsed = new Set<number>();
            //     if (shouldShift) {
            //         for (const idx of originalCollapsed) {
            //             if (idx >= insertIdx) {
            //                 // Вставка происходит ДО этой свернутой строки - смещаем индекс
            //                 shiftedCollapsed.add(idx + count);
            //             } else {
            //                 // Вставка происходит ПОСЛЕ этой свернутой строки - индекс не меняется
            //                 shiftedCollapsed.add(idx);
            //             }
            //         }
            //     } else {
            //         // Без сдвига - оставляем исходные индексы
            //         for (const idx of originalCollapsed) {
            //             shiftedCollapsed.add(idx);
            //         }
            //     }
            //     const newOriginalRowHeights = shouldShift
            //         ? shiftMapIndices(state.originalRowHeights, insertIdx, count)
            //         : state.originalRowHeights;
            //     const newRowGroups = shouldShift ? shiftGroupIndices(state.rowGroups, insertIdx, count) : state.rowGroups;

            //     return {
            //         ...state,
            //         collapsedRows: shiftedCollapsed,
            //         originalRowHeights: newOriginalRowHeights,
            //         rowGroups: newRowGroups,
            //     };
            // }

            // case 'COLUMN_INSERT': {
            //     const { index, position, count } = action.payload;
            //     const insertIdx = position === 'before' ? index : index + 1;

            //     // Используем columnsMeta из PluginMetadata как source of truth для свёрнутых колонок.
            //     // collapsedColumns в PluginGroups может быть рассинхронизирован с columnsMeta (например,
            //     // после серии вставок/удалений), что приводит к накоплению ошибок при сдвиге.
            //     // Колонки с width === 0 в columnsMeta — это реально свёрнутые колонки (установлены
            //     // через appendTransaction -> COLUMNS_RESIZE при COLUMN_COLLAPSE).
            //     const metadata = this.context.getPluginState(PLUGIN_METADATA_KEY);
            //     const columnsMeta = metadata?.columnsMeta ?? {};

            //     // Находим все свернутые колонки в исходном columnsMeta (до сдвига)
            //     const originalCollapsed = new Set<number>(
            //         Object.keys(columnsMeta)
            //             .map(Number)
            //             .filter((idx) => (columnsMeta[idx]?.width ?? -1) === 0),
            //     );

            //     // Получаем последний клик из PluginCursorCell
            //     const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY);
            //     const lastClickedCell = cursorState?.ranges?.[0]?.cursor;
            //     const clickedColumn = lastClickedCell?.coordinates.columnIndex;

            //     // Определяем, находится ли клик правее всех свернутых колонок
            //     let shouldShift = true;
            //     if (clickedColumn !== undefined && originalCollapsed.size > 0) {
            //         const maxCollapsedColumn = Math.max(...originalCollapsed);
            //         if (clickedColumn > maxCollapsedColumn) {
            //             // Клик правее всех свернутых колонок - сдвиг не требуется
            //             shouldShift = false;
            //         }
            //     }

            //     // Применяем сдвиг к индексам свернутых колонок
            //     const shiftedCollapsed = new Set<number>();
            //     if (shouldShift) {
            //         for (const idx of originalCollapsed) {
            //             if (idx >= insertIdx) {
            //                 // Вставка происходит ДО этой свернутой колонки - смещаем индекс
            //                 shiftedCollapsed.add(idx + count);
            //             } else {
            //                 // Вставка происходит ПОСЛЕ этой свернутой колонки - индекс не меняется
            //                 shiftedCollapsed.add(idx);
            //             }
            //         }
            //     } else {
            //         // Без сдвига - оставляем исходные индексы
            //         for (const idx of originalCollapsed) {
            //             shiftedCollapsed.add(idx);
            //         }
            //     }
            //     const newOriginalColumnWidths = shouldShift
            //         ? shiftMapIndices(state.originalColumnWidths, insertIdx, count)
            //         : state.originalColumnWidths;
            //     const newColumnGroups = shouldShift
            //         ? shiftGroupIndices(state.columnGroups, insertIdx, count)
            //         : state.columnGroups;

            //     return {
            //         ...state,
            //         collapsedColumns: shiftedCollapsed,
            //         originalColumnWidths: newOriginalColumnWidths,
            //         columnGroups: newColumnGroups,
            //     };
            // }

            // case 'ROW_DELETE': {
            //     const { index, count } = action.payload;
            //     const deleteIdx = index;
            //     const newCollapsedRows = deleteSetIndices(state.collapsedRows, deleteIdx, count);
            //     const newOriginalRowHeights = deleteMapIndices(state.originalRowHeights, deleteIdx, count);
            //     const newRowGroups = deleteGroupIndices(state.rowGroups, deleteIdx, count);
            //     return {
            //         ...state,
            //         collapsedRows: newCollapsedRows,
            //         originalRowHeights: newOriginalRowHeights,
            //         rowGroups: newRowGroups,
            //     };
            // }

            // case 'COLUMN_DELETE': {
            //     const { index, count } = action.payload;
            //     const deleteIdx = index;
            //     return {
            //         ...state,
            //         collapsedColumns: deleteSetIndices(state.collapsedColumns, deleteIdx, count),
            //         originalColumnWidths: deleteMapIndices(state.originalColumnWidths, deleteIdx, count),
            //         columnGroups: deleteGroupIndices(state.columnGroups, deleteIdx, count),
            //     };
            // }

            // case 'ROW_EXPAND':
            // case 'ROW_EXPAND_RESIZE': {
            //     const rowIndex = action.payload;

            //     // Если строка и так не свернута, можно вернуть состояние как есть
            //     if (!state.collapsedRows.has(rowIndex)) {
            //         return state;
            //     }

            //     const newCollapsedRows = new Set(state.collapsedRows);
            //     newCollapsedRows.delete(rowIndex);

            //     const newOriginalRowHeights = new Map(state.originalRowHeights);
            //     newOriginalRowHeights.delete(rowIndex);

            //     return {
            //         ...state,
            //         collapsedRows: newCollapsedRows,
            //         originalRowHeights: newOriginalRowHeights,
            //     };
            // }

            // case 'COLUMN_COLLAPSE': {
            //     const { columnIndex, originalWidth } = action.payload;
            //     const newCollapsedColumns = new Set(state.collapsedColumns).add(columnIndex);
            //     const newOriginalColumnWidths = new Map(state.originalColumnWidths);
            //     if (originalWidth !== undefined) {
            //         newOriginalColumnWidths.set(columnIndex, originalWidth);
            //     }
            //     return {
            //         ...state,
            //         collapsedColumns: newCollapsedColumns,
            //         originalColumnWidths: newOriginalColumnWidths,
            //     };
            // }

            // case 'COLUMN_EXPAND':
            // case 'COLUMN_EXPAND_RESIZE': {
            //     // Развернуть через ресайз — только убираем из collapsed, размер НЕ восстанавливаем
            //     const columnIndex = action.payload;
            //     const s = new Set(state.collapsedColumns);
            //     s.delete(columnIndex);
            //     const newOriginalColumnWidths = new Map(state.originalColumnWidths);
            //     newOriginalColumnWidths.delete(columnIndex);

            //     return {
            //         ...state,
            //         collapsedColumns: s,
            //         originalColumnWidths: newOriginalColumnWidths,
            //     };
            // }

            default:
                return state;
        }
    }

    // ─── СТАДИЯ 3: appendTransaction ─────────────────────────────────────────

    override appendTransaction(
        _tr: Transaction,
        _prevState: PluginGroupsState,
        _nextState: PluginGroupsState,
    ):
        | SpreadsheetAction
        | SpreadsheetAction[]
        | TransactionBuilder
        | TransactionBuilder[]
        | (SpreadsheetAction | TransactionBuilder)[]
        | null {
        return null;
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    override getTableAdapterProps(state: PluginGroupsState): Partial<ISpreadSheet> {
        const { rowGroups, columnGroups } = state;
        return { rowGroups, columnGroups };
    }

    override getContextMenuItems(state: PluginGroupsState, ctx: ContextMenuContext): TContextMenuItem[] {
        const { rowIndex, columnIndex } = ctx.cell.coordinates;
        const isRowHeader = columnIndex === -1 && rowIndex >= 0;
        const isColumnHeader = rowIndex === -1 && columnIndex >= 0;
        // const isCell = columnIndex !== -1 && rowIndex !== -1;

        // const { ranges } = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY)!;
        // const { rowsCount, columnsCount } = this.context.getPluginState(PLUGIN_METADATA_KEY)!;

        const items: TContextMenuItem[] = [];
        if (isRowHeader) {
            // if (ranges.length === 1) {
            //     const range = ranges[0];
            //     const fullRow =
            //         range.topLeft.coordinates.rowIndex <= rowIndex &&
            //         range.bottomRight.coordinates.rowIndex >= rowIndex &&
            //         range.topLeft.coordinates.columnIndex === 0 &&
            //         range.bottomRight.coordinates.columnIndex === columnsCount - 1;
            //     if (fullRow) {
            //         const group = rowGroups.find(
            //             (g) =>
            //                 g.start === range.topLeft.coordinates.rowIndex && g.end === range.bottomRight.coordinates.rowIndex,
            //         );
            //         if (group) {
            //             items.push(
            //                 {
            //                     label: 'Разгруппировать строки',
            //                     action: () => this._groupRowsRemove(group.id),
            //                     disabled: false,
            //                 },
            //                 { divider: true },
            //             );
            //         } else {
            //             items.push(
            //                 {
            //                     label: 'Группировать строки',
            //                     action: () =>
            //                         this._groupRows(
            //                             range.topLeft.coordinates.rowIndex,
            //                             range.bottomRight.coordinates.rowIndex,
            //                         ),
            //                     disabled: false,
            //                 },
            //                 { divider: true },
            //             );
            //         }
            //     }
            // }
        }

        return items;
    }

    private _gid = () => `group_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    private _groupRows = (start: number, end: number) =>
        this.context.dispatch({
            type: 'ROW_GROUP_ADD',
            payload: { id: this._gid(), start: Math.min(start, end), end: Math.max(start, end), collapsed: false },
        });

    private _groupRowsRemove = (id: string): void => this.context.dispatch({ type: 'ROW_GROUP_REMOVE', payload: id });

    private _groupColumns = (start: number, end: number): void =>
        this.context.dispatch({
            type: 'COLUMN_GROUP_ADD',
            payload: { id: this._gid(), start: Math.min(start, end), end: Math.max(start, end), collapsed: false },
        });

    private _groupColumnsRemove = (id: string): void => this.context.dispatch({ type: 'COLUMN_GROUP_REMOVE', payload: id });

    private _toggleGroup = (id: string, type: 'row' | 'column'): void =>
        this.context.dispatch({ type: 'GROUP_TOGGLE', payload: { id, groupType: type } });

    // ─── Render ───────────────────────────────────────────────────────────────
}
