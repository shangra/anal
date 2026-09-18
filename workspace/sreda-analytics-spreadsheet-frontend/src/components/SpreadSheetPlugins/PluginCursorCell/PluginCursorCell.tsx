import React from 'react';
import { Input } from 'ui-kit';

import { Cell, JoinedCell, Range } from '../../AdapterSpreadSheet/models';
import { Plugin, SpreadsheetAction, Transaction, TransactionBuilder, VetoContext } from '../../AdapterSpreadSheet/plugin';
import { ICell, ObjectIndexes } from '../../AdapterSpreadSheet/types';
import {
    generateExcelSpreadSheetCoordinate,
    getJoinedCellBottom,
    getJoinedCellLeft,
    getJoinedCellRight,
    getJoinedCellTop,
} from '../../AdapterSpreadSheet/utils';
import { ISpreadSheet } from '../../TableAdapters/types';
import { PLUGIN_JOINED_CELLS_KEY } from '../PluginJoinedCells/constants';
import { PLUGIN_METADATA_KEY } from '../PluginMetadata';
import { PLUGIN_CURSOR_CELL_KEY } from './constants';
import { ICursor, PluginCursorCellOptions, PluginCursorCellState } from './types';
import { DraggingRange, getNextBoundaryCell, getNextCell, getNextNonEmptyRange, isCellInRanges } from './utils';

export class PluginCursorCell extends Plugin<typeof PLUGIN_CURSOR_CELL_KEY, PluginCursorCellState, PluginCursorCellOptions> {
    readonly key = PLUGIN_CURSOR_CELL_KEY;

    readonly initialState: PluginCursorCellState = {
        ranges: [],
        activeRangeIndex: 0,
        rangesStyles: {},
    };

    override readonly dependencies = [PLUGIN_METADATA_KEY];

    /**
     * Мутабельное состояние drag-операции.
     * НЕ входит в иммутабельный слайс — живёт вне reducer.
     */
    private _draggingRange: DraggingRange | null = null;

    private _globalMouseUpHandler: (() => void) | null = null;

    /** Активный курсор — cursor последнего Range, либо null */
    get cursor(): ICursor | null {
        const { ranges, activeRangeIndex } = this.getState();
        if (!ranges.length) return null;
        const activeRange = ranges[activeRangeIndex] ?? ranges[ranges.length - 1];
        return { cell: activeRange.cursor };
    }

    // ─── Вспомогательные геттеры ───────────────────────────────────────────────

    private _getJoinedCells(): JoinedCell[] {
        return this.context?.getPluginState(PLUGIN_JOINED_CELLS_KEY)?.joinedCells ?? [];
    }

    /** Возвращает [rowsCount, columnsCount] из MetadataManager */
    private _getStructureTuple(): [number, number] {
        const mm = this.context?.metadataManager;
        return [mm?.getRowsCount() ?? 100_000, mm?.getColumnsCount() ?? 8_000];
    }

    // ─── Lyfecycle ─────────────────────────────────────────────────────

    override onMount(): void {
        this._globalMouseUpHandler = this._onGlobalMouseUp.bind(this);
        window.addEventListener('mouseup', this._globalMouseUpHandler, { passive: true });
    }

    override onUnmount(): void {
        if (this._globalMouseUpHandler) {
            window.removeEventListener('mouseup', this._globalMouseUpHandler);
            this._globalMouseUpHandler = null;
        }
        this._draggingRange = null;
    }

    private _onGlobalMouseUp(): void {
        if (!this._draggingRange) return;
        this.context.dispatch({ type: 'CELL_MOUSE_UP' }, { skipHistory: true });
    }

    // ─── Стадия 1: veto ────────────────────────────────────────────────

    override collectVeto(_tr: Transaction, _state: PluginCursorCellState): string | null {
        return null;
    }

    override resolveVetoes(_ctx: VetoContext, _state: PluginCursorCellState): void {}

    // ─── Стадия 2: reducer ────────────────────────────────────────────────────

    override reducer(state: PluginCursorCellState, tr: Transaction): PluginCursorCellState {
        const { action } = tr;

        switch (action?.type) {
            // ── Cursor ────────────────────────────────────────────────────────

            case 'CURSOR_MOVE': {
                if (!state.ranges.length) return state;
                const { cell } = action.payload;
                const ranges = state.ranges.slice();

                const targetIdx = ranges.findIndex((r) => r.contains(cell));
                if (targetIdx !== -1) {
                    ranges[targetIdx] = ranges[targetIdx].withCursor(cell);
                    return { ...state, ranges, activeRangeIndex: targetIdx };
                }

                // Ячейка вне всех диапазонов — одноклеточный Range, сброс
                return {
                    ...state,
                    ranges: [new Range(cell, cell, cell)],
                    activeRangeIndex: 0,
                };
            }

            case 'CURSOR_SET': {
                const { cell } = action.payload;
                return {
                    ...state,
                    ranges: [new Range(cell, cell, cell)],
                    activeRangeIndex: 0,
                };
            }

            case 'RANGES_SET':
                return { ...state, ranges: action.payload, activeRangeIndex: action.payload.length - 1 };

            case 'RANGE_ADD':
                return { ...state, ranges: [...state.ranges, action.payload], activeRangeIndex: state.ranges.length - 1 };

            // ── Drag ──────────────────────────────────────────────────────────

            case 'RANGE_DRAG_START': {
                const { cell, operation, range } = action.payload;
                // range вычислен в appendTransaction — просто применяем
                const rangeWithCursor = range.withCursor(cell);
                const nextRanges = operation === 'add' ? [...state.ranges, rangeWithCursor] : [rangeWithCursor];
                return { ...state, ranges: nextRanges, activeRangeIndex: nextRanges.length - 1 };
            }

            case 'RANGE_DRAG_MOVE': {
                const { range } = action.payload;
                // range вычислен в appendTransaction; если его нет — нет изменений
                if (!range) return state;
                const lastCursor = state.ranges[state.ranges.length - 1]?.cursor;
                const updatedRange = lastCursor ? range.withCursor(lastCursor) : range;
                return { ...state, ranges: [...state.ranges.slice(0, -1), updatedRange] };
            }

            case 'RANGE_DRAG_END': {
                if (!action.payload) return state;
                const { range: finalRange, isSubtraction } = action.payload;

                const lastCursor = state.ranges[state.ranges.length - 1]?.cursor;
                const finalWithCursor = lastCursor ? finalRange.withCursor(lastCursor) : finalRange;

                const result = !isSubtraction
                    ? [...state.ranges.slice(0, -1), finalWithCursor]
                    : state.ranges.flatMap((r) => r.remove(finalRange).filter((s) => s.size > 0));

                const nextResult =
                    isSubtraction && result.length ? [result[0].withCursor(result[0].topLeft), ...result.slice(1)] : result;

                const nextActive = isSubtraction ? 0 : state.activeRangeIndex;
                return { ...state, ranges: nextResult, activeRangeIndex: nextActive };
            }

            // ── Прочее ────────────────────────────────────────────────────────

            case 'RANGES_STYLES_SET':
                return { ...state, rangesStyles: action.payload };

            case 'RANGE_STYLE_SET':
                return { ...state, rangesStyles: { ...state.rangesStyles, [action.payload.range]: action.payload.styles } };

            default:
                return state;
        }
    }

    // ─── Вспомогательные методы appendTransaction ─────────────────────────────

    /**
     * Инициализирует _draggingRange и возвращает начальный Range.
     * Единственное место создания DraggingRange — вызывается из всех *_MOUSE_DOWN.
     */
    private _startDragging(cell: Cell, operation: 'set' | 'add'): Range {
        const [rowsCount, columnsCount] = this._getStructureTuple();
        const joinedCells = this._getJoinedCells();
        const isInExisting = isCellInRanges(cell, this.getState().ranges);

        this._draggingRange = new DraggingRange(cell, rowsCount, columnsCount, joinedCells);
        this._draggingRange.setSubtractionMode(isInExisting && operation === 'add');

        return this._draggingRange.getCurrentRange();
    }

    /**
     * Финализирует drag и сбрасывает _draggingRange.
     * Возвращает RANGE_DRAG_END с финальным range и флагом isSubtraction.
     * Если drag не был начат — возвращает RANGE_DRAG_END без payload.
     */
    private _buildDragEndAction(): SpreadsheetAction {
        if (!this._draggingRange) {
            return { type: 'RANGE_DRAG_END', payload: undefined };
        }

        const range = this._draggingRange.dragEnd();
        const isSubtraction = this._draggingRange.isSubtraction();
        this._draggingRange = null;

        return { type: 'RANGE_DRAG_END', payload: { range, isSubtraction } };
    }

    /** RANGE_DRAG_START -> MOVE -> END — атомарное расширение выделения */
    private _extendSelectionTo(from: Cell, to: Cell): SpreadsheetAction[] {
        const range = this._startDragging(from, 'set');
        const startAction: SpreadsheetAction = {
            type: 'RANGE_DRAG_START',
            payload: { cell: from, operation: 'set', range },
        };

        const { isChanged, range: movedRange } = this._draggingRange!.drag(to);
        const moveAction: SpreadsheetAction = {
            type: 'RANGE_DRAG_MOVE',
            payload: { cell: to, range: isChanged ? movedRange : null },
        };

        return [startAction, moveAction, this._buildDragEndAction()];
    }

    // ─── Стадия 3: appendTransaction ──────────────────────────────────────────

    override appendTransaction(
        tr: Transaction,
        _prevState: PluginCursorCellState,
        nextState: PluginCursorCellState,
    ):
        | SpreadsheetAction
        | SpreadsheetAction[]
        | TransactionBuilder
        | TransactionBuilder[]
        | (SpreadsheetAction | TransactionBuilder)[]
        | null {
        const { action } = tr;
        if (!action) return null; // data-only транзакция — курсор не трогаем

        // ── Клавиатурная навигация ─────────────────────────────────────────────
        if (action.type === 'ON_KEY_DOWN') {
            return this._handleNavigationKeyDown(action.payload.event);
        }

        // ── Клик по ячейке ────────────────────────────────────────────────────
        if (action.type === 'CELL_MOUSE_DOWN') {
            return this._handleCellMouseDown(action.payload);
        }

        // ── Drag по ячейкам ───────────────────────────────────────────────────
        if (action.type === 'CELL_ENTER') {
            if (!this._draggingRange) return null;

            const cell = new Cell(action.payload.cell);
            const { isChanged, range } = this._draggingRange.drag(cell);
            if (!isChanged) return null;

            return { type: 'RANGE_DRAG_MOVE', payload: { cell, range } };
        }

        if (action.type === 'CELL_MOUSE_UP') {
            return this._buildDragEndAction();
        }

        // ── Угловой root-элемент ──────────────────────────────────────────────
        if (action.type === 'ROOT_MOUSE_DOWN') {
            return this._handleRootMouseDown();
        }

        // ── Заголовки строк ───────────────────────────────────────────────────
        if (action.type === 'ROW_HEADER_MOUSE_DOWN') {
            const { cell, ctrlKey, metaKey, shiftKey } = action.payload;
            const ctrl = ctrlKey || metaKey;
            const operation: 'set' | 'add' = ctrl ? 'add' : 'set';
            const clickedCell = new Cell(cell);

            // Shift+click: расширяем выделение от текущего курсора через _extendSelectionTo
            if (!ctrl && shiftKey) {
                const _cell = this.cursor?.cell ?? clickedCell;
                return this._extendSelectionTo(new Cell({ rowIndex: _cell.rowIndex, columnIndex: -1 }), clickedCell);
            }

            const range = this._startDragging(clickedCell, operation);
            return { type: 'RANGE_DRAG_START', payload: { cell: clickedCell, operation, range } };
        }

        if (action.type === 'ROW_HEADER_CELL_ENTER') {
            if (!this._draggingRange) return null;

            const cell = new Cell({ rowIndex: action.payload.rowIndex, columnIndex: -1 });
            const { isChanged, range } = this._draggingRange.drag(cell);
            if (!isChanged) return null;

            return { type: 'RANGE_DRAG_MOVE', payload: { cell, range } };
        }

        if (action.type === 'ROW_HEADER_MOUSE_UP') {
            return this._buildDragEndAction();
        }

        // ── Заголовки колонок ─────────────────────────────────────────────────
        if (action.type === 'COL_HEADER_MOUSE_DOWN') {
            const { cell, ctrlKey, metaKey, shiftKey } = action.payload;
            const ctrl = ctrlKey || metaKey;
            const operation: 'set' | 'add' = ctrl ? 'add' : 'set';
            const clickedCell = new Cell(cell);

            // Shift+click: расширяем выделение от текущего курсора через _extendSelectionTo
            if (!ctrl && shiftKey) {
                const _cell = this.cursor?.cell ?? clickedCell;
                return this._extendSelectionTo(new Cell({ rowIndex: -1, columnIndex: _cell.columnIndex }), clickedCell);
            }

            const range = this._startDragging(clickedCell, operation);
            return { type: 'RANGE_DRAG_START', payload: { cell: clickedCell, operation, range } };
        }

        if (action.type === 'COL_HEADER_CELL_ENTER') {
            if (!this._draggingRange) return null;

            const cell = new Cell({ rowIndex: -1, columnIndex: action.payload.columnIndex });
            const { isChanged, range } = this._draggingRange.drag(cell);
            if (!isChanged) return null;

            return { type: 'RANGE_DRAG_MOVE', payload: { cell, range } };
        }

        if (action.type === 'COL_HEADER_MOUSE_UP') {
            return this._buildDragEndAction();
        }

        // ── RANGE_DRAG_END -> финализация в RANGES_SET ────────────────────────
        if (action.type === 'RANGE_DRAG_END') {
            const { ranges } = nextState;
            const cursor = ranges[nextState.activeRangeIndex]?.cursor ?? ranges[ranges.length - 1]?.cursor;
            const actions: SpreadsheetAction[] = [{ type: 'RANGES_SET', payload: ranges }];
            if (cursor) {
                actions.push({ type: 'CURSOR_MOVE', payload: { cell: cursor } });
            }
            return actions;
        }

        // ── Контекстное меню ──────────────────────────────────────────────────
        if (action.type === 'CONTEXT_MENU') {
            const { cell } = action.payload;
            const { ranges } = nextState;
            if (ranges.some((r) => r.contains(cell))) return null;

            const range = this._startDragging(cell, 'set');
            return [{ type: 'RANGE_DRAG_START', payload: { cell, operation: 'set', range } }, this._buildDragEndAction()];
        }

        // ── Удаление данных (delete/backspace) — перемещаем курсор на cursor ──
        // Реагируем на любое удаление (tr.getDataChanges() with after === null),
        // независимо от источника action-а.
        {
            const dataChanges = tr.getDataChanges();
            const hasDeletions = dataChanges.some((c) => c.before !== null && c.after === null);
            if (hasDeletions && nextState?.ranges?.length) {
                const activeRange =
                    nextState.ranges[nextState.activeRangeIndex] ?? nextState.ranges[nextState.ranges.length - 1];
                const cell = activeRange?.cursor;
                if (cell) return { type: 'CURSOR_MOVE', payload: { cell } };
            }
        }

        return null;
    }

    override onHistoryRestore(_restoredState: PluginCursorCellState): void {
        this._draggingRange = null;
    }

    // ─── Навигация: клавиатура ────────────────────────────────────────────────

    private _handleNavigationKeyDown(event: React.KeyboardEvent): SpreadsheetAction | SpreadsheetAction[] | null {
        const { cursor } = this;
        if (!cursor) return null;

        const ctrlKey = event.ctrlKey || event.metaKey;
        const { cell: cursorCell } = cursor;

        // Ctrl+A — выделить область данных
        if (ctrlKey && event.code === 'KeyA') {
            event.preventDefault();
            return this._handleSelectAll(cursorCell);
        }

        // Enter / NumpadEnter — навигация по ячейкам (Shift+Enter — назад)
        if (event.key === 'Enter' || event.key === 'NumpadEnter') {
            event.preventDefault();
            return this._handleEnterNav(cursorCell, event.shiftKey);
        }

        // Tab — горизонтальная навигация (аналог Enter по вертикали)
        if (event.key === 'Tab') {
            event.preventDefault();
            return this._handleTabNav(cursorCell, event.shiftKey);
        }

        // Стрелки
        const arrowDir: Record<string, 'left' | 'up' | 'right' | 'down'> = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right',
        };
        const direction = arrowDir[event.key];
        if (direction) {
            event.preventDefault();
            if (event.shiftKey && ctrlKey) return this._handleShiftCtrlArrow(cursorCell, direction);
            if (event.shiftKey) return this._handleShiftArrow(cursorCell, direction);
            if (ctrlKey) return this._handleCtrlArrow(cursorCell, direction);
            return this._handleArrow(cursorCell, direction);
        }

        return null;
    }

    // ─── Навигация: мышь ──────────────────────────────────────────────────────

    private _handleCellMouseDown(payload: {
        cell: ObjectIndexes;
        ctrlKey: boolean;
        metaKey: boolean;
        shiftKey: boolean;
    }): SpreadsheetAction | SpreadsheetAction[] {
        let { cell: cellCoords } = payload;
        const { ctrlKey, metaKey, shiftKey } = payload;

        // Если кликнутая ячейка — часть joined cell, переходим на mainCell
        const joinedCells = this._getJoinedCells();
        const clickedCell = new Cell(cellCoords);
        for (const jc of joinedCells) {
            if (jc.range.contains(clickedCell)) {
                cellCoords = jc.mainCell.coordinates;
                break;
            }
        }

        const cell = new Cell(cellCoords);
        const ctrl = ctrlKey || metaKey;
        const operation: 'set' | 'add' = ctrl ? 'add' : 'set';

        // Shift+click: расширяем выделение от текущего курсора через _extendSelectionTo
        if (!ctrl && shiftKey) {
            const startCell = this.cursor?.cell ?? cell;
            return this._extendSelectionTo(startCell, cell);
        }

        // Обычный клик / Ctrl+click: только старт drag, движение придёт через CELL_ENTER
        const range = this._startDragging(cell, operation);
        return [{ type: 'RANGE_DRAG_START', payload: { cell, operation, range } }];
    }

    private _handleRootMouseDown(): SpreadsheetAction[] {
        const [rowsCount, columnsCount] = this._getStructureTuple();
        const topLeft = new Cell({ rowIndex: 0, columnIndex: 0 });
        const bottomRight = new Cell({ rowIndex: rowsCount - 1, columnIndex: columnsCount - 1 });
        return this._extendSelectionTo(topLeft, bottomRight);
    }

    // ─── Навигация: приватные методы ──────────────────────────────────────────

    private _handleSelectAll(cursorCell: Cell): SpreadsheetAction[] {
        const [rowsCount, columnsCount] = this._getStructureTuple();
        const range = getNextNonEmptyRange(
            this.context.getData() as Map<number, Map<number, ICell>>,
            rowsCount,
            columnsCount,
            cursorCell,
        );

        if (!range) return this._handleRootMouseDown();

        return this._extendSelectionTo(range.topLeft, range.bottomRight);
    }

    private _handleArrow(cursorCell: Cell, dir: 'left' | 'up' | 'right' | 'down'): SpreadsheetAction[] {
        const cell = getNextCell(cursorCell, dir, this._getJoinedCells(), ...this._getStructureTuple());
        return this._extendSelectionTo(cell, cell);
    }

    private _handleCtrlArrow(cursorCell: Cell, dir: 'left' | 'up' | 'right' | 'down'): SpreadsheetAction[] {
        const cell = getNextBoundaryCell(
            this.context.getData() as Map<number, Map<number, ICell>>,
            cursorCell,
            dir,
            ...this._getStructureTuple(),
        );
        return this._extendSelectionTo(cell, cell);
    }

    private _handleShiftArrow(cursorCell: Cell, dir: 'left' | 'up' | 'right' | 'down'): SpreadsheetAction[] {
        const { ranges } = this.getState();
        const end = ranges.length ? new Cell(ranges[ranges.length - 1].end) : cursorCell;
        const nextEnd = getNextCell(end, dir, this._getJoinedCells(), ...this._getStructureTuple());
        return this._extendSelectionTo(cursorCell, nextEnd);
    }

    private _handleShiftCtrlArrow(cursorCell: Cell, dir: 'left' | 'up' | 'right' | 'down'): SpreadsheetAction[] {
        const { ranges } = this.getState();
        const end = ranges.length ? new Cell(ranges[ranges.length - 1].end) : cursorCell;
        const nextEnd = getNextBoundaryCell(
            this.context.getData() as Map<number, Map<number, ICell>>,
            end,
            dir,
            ...this._getStructureTuple(),
        );
        return this._extendSelectionTo(cursorCell, nextEnd);
    }

    private _handleEnterNav(cursor: Cell, reverse: boolean): SpreadsheetAction | null {
        const { ranges } = this.getState();
        const joinedCells = this._getJoinedCells();
        if (!ranges.length) return null;

        let idx = ranges.findIndex((r) => r.contains(cursor));
        if (idx === -1) return null;

        const { topLeft, bottomRight } = ranges[idx];
        const minRow = topLeft.coordinates.rowIndex;
        const maxRow = bottomRight.coordinates.rowIndex;
        const minCol = topLeft.coordinates.columnIndex;
        const maxCol = bottomRight.coordinates.columnIndex;

        let newRow = cursor.coordinates.rowIndex + (reverse ? -1 : 1);
        let newCol = cursor.coordinates.columnIndex;

        if (!reverse) {
            newRow = getJoinedCellBottom(joinedCells, newRow, newCol);
            if (newRow > maxRow) {
                newRow = minRow;
                newCol++;
                if (newCol > maxCol) {
                    idx = (idx + 1) % ranges.length;
                    newRow = ranges[idx].topLeft.coordinates.rowIndex;
                    newCol = ranges[idx].topLeft.coordinates.columnIndex;
                }
            }
        } else {
            newRow = getJoinedCellTop(joinedCells, newRow, newCol);
            if (newRow < minRow) {
                newRow = maxRow;
                newCol--;
                if (newCol < minCol) {
                    idx = idx === 0 ? ranges.length - 1 : idx - 1;
                    newRow = ranges[idx].bottomRight.coordinates.rowIndex;
                    newCol = ranges[idx].bottomRight.coordinates.columnIndex;
                }
            }
        }

        const cell = new Cell({ rowIndex: newRow, columnIndex: newCol });
        return { type: 'CURSOR_MOVE', payload: { cell } };
    }

    /**
     * Tab — навигация по колонкам внутри выделенных диапазонов.
     *
     * Поведение аналогично Enter по строкам (_handleEnterNav):
     *   - Tab       -> следующая колонка, при достижении конца -> следующая строка
     *   - Shift+Tab -> предыдущая колонка, при достижении начала -> предыдущая строка
     *   - Циклическая навигация по нескольким диапазонам (Ctrl+клик)
     */
    private _handleTabNav(cursor: Cell, reverse: boolean): SpreadsheetAction | null {
        const { ranges } = this.getState();
        const joinedCells = this._getJoinedCells();
        if (!ranges.length) return null;

        let idx = ranges.findIndex((r) => r.contains(cursor));
        if (idx === -1) return null;

        const { topLeft, bottomRight } = ranges[idx];
        const minRow = topLeft.coordinates.rowIndex;
        const maxRow = bottomRight.coordinates.rowIndex;
        const minCol = topLeft.coordinates.columnIndex;
        const maxCol = bottomRight.coordinates.columnIndex;

        let newRow = cursor.coordinates.rowIndex;
        let newCol = cursor.coordinates.columnIndex + (reverse ? -1 : 1);

        if (!reverse) {
            if (newCol > maxCol) {
                // Перенос на следующую строку
                newCol = minCol;
                // Учитываем joined cells при переходе на следующую строку
                newRow = getJoinedCellBottom(joinedCells, newRow + 1, newCol);
                if (newRow > maxRow) {
                    idx = (idx + 1) % ranges.length;
                    newRow = ranges[idx].topLeft.coordinates.rowIndex;
                    newCol = ranges[idx].topLeft.coordinates.columnIndex;
                }
            } else {
                // Учитываем joined cells при горизонтальном движении
                newCol = getJoinedCellRight(joinedCells, newRow, newCol);
                if (newCol > maxCol) {
                    newCol = minCol;
                    newRow = getJoinedCellBottom(joinedCells, newRow + 1, newCol);
                    if (newRow > maxRow) {
                        idx = (idx + 1) % ranges.length;
                        newRow = ranges[idx].topLeft.coordinates.rowIndex;
                        newCol = ranges[idx].topLeft.coordinates.columnIndex;
                    }
                }
            }
        } else if (newCol < minCol) {
            newCol = maxCol;
            // Учитываем joined cells при переходе на предыдущую строку
            newRow = getJoinedCellTop(joinedCells, newRow - 1, newCol);
            if (newRow < minRow) {
                idx = idx === 0 ? ranges.length - 1 : idx - 1;
                newRow = ranges[idx].bottomRight.coordinates.rowIndex;
                newCol = ranges[idx].bottomRight.coordinates.columnIndex;
            }
        } else {
            // Учитываем joined cells при горизонтальном движении назад
            newCol = getJoinedCellLeft(joinedCells, newRow, newCol);
            if (newCol < minCol) {
                newCol = maxCol;
                newRow = getJoinedCellTop(joinedCells, newRow - 1, newCol);
                if (newRow < minRow) {
                    idx = idx === 0 ? ranges.length - 1 : idx - 1;
                    newRow = ranges[idx].bottomRight.coordinates.rowIndex;
                    newCol = ranges[idx].bottomRight.coordinates.columnIndex;
                }
            }
        }

        return {
            type: 'CURSOR_MOVE',
            payload: { cell: new Cell({ rowIndex: newRow, columnIndex: newCol }) },
        };
    }

    // ─── getTableAdapterProps ─────────────────────────────────────────────────

    override getTableAdapterProps(state: PluginCursorCellState): Partial<ISpreadSheet> {
        const { ranges, activeRangeIndex, rangesStyles } = state;
        const activeRange = ranges[activeRangeIndex] ?? ranges[ranges.length - 1] ?? null;
        const cursor: ICursor | null = activeRange ? { cell: activeRange.cursor } : null;
        return { cursor, ranges, rangesStyles };
    }

    // ─── Вычисление имени ячейки ──────────────────────────────────────────────

    private _computeCellName(): string {
        const { ranges, activeRangeIndex } = this.getState();
        if (!ranges.length) return '';

        const activeRange = ranges[activeRangeIndex] ?? ranges[ranges.length - 1];
        // Защита от plain objects в ranges (см. DrpCodec — проблема сериализации Range)
        if (!(activeRange instanceof Range)) {
            return '';
        }
        return generateExcelSpreadSheetCoordinate(activeRange.cursor.coordinates);
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        const cellName = this._computeCellName();
        return <Input variant="contained" readOnly value={cellName} style={{ width: 80, minWidth: 80 }} />;
    }
}
