import React, { createRef } from 'react';
import { ErrorIcon, IconButton, SuccessIcon } from 'ui-kit';

import { Cell, Range } from '../../AdapterSpreadSheet/models';
import { Plugin, SpreadsheetAction, Transaction, TransactionBuilder, VetoContext } from '../../AdapterSpreadSheet/plugin';
import { CellDataType, ContextMenuContext, ObjectIndexes, TContextMenuItem } from '../../AdapterSpreadSheet/types';
import { ISpreadSheet } from '../../TableAdapters/types';
import { getNextCell } from '../PluginCursorCell/utils';
import { PLUGIN_JOINED_CELLS_KEY } from '../PluginJoinedCells/constants';
import { FormulaInput } from './components/FormulaInput';
import { CELL_EDIT_ACTION, PLUGIN_CELL_EDIT_KEY } from './constants';
import { PluginCellEditOptions, PluginCellEditState } from './types';
import { applyCSVData, toCSVData } from './utils';

/**
 * PluginCellEdit — основной плагин редактирования ячеек.
 *
 * Жизненный цикл:
 *   CELL_DBL_CLICK -> appendTransaction -> CELL_EDIT_START
 *   ON_KEY_DOWN    -> appendTransaction -> CELL_EDIT_START (одиночный символ)
 *   _onInputKeyDown (DOM) -> _commitEdit -> transaction().commit(CELL_EDIT_END)
 *
 * Правила чистоты:
 *   - reducer — чистая функция, никаких this.* мутаций внутри
 *   - _liveValue / _caretPosition обновляются только в DOM-хендлерах
 *     и в appendTransaction (VALUE_SYNC, START)
 *   - re-entrant dispatch запрещён: _commitEdit(apply=false) возвращает
 *     action через appendTransaction, а не диспатчит напрямую
 *
 * Единственный путь подтверждения/отмены:
 *   _onInputKeyDown -> _commitEdit.
 *   appendTransaction(ON_KEY_DOWN) НЕ вызывает _commitEdit — только
 *   обрабатывает старт редактирования одиночным символом.
 *
 * Точка расширения VALUE_SYNC:
 *   Внешний плагин (PluginFormulas) возвращает VALUE_SYNC из appendTransaction,
 *   чтобы строка формул показывала оригинальную формулу, а не вычисленный результат.
 */
export class PluginCellEdit extends Plugin<typeof PLUGIN_CELL_EDIT_KEY, PluginCellEditState, PluginCellEditOptions> {
    readonly key = PLUGIN_CELL_EDIT_KEY;

    // readonly dependencies = [PLUGIN_CURSOR_CELL_KEY] as const;

    readonly initialState: PluginCellEditState = {
        currentValue: '',
        editingCell: null,
        markdownRules: [],
    };

    private inputRef: React.RefObject<any> = createRef();

    /**
     * Живое значение инпута — обновляется на каждый символ без dispatch.
     * Публичный геттер используется PluginFormulas без прямой зависимости на класс.
     */
    private _liveValue: string = '';

    /**
     * Позиция каретки.
     * Обновляется ТОЛЬКО в DOM-хендлерах (_onInputChange, _onInputKeyDown).
     */
    private _caretPosition: number | null = null;

    /**
     * Позиция каретки, отправленная в последнем dispatch.
     * Используется для пропуска дублирующих диспатчей при onCaretChange.
     */
    private _lastDispatchedCaretPosition: number | null = null;

    /**
     * Guard для async clipboard операций
     */
    private _clipboardInProgress = false;

    /**
     * ID запроса фокуса для отмены устаревших
     */
    private _focusRequestId: number | null = null;

    // ─── Публичный интерфейс для других плагинов ─────────────────────────────

    /** Текущее живое значение строки формул (без dispatch). */
    public getLiveValue(): string {
        return this._liveValue;
    }

    public getInputRef(): React.RefObject<any> {
        return this.inputRef;
    }

    /** Позиция каретки в инпуте на момент последнего события. */
    public getCaretPosition(): number | null {
        return this._caretPosition;
    }

    public focusInput(caretPosition?: number): void {
        if (this._focusRequestId !== null) {
            cancelAnimationFrame(this._focusRequestId);
        }

        this._focusRequestId = requestAnimationFrame(() => {
            this._focusRequestId = null;
            const { editingCell } = this.getState();
            if (!editingCell) return;

            const input = this.inputRef.current;
            if (!input) return;
            input?.components?.input?.focus();
            if (caretPosition !== undefined) {
                const maxPos = this._liveValue.length;
                input.setSelectionRange(Math.min(caretPosition, maxPos), Math.min(caretPosition, maxPos));
            }
        });
    }

    // ─── Стадия 1: veto ────────────────────────────────────────────────

    override collectVeto(_tr: Transaction, _state: PluginCellEditState): string | null {
        return null;
    }

    override resolveVetoes(_ctx: VetoContext, _state: PluginCellEditState): void {}

    // ─── Стадия 2: reducer ────────────────────────────────────────────────────

    override reducer(state: PluginCellEditState, tr: Transaction): PluginCellEditState {
        const { action } = tr;

        switch (action?.type) {
            case CELL_EDIT_ACTION.START: {
                const value = String(action.payload.value ?? '');
                return {
                    ...state,
                    currentValue: value,
                    editingCell: action.payload.cell,
                };
            }

            case CELL_EDIT_ACTION.INPUT: {
                return {
                    ...state,
                    currentValue: String(action.payload.value ?? ''),
                };
            }

            case CELL_EDIT_ACTION.END: {
                return { currentValue: '', editingCell: null, markdownRules: [] };
            }

            // Точка расширения: внешний плагин переопределяет значение строки формул
            case CELL_EDIT_ACTION.VALUE_SYNC: {
                return {
                    ...state,
                    currentValue: action.payload.value,
                };
            }

            case CELL_EDIT_ACTION.SET_MARKDOWN_RULES: {
                return {
                    ...state,
                    markdownRules: action.payload.markdownRules,
                };
            }

            default:
                return state;
        }
    }

    // ─── Стадия 3: appendTransaction ─────────────────────────────────────────

    override appendTransaction(
        tr: Transaction,
        prevState: PluginCellEditState,
        nextState: PluginCellEditState,
    ): SpreadsheetAction | TransactionBuilder | (SpreadsheetAction | TransactionBuilder)[] | null {
        // Двойной клик: старт редактирования
        if (!prevState.editingCell && tr.action?.type === 'CELL_DBL_CLICK') {
            const cell = new Cell(tr.action.payload.cell);
            const cellData = this.context.getCellAt(cell);
            if (cellData?.config?.readonly) return null;
            return { type: CELL_EDIT_ACTION.START, payload: { cell, value: nextState.currentValue } };
        }

        if (!prevState.editingCell && (tr.action?.type === 'CURSOR_SET' || tr.action?.type === 'CURSOR_MOVE')) {
            if (tr.action.payload?.cell) {
                const cellData = this.context.getCellAt(tr.action.payload.cell);
                const value = String(cellData?.data ?? '');
                return { type: CELL_EDIT_ACTION.VALUE_SYNC, payload: { value } };
            }
        }

        // ON_KEY_DOWN: горячие клавиши и старт редактирования
        if (!prevState.editingCell && tr.action?.type === 'ON_KEY_DOWN') {
            return this._handleKeyDownNotEditing(tr.action.payload.event, nextState);
        }

        if (tr.action?.type === CELL_EDIT_ACTION.EDIT_FORMULA_INPUT) {
            return {
                type: CELL_EDIT_ACTION.APPLY_FORMULA_INPUT,
                payload: { value: tr.action.payload.value },
            };
        }

        // Drag во время редактирования: завершить
        if (prevState.editingCell && tr.action?.type === 'RANGE_DRAG_START') {
            return this._handleDragDuringEdit(prevState);
        }

        // END: навигация после подтверждения
        if (tr.action?.type === CELL_EDIT_ACTION.END) {
            return this._handlePostEditNavigation(tr.action.payload);
        }

        return null;
    }

    override afterTransaction(tr: Transaction, _prevState: PluginCellEditState, nextState: PluginCellEditState): void {
        // Синхронизация _liveValue при навигации
        if (!nextState.editingCell && (tr.action?.type === 'CURSOR_SET' || tr.action?.type === 'CURSOR_MOVE')) {
            this._liveValue = nextState.currentValue;
        }

        // START: синхронизация DOM
        if (tr.action?.type === CELL_EDIT_ACTION.START) {
            this._liveValue = nextState.currentValue;
            this._caretPosition = nextState.currentValue.length;
            this.focusInput(this._caretPosition);
        }

        // INPUT: синхронизация
        if (tr.action?.type === CELL_EDIT_ACTION.INPUT) {
            const incoming = String(tr.action.payload.value ?? '');
            this._liveValue = incoming;
            this._caretPosition = tr.action.payload.caretPosition ?? incoming.length;
            if (tr.action.payload.caretPosition !== undefined) {
                this.focusInput(tr.action.payload.caretPosition);
            }
        }

        // END: сброс DOM + разрыв транзакции для range_drag
        if (tr.action?.type === CELL_EDIT_ACTION.END) {
            this._liveValue = '';
            this._caretPosition = null;
            this._lastDispatchedCaretPosition = null;
            requestAnimationFrame(() => this.context.table?.current?.focus());

            // Паттерн «разрыв транзакции»: когда редактирование завершается из-за
            // drag-старта, CELL_EDIT_END наследует skipHistory от RANGE_DRAG_START.
            // Чтобы запись данных всё же попала в undo, стартуем отдельную транзакцию
            // здесь — она не связана с родителем и имеет свой skipHistory=false.
            if (tr.action.payload.source === 'range_drag' && tr.action.payload.apply) {
                const { cell, value } = tr.action.payload;
                const existingCell = this.context.getCellAt(cell);
                const existingValue = String(existingCell?.data ?? '');
                if (!existingCell?.config?.readonly && value && String(value) !== existingValue) {
                    const cellRow = new Map<number, any>();
                    cellRow.set(cell.coordinates.columnIndex, {
                        ...(existingCell ?? {}),
                        data: String(value),
                        config: existingCell?.config ?? {},
                    });
                    const cellMap = new Map<number, typeof cellRow>();
                    cellMap.set(cell.coordinates.rowIndex, cellRow);
                    this.context.transaction().setCells(cellMap).commit();
                }
            }
        }

        // VALUE_SYNC: синхронизация
        if (tr.action?.type === CELL_EDIT_ACTION.VALUE_SYNC) {
            this._liveValue = tr.action.payload.value;
            this._caretPosition = tr.action.payload.value.length;
        }
    }

    // Сброс мутабельного состояния при undo/redo
    override onHistoryRestore(_restoredState: PluginCellEditState): void {
        this._liveValue = '';
        this._caretPosition = null;
        this._lastDispatchedCaretPosition = null;
        if (this._focusRequestId !== null) {
            cancelAnimationFrame(this._focusRequestId);
            this._focusRequestId = null;
        }
    }

    // ─── Обработчики appendTransaction ───────────────────────────────────────

    private _handleDelete(): TransactionBuilder {
        const ranges = this.context.getPluginState('PluginCursorCell')?.ranges ?? [];

        const tx = this.context.transaction();

        for (const range of ranges) {
            tx.deleteRange(range);
        }

        return tx;
    }

    private _handleKeyDownNotEditing(
        event: React.KeyboardEvent,
        nextState: PluginCellEditState,
    ): SpreadsheetAction | TransactionBuilder | (SpreadsheetAction | TransactionBuilder)[] | null {
        const ctrlKey = event.ctrlKey || event.metaKey;

        if (ctrlKey && event.code === 'KeyC') {
            event.preventDefault();
            // FIX(10.1): Используем guard
            if (!this._clipboardInProgress) {
                this._clipboardInProgress = true;
                this._onCopy().finally(() => {
                    this._clipboardInProgress = false;
                });
            }
            return null;
        }
        if (ctrlKey && event.code === 'KeyV') {
            event.preventDefault();
            if (!this._clipboardInProgress) {
                this._clipboardInProgress = true;
                this._onPaste().finally(() => {
                    this._clipboardInProgress = false;
                });
            }
            return null;
        }
        if (ctrlKey && event.code === 'KeyX') {
            event.preventDefault();
            if (!this._clipboardInProgress) {
                this._clipboardInProgress = true;
                this._onCut().finally(() => {
                    this._clipboardInProgress = false;
                });
            }
            return null;
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {
            return this._handleDelete();
        }

        const cursor = this.context.getPlugin('PluginCursorCell')?.cursor;
        if (event.key === 'Enter' || event.key === 'NumpadEnter') {
            if (!cursor) return null;
            event.preventDefault();

            const ranges = this.context.getPluginState('PluginCursorCell')?.ranges ?? [];
            if (ranges.length && ranges[0].size > 1) return null;

            const cellData = this.context.getCellAt(cursor.cell);
            if (cellData?.config?.readonly) return null;
            return { type: CELL_EDIT_ACTION.START, payload: { cell: cursor.cell, value: nextState.currentValue } };
        }

        if (!cursor || ctrlKey || event.altKey || event.key.length !== 1) return null;
        event.preventDefault();
        const cellData = this.context.getCellAt(cursor.cell);
        if (cellData?.config?.readonly) return null;
        return { type: CELL_EDIT_ACTION.START, payload: { cell: cursor.cell, value: event.key } };
    }

    /**
     * Обработчик drag-старта во время редактирования ячейки.
     *
     * Паттерн «разрыв транзакции»: appendTransaction возвращает только сигнальный
     * CELL_EDIT_END (skipHistory наследуется от RANGE_DRAG_START-родителя — ок,
     * сигнал не должен быть в undo). Фактическая запись данных выполняется
     * в afterTransaction отдельным context.transaction().commit() — эта транзакция
     * стартует независимо, без родительского skipHistory, и попадает в _past.
     */
    private _handleDragDuringEdit(prevState: PluginCellEditState): SpreadsheetAction | null {
        const { editingCell } = prevState;
        if (!editingCell) return null;

        const value = this._liveValue;
        const existingCell = this.context.getCellAt(editingCell);
        const existingValue = String(existingCell?.data ?? '');

        // apply=false: данные не изменились или readonly — просто завершаем редактирование
        const hasDataChange = !existingCell?.config?.readonly && !!value && value !== existingValue;

        return {
            type: CELL_EDIT_ACTION.END,
            payload: { cell: editingCell, value, apply: hasDataChange, source: 'range_drag' as const },
        };
    }

    private _handlePostEditNavigation(payload: {
        source: string;
        cell: Cell;
        value: string | number;
        apply: boolean;
    }): TransactionBuilder | null {
        const { source, cell } = payload;
        if (source === 'range_drag') return null;

        const cursorState = this.context.getPluginState('PluginCursorCell');
        if (!cursorState?.ranges?.length) return null;

        const navMap: Record<string, 'down' | 'right'> = { enter_key: 'down', tab_key: 'right' };
        const direction = navMap[source];
        const mm = this.context.metadataManager;
        const rowsCount = mm?.getRowsCount() ?? 100_000;
        const columnsCount = mm?.getColumnsCount() ?? 8_000;
        const joinedCells = this.context?.getPluginState(PLUGIN_JOINED_CELLS_KEY)?.joinedCells ?? [];

        const targetCell = direction ? getNextCell(cell, direction, joinedCells, rowsCount, columnsCount) : cell;

        return this.context
            .transaction()
            .withAction({ type: 'CURSOR_SET', payload: { cell: targetCell } })
            .skipHistory();
    }

    // ─── getCellDisplay ───────────────────────────────────────────────────────

    /**
     * Подменяет отображаемое значение активной ячейки на _liveValue.
     * Вызывается из Adapter.getCellDisplay на каждый рендер Canvas.
     * AdapterSpreadSheet не знает о _liveValue — вся логика здесь.
     */
    override getCellDisplay(state: PluginCellEditState, cell: ObjectIndexes, _raw: CellDataType): string | undefined {
        if (!state.editingCell) return undefined;

        if (
            state.editingCell.coordinates.rowIndex === cell.rowIndex &&
            state.editingCell.coordinates.columnIndex === cell.columnIndex
        ) {
            return this._liveValue;
        }

        return undefined;
    }

    // ─── getContextMenuItems ───────────────────────────────────────────────────────

    override getContextMenuItems(_state: PluginCellEditState, ctx: ContextMenuContext): TContextMenuItem[] {
        const { rowIndex, columnIndex } = ctx.cell.coordinates;
        if (!(columnIndex > 0 && rowIndex > 0)) return [];
        const cellConfig = this.context.getCellAt(ctx.cell)?.config ?? null;

        return [
            {
                label: 'Копировать',
                action: () => this._onCopy(),
                disabled: false,
            },
            {
                label: 'Вырезать',
                action: () => this._onCut(),
                disabled: !!cellConfig?.readonly,
            },
            {
                label: 'Вставить',
                action: () => this._onPaste(),
                disabled: !!cellConfig?.readonly,
            },
            { divider: true },
        ];
    }

    // ─── getTableAdapterProps ─────────────────────────────────────────────────

    override getTableAdapterProps(state: PluginCellEditState): Partial<ISpreadSheet> {
        const { editingCell, currentValue } = state;
        return { editingCell, currentValue };
    }

    // ─── _commitEdit ──────────────────────────────────────────────────────────

    /**
     * Записывает данные и диспатчит CELL_EDIT_END.
     *
     * Вызывается ТОЛЬКО из DOM-хендлеров (_onInputKeyDown, _onApplyClick,
     * _onCancelClick). Никогда не вызывается из appendTransaction —
     * это предотвращает re-entrant dispatch.
     */
    private _commitEdit(cell: Cell, value: string, apply: boolean, source: string = 'keyboard'): void {
        const tx = this.context.transaction().withAction({
            type: CELL_EDIT_ACTION.END,
            payload: { cell, value, apply, source },
        });

        // Excel-like: только реальная запись данных попадает в историю.
        // apply=false (Escape/Cancel) или данные не изменились → skipHistory.
        let hasDataChange = false;
        if (apply && value) {
            const existingCell = this.context.getCellAt(cell);
            const existingValue = String(existingCell?.data ?? '');
            if (!existingCell?.config?.readonly && value !== existingValue) {
                const cellRow = new Map<number, any>();
                cellRow.set(cell.coordinates.columnIndex, {
                    ...(existingCell ?? {}),
                    data: String(value),
                    config: existingCell?.config ?? {},
                });
                const cellMap = new Map<number, typeof cellRow>();
                cellMap.set(cell.coordinates.rowIndex, cellRow);
                tx.setCells(cellMap);
                hasDataChange = true;
            }
        }

        tx.commit(!hasDataChange);
    }

    // ─── DOM Event handlers ───────────────────────────────────────────────────

    private _onInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        this._liveValue = event.target.value;
    };

    /**
     * Единственный путь обработки Enter/Tab/Escape во время редактирования.
     */
    private _onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        const { editingCell } = this.getState();
        if (!editingCell) return;

        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                event.stopPropagation();
                this._commitEdit(editingCell, this._liveValue, false, 'escape');
                break;
            case 'Enter':
            case 'NumpadEnter':
                event.preventDefault();
                event.stopPropagation();
                // source = 'enter_key' — appendTransaction выполнит навигацию вниз
                this._commitEdit(editingCell, this._liveValue, true, 'enter_key');
                break;
            case 'Tab':
                event.preventDefault();
                event.stopPropagation();
                // source = 'tab_key' — appendTransaction выполнит навигацию вправо
                this._commitEdit(editingCell, this._liveValue, true, 'tab_key');
                break;

            default:
                break;
        }
    };

    /**
     * Игнорирует ложные срабатывания с position=0 сразу после программной установки фокуса.
     */
    private _onCaretChange = (position: number): void => {
        if (
            position === 0 &&
            this._caretPosition &&
            this._caretPosition > 0 &&
            this.getState().editingCell &&
            this._liveValue.length > 0
        ) {
            return;
        }

        this._caretPosition = position;
        if (position === this._lastDispatchedCaretPosition) return;
        this._lastDispatchedCaretPosition = position;

        const { editingCell } = this.getState();
        if (!editingCell) return;

        // ← Используем лёгкий action вместо полного INPUT
        this.context.dispatch(
            {
                type: CELL_EDIT_ACTION.CARET_MOVE,
                payload: { cell: editingCell, caretPosition: position },
            },
            { skipHistory: true },
        );
    };

    private _onApplyClick = (): void => {
        const { editingCell } = this.getState();
        if (!editingCell) return;
        this._commitEdit(editingCell, this._liveValue, true, 'button');
    };

    private _onCancelClick = (): void => {
        const { editingCell } = this.getState();
        if (!editingCell) return;
        this._commitEdit(editingCell, this._liveValue, false, 'button');
    };
    // ─── Copy / Paste ─────────────────────────────────────────────────────────────

    private _onCopy = async (target?: Range): Promise<void> => {
        const ranges = this.context.getPluginState('PluginCursorCell')?.ranges ?? [];
        if (ranges.length > 1) {
            alert('Данная команда не применима к нескольким диапазонам');
            return;
        }
        const copyTarget = ranges.length === 1 ? ranges[0] : target ?? null;

        if (!copyTarget) return;
        const result = toCSVData(copyTarget, (cell) => String(this.context.getCellAt(cell)?.data ?? ''));
        await navigator.clipboard.writeText(result).catch((err) => console.error('Copy failed', err));

        // Excel-like: копирование — сигнальное событие, не попадает в undo.
        this.context
            .transaction()
            .withAction({
                type: CELL_EDIT_ACTION.ON_COPY,
                payload: { range: copyTarget },
            })
            .commit(true);
    };

    private _onPaste = async (target?: Range): Promise<void> => {
        const csvData = await navigator.clipboard.readText();

        const ranges = this.context.getPluginState('PluginCursorCell')?.ranges ?? [];
        if (ranges.length > 1) {
            alert('Данная команда не применима к нескольким диапазонам');
            return;
        }

        const pasteTarget = ranges.length === 1 ? ranges[0] : target;
        if (!pasteTarget) return;

        // Используем только стартовую ячейку — весь CSV вставляется от неё,
        // не обрезаясь по размеру целевого выделения
        const startCell = pasteTarget instanceof Range ? pasteTarget.topLeft : pasteTarget;

        const cellsToWrite: Array<{ cell: Cell; value: string }> = [];
        applyCSVData(startCell, csvData, (cell, value) => {
            cellsToWrite.push({ cell, value });
        });

        if (!cellsToWrite.length) return;

        const savedCells = new Map<number, Map<number, any>>();
        for (const { cell, value } of cellsToWrite) {
            if (!value) continue;

            const { rowIndex, columnIndex } = cell.coordinates;
            const existing = this.context.getCellAt(cell);
            if (existing?.config?.readonly) continue;
            if (!savedCells.has(rowIndex)) savedCells.set(rowIndex, new Map());
            savedCells.get(rowIndex)!.set(columnIndex, { ...(existing ?? {}), data: value });
        }

        if (!savedCells.size) return;

        // Вставленный диапазон — от первой до последней ячейки
        const first = cellsToWrite[0].cell.coordinates;
        const last = cellsToWrite[cellsToWrite.length - 1].cell.coordinates;

        const pastedRange = new Range(
            new Cell({ rowIndex: first.rowIndex, columnIndex: first.columnIndex }),
            new Cell({ rowIndex: last.rowIndex, columnIndex: last.columnIndex }),
        );

        this.context
            .transaction()
            .withAction([
                { type: CELL_EDIT_ACTION.ON_PASTE, payload: { data: savedCells, range: pastedRange } },
                { type: 'RANGES_SET', payload: [pastedRange] },
            ])
            .setCells(savedCells)
            .commit();
    };

    private _onCut = async (target?: Range): Promise<void> => {
        const ranges = this.context.getPluginState('PluginCursorCell')?.ranges ?? [];
        if (ranges.length > 1) {
            alert('Данная команда не применима к нескольким диапазонам');
            return;
        }
        const cutTarget = ranges.length === 1 ? ranges[0] : target;
        if (!cutTarget) return;

        // Сначала копируем — если не получилось, не удаляем
        const csvData = toCSVData(cutTarget, (cell) => String(this.context.getCellAt(cell)?.data ?? ''));

        try {
            await navigator.clipboard.writeText(csvData);
        } catch (err) {
            console.error('Cut: clipboard write failed', err);
            alert('Не удалось скопировать данные в буфер обмена');
            return;
        }

        // Только после успешного копирования — удаляем
        const tx = this.context.transaction();
        for (const cell of cutTarget) {
            if (!this.context.getCellAt(cell)?.config?.readonly) {
                tx.deleteCell(cell.coordinates.rowIndex, cell.coordinates.columnIndex);
            }
        }
        for (const range of ranges) {
            tx.clearPluginConfigRange(range);
        }
        tx.commit();
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        const { editingCell, currentValue, markdownRules } = this.getState();

        return (
            <>
                <IconButton
                    icon={ErrorIcon}
                    title="Отмена (Esc)"
                    onClick={this._onCancelClick}
                    variant="text"
                    color="error"
                    disabled={!editingCell}
                />
                <IconButton
                    icon={SuccessIcon}
                    title="Применить (Enter)"
                    onClick={this._onApplyClick}
                    variant="text"
                    color="success"
                    disabled={!editingCell}
                />
                <FormulaInput
                    ref={this.inputRef}
                    initialValue={currentValue}
                    markdownRules={markdownRules}
                    disabled={!editingCell}
                    onChange={this._onInputChange}
                    onKeyDown={this._onInputKeyDown}
                    onCaretChange={this._onCaretChange}
                />
            </>
        );
    }
}
