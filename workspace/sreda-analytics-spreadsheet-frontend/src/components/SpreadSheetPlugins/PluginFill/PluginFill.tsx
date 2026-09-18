import { Cell } from '../../AdapterSpreadSheet/models';
import { Plugin, SpreadsheetAction, Transaction, TransactionBuilder } from '../../AdapterSpreadSheet/plugin';
import { ICell } from '../../AdapterSpreadSheet/types';
import { ISpreadSheet } from '../../TableAdapters/types';
import { PLUGIN_CURSOR_CELL_KEY } from '../PluginCursorCell/constants';
import { PLUGIN_JOINED_CELLS_KEY } from '../PluginJoinedCells/constants';
import { PLUGIN_METADATA_KEY } from '../PluginMetadata';
import { PLUGIN_FILL_KEY } from './constants';
import { PluginFillOptions, PluginFillState } from './types';
import { AutoFillManager, FillHandleManager } from './utils';
import { AutoFillReadonlyError } from './utils/AutoFillManager/errors';
import { IAutoFillStrategy } from './utils/AutoFillManager/types';

/**
 * PluginFill — владелец fill handle: менеджеры, логика автозаполнения, undo.
 *
 * Схема:
 *   AdapterSpreadSheet.onFillHandle* -> dispatchEvent(FILL_HANDLE_*) -> appendTransaction
 *     -> FillHandleManager (drag state)
 *     -> AutoFillManager (стратегии заполнения)
 *     -> transaction().setCells(filledData).commit(FILL_END)  <- одна запись undo
 *
 * Undo:
 *   FILL_END транзакция несёт dataChanges — один Ctrl+Z откатывает заполненные ячейки.
 *   FILL_START / FILL_MOVE — skipHistory, UI-only.
 */
export class PluginFill extends Plugin<typeof PLUGIN_FILL_KEY, PluginFillState, PluginFillOptions> {
    readonly key = PLUGIN_FILL_KEY;

    readonly initialState: PluginFillState = { fillDraggingRange: null };

    // Инициализируем с дефолтными значениями; onMount() обновляет из реального стейта.
    private _fillHandleManager: FillHandleManager = new FillHandleManager(100_000, 8_000, []);

    private _autoFillManager: AutoFillManager = new AutoFillManager();

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    override onMount(): void {
        this._syncManagerParams();
    }

    // ─── Стадия 2: reducer ────────────────────────────────────────────────────

    override reducer(state: PluginFillState, tr: Transaction): PluginFillState {
        const { action } = tr;

        switch (action?.type) {
            case 'FILL_START':
                return { fillDraggingRange: action.payload };

            case 'FILL_MOVE':
                return { fillDraggingRange: action.payload };

            case 'FILL_END':
            case 'FILL_CANCEL':
                return { fillDraggingRange: null };

            default:
                return state;
        }
    }

    // ─── Стадия 3: appendTransaction ──────────────────────────────────────────

    override appendTransaction(
        tr: Transaction,
        _prevState: PluginFillState,
        _nextState: PluginFillState,
    ): SpreadsheetAction | SpreadsheetAction[] | TransactionBuilder | (SpreadsheetAction | TransactionBuilder)[] | null {
        const { action } = tr;
        if (!action) return null;

        if (action.type === 'FILL_HANDLE_MOUSE_DOWN') {
            return this._handleMouseDown();
        }

        if (action.type === 'FILL_HANDLE_MOUSE_MOVE') {
            return this._handleMouseMove(action.payload.cell);
        }

        if (action.type === 'FILL_HANDLE_MOUSE_UP') {
            return this._handleMouseUp();
        }

        if (action.type === 'FILL_HANDLE_CANCEL') {
            return this._handleCancel();
        }

        return null;
    }

    // ─── Обработчики appendTransaction ────────────────────────────────────────

    private _handleMouseDown(): SpreadsheetAction | SpreadsheetAction[] | null {
        const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY);
        const ranges = cursorState?.ranges ?? [];
        if (!ranges.length) return null;

        const source = ranges[ranges.length - 1];

        // Синхронизируем параметры с текущей структурой перед стартом
        this._syncManagerParams();
        this._fillHandleManager.startDrag(source);

        return { type: 'FILL_START', payload: source };
    }

    private _handleMouseMove(cellCoords: any): SpreadsheetAction | SpreadsheetAction[] | null {
        if (!this._fillHandleManager.isDragging()) return null;

        // Актуализируем параметры (могли измениться joinedCells при drag)
        this._syncManagerParams();
        const { isChanged, range } = this._fillHandleManager.updateDrag(new Cell(cellCoords));
        if (!isChanged || !range) return null;

        return { type: 'FILL_MOVE', payload: range };
    }

    /**
     * Завершение fill handle drag.
     *
     * При валидном заполнении:
     *   – transaction().setCells(filledData).commit(FILL_END) — re-entrant,
     *     создаёт одну историческую запись с dataChanges для undo.
     *   – Возвращает [FILL_CANCEL] — UI-сброс (skipHistory).
     *
     * При невалидном:
     *   – Возвращает [FILL_CANCEL] — тоже skipHistory.
     */
    private _handleMouseUp(): (SpreadsheetAction | TransactionBuilder)[] | null {
        if (!this._fillHandleManager.isDragging()) {
            return [{ type: 'FILL_CANCEL' }];
        }

        const result = this._fillHandleManager.endDrag();
        if (!result.sourceRange || !result.targetRange || result.sourceRange.isEqual(result.targetRange)) {
            return [{ type: 'FILL_CANCEL' }];
        }

        const data = this.context.getData() as Map<number, Map<number, ICell>>;
        let filledData: Map<number, Map<number, ICell>>;
        try {
            filledData = this._autoFillManager.performFill(
                data,
                result.sourceRange,
                result.targetRange,
                (row, col) => this.context.getAllCellPluginConfigs(new Cell({ rowIndex: row, columnIndex: col })) as any,
            );
        } catch (e) {
            if (e instanceof AutoFillReadonlyError) {
                alert(e.message);
                return [{ type: 'FILL_CANCEL' }];
            }
            throw e; // пробрасываем неожиданные ошибки
        }

        if (!filledData.size) {
            return [{ type: 'FILL_CANCEL' }];
        }

        // FILL_CANCEL (skipHistory=true, наследуется от FILL_HANDLE_MOUSE_UP)
        // сбрасывает fillDraggingRange = null ДО записи в past
        const cancelAction: SpreadsheetAction = { type: 'FILL_CANCEL' };

        const builder = this.context
            .transaction()
            .withAction([
                { type: 'RANGES_SET', payload: [result.targetRange] },
                {
                    type: 'FILL_END',
                    payload: { filledData, sourceRange: result.sourceRange, targetRange: result.targetRange },
                },
            ])
            .setCells(filledData as Map<number, Map<number, ICell>>);

        for (const [rowIndex, row] of filledData) {
            for (const [colIndex, cell] of row) {
                const { pluginsConfig } = cell as ICell;
                if (!pluginsConfig) continue;
                for (const [pluginKey, config] of Object.entries(pluginsConfig)) {
                    if (config != null) {
                        builder.setPluginConfigCell(rowIndex, colIndex, pluginKey as any, config as any);
                    }
                }
            }
        }

        return [cancelAction, builder];
    }

    private _handleCancel(): SpreadsheetAction | null {
        if (!this._fillHandleManager.isDragging()) return null;
        this._fillHandleManager.cancelDrag();
        return { type: 'FILL_CANCEL' };
    }

    // ─── Вспомогательные методы ───────────────────────────────────────────────

    /** Синхронизирует FillHandleManager с актуальной структурой таблицы */
    private _syncManagerParams(): void {
        const mm = this.context?.metadataManager;
        const rowsCount = mm?.getRowsCount() ?? 100_000;
        const columnsCount = mm?.getColumnsCount() ?? 8_000;
        const joinedCells = this.context?.getPluginState(PLUGIN_JOINED_CELLS_KEY)?.joinedCells ?? [];

        this._fillHandleManager.updateTableParams(rowsCount, columnsCount, joinedCells);
    }

    // ─── Публичные методы для делегирования из AdapterSpreadSheet ────────────

    /**
     * Регистрирует пользовательскую стратегию автозаполнения.
     */
    registerAutoFillStrategy(strategy: IAutoFillStrategy, priority = 0): void {
        this._autoFillManager.registerStrategy(strategy, priority);
    }

    /** Предоставляет доступ к AutoFillManager для расширенных сценариев */
    getAutoFillManager(): AutoFillManager {
        return this._autoFillManager;
    }

    // ─── getTableAdapterProps ─────────────────────────────────────────────────

    override getTableAdapterProps(state: PluginFillState): Partial<ISpreadSheet> {
        return { fillDraggingRange: state.fillDraggingRange };
    }
}
