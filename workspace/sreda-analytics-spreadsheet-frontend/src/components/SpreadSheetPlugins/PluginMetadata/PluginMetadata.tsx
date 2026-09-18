import { IMeasurementAPI } from '../../AdapterSpreadSheet/measurement/types';
import { Plugin, SpreadsheetAction, Transaction } from '../../AdapterSpreadSheet/plugin';
import { ContextMenuContext, TContextMenuItem } from '../../AdapterSpreadSheet/types';
import { ISpreadSheet } from '../../TableAdapters/types';
import { AutoFitTask, ColumnMeasureInput, measureColumnsAsync, measureRowsAsync, RowMeasureInput } from './asyncAutoFit';
import {
    DEFAULT_COLUMN_WIDTH,
    DEFAULT_COLUMNS_COUNT,
    DEFAULT_PADDING_X,
    DEFAULT_PADDING_Y,
    DEFAULT_ROW_HEIGHT,
    DEFAULT_ROWS_COUNT,
    MIN_COLUMN_WIDTH,
    MIN_ROW_HEIGHT,
    PLUGIN_METADATA_KEY,
} from './constants';
import { assertMeasurementAPI, normalizeIndices } from './helpers';
import { PluginMetadataOptions, PluginMetadataState } from './types';

/**
 * PluginMetadata — тонкий слой логики над MetadataManager.
 *
 * Ответственность плагина:
 *   - onMount: применить initialOptions → MetadataManager
 *   - appendTransaction: COLUMNS_AUTO_FIT / ROWS_AUTO_FIT (async measure)
 *   - getContextMenuItems: collapse/expand через TransactionBuilder
 *   - export / import: wire-формат snapshot/restore
 *
 * Единственный источник истины — context.metadataManager.
 * Reducer плагина пустой (state = {}).
 */
export class PluginMetadata extends Plugin<typeof PLUGIN_METADATA_KEY, PluginMetadataState, PluginMetadataOptions> {
    readonly key = PLUGIN_METADATA_KEY;

    readonly initialState: PluginMetadataState = {};

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private get _colWidth(): number {
        return this.options.defaultColumnWidth ?? DEFAULT_COLUMN_WIDTH;
    }

    private get _rowHeight(): number {
        return this.options.defaultRowHeight ?? DEFAULT_ROW_HEIGHT;
    }

    // Ref на текущую async-задачу (отменяется при повторном вызове)
    private _pendingAutoFit: AutoFitTask | null = null;

    private _cancelPendingAutoFit(): void {
        this._pendingAutoFit?.cancel();
        this._pendingAutoFit = null;
    }

    // ─── Reducer (пустой — вся мутация через MetadataManager) ────────────────

    override reducer(state: PluginMetadataState, _tr: Transaction): PluginMetadataState {
        return state;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    override onMount(): void {
        const opts = this.options;
        const mm = this.context.metadataManager;

        // Применяем options к MetadataManager через builder (skipHistory — они сервисные)
        const tx = this.context.transaction().skipHistory();

        let hasChanges = false;

        if (opts.defaultColumnWidth !== undefined) {
            tx.setDefaultColumnWidth(opts.defaultColumnWidth);
            hasChanges = true;
        }
        if (opts.defaultRowHeight !== undefined) {
            tx.setDefaultRowHeight(opts.defaultRowHeight);
            hasChanges = true;
        }

        const rowsCount = opts.initialRowsCount ?? DEFAULT_ROWS_COUNT;
        const columnsCount = opts.initialColumnsCount ?? DEFAULT_COLUMNS_COUNT;

        if (mm.getRowsCount() !== rowsCount) {
            tx.setRowsCount(rowsCount);
            hasChanges = true;
        }
        if (mm.getColumnsCount() !== columnsCount) {
            tx.setColumnsCount(columnsCount);
            hasChanges = true;
        }

        if (hasChanges) {
            tx.commit(/* skipHistory */ true);
        }
    }

    override onUnmount(): void {
        this._cancelPendingAutoFit();
    }

    // ─── Вспомогательные методы ──────────────────────────────────────────────────

    /**
     * Запускает async auto-fit и применяет результаты через TransactionBuilder.
     */
    private _startAsyncColumnsAutoFit(columns: number[], paddingX: number, api: IMeasurementAPI): void {
        this._cancelPendingAutoFit();

        const tasks: ColumnMeasureInput[] = [];

        for (const colIdx of columns) {
            const rows: ColumnMeasureInput['rows'] = [];

            for (const [rowIndex, rowMap] of this.context.getData()) {
                if (!rowMap.has(colIdx)) continue;

                const text = this.context.getCellDisplayValue(rowIndex, colIdx);
                const cell = rowMap.get(colIdx)!;

                if (!text && !cell.components?.length) continue;

                rows.push({
                    rowIndex,
                    text: String(text),
                    styles: this.context.styleManager.getCellStyle(rowIndex, colIdx),
                    componentsCount: cell.components?.length ?? 0,
                });
            }

            if (rows.length) {
                tasks.push({ colIdx, rows, paddingX });
            }
        }

        if (!tasks.length) return;

        const { promise, task } = measureColumnsAsync(tasks, api, MIN_COLUMN_WIDTH);
        this._pendingAutoFit = task;

        promise.then((results) => {
            if (!results.size) return;
            this._pendingAutoFit = null;
            this.context.transaction().resizeColumns(results).commit(/* skipHistory */ false);
        });
    }

    /**
     * Запускает async auto-fit строк и применяет результаты через TransactionBuilder.
     */
    private _startAsyncRowsAutoFit(rows: number[], paddingY: number, api: IMeasurementAPI): void {
        this._cancelPendingAutoFit();

        const mm = this.context.metadataManager;
        const tasks: RowMeasureInput[] = [];

        for (const rowIdx of rows) {
            const rowMap = this.context.getData().get(rowIdx);
            if (!rowMap || rowMap.size === 0) continue;

            const columns: RowMeasureInput['columns'] = [];

            for (const [colIdx] of rowMap) {
                const text = this.context.getCellDisplayValue(rowIdx, colIdx);
                const cell = rowMap.get(colIdx)!;

                if (!text && !cell.components?.length) continue;

                // Используем at() чтобы получить ширину с учётом override + default
                const colWidth = mm.getColumnsView().at(colIdx).width;

                columns.push({
                    colIdx,
                    text: String(text),
                    styles: this.context.styleManager.getCellStyle(rowIdx, colIdx),
                    colWidth,
                    componentsCount: cell.components?.length ?? 0,
                });
            }

            if (columns.length) tasks.push({ rowIdx, columns, paddingY });
        }

        if (!tasks.length) return;

        const { promise, task } = measureRowsAsync(tasks, api, MIN_ROW_HEIGHT);
        this._pendingAutoFit = task;

        promise.then((results) => {
            if (!results.size) return;
            this._pendingAutoFit = null;
            this.context.transaction().resizeRows(results).commit(/* skipHistory */ false);
        });
    }

    /** Возвращает индексы колонок с хоть одной непустой ячейкой. */
    private _detectNonEmptyColumns(): number[] {
        const seen = new Set<number>();
        for (const [, rowMap] of this.context.getData()) {
            for (const [colIdx] of rowMap) seen.add(colIdx);
        }
        return Array.from(seen).sort((a, b) => a - b);
    }

    /** Возвращает индексы строк с хоть одной непустой ячейкой. */
    private _detectNonEmptyRows(): number[] {
        const rows: number[] = [];
        for (const [rowIdx, rowMap] of this.context.getData()) {
            if (rowMap.size > 0) rows.push(rowIdx);
        }
        return rows.sort((a, b) => a - b);
    }

    // ─── Context menu helpers — через TransactionBuilder ──────────────────────

    private _expandRow = (i: number, mode: 'restore' | 'minimal' = 'restore'): void => {
        this.context
            .transaction()
            .setRowOverride(i, mode === 'restore' ? null : 1)
            .commit();
    };

    private _collapseRow = (i: number): void => {
        this.context.transaction().setRowOverride(i, 0).commit();
    };

    private _expandColumn = (i: number, mode: 'restore' | 'minimal' = 'restore'): void => {
        this.context
            .transaction()
            .setColumnOverride(i, mode === 'restore' ? null : 1)
            .commit();
    };

    private _collapseColumn = (i: number): void => {
        this.context.transaction().setColumnOverride(i, 0).commit();
    };

    // ─── Public API — вынесенный AUTO_FIT ────────────────────────────────────

    /**
     * Запускает async авто-подбор ширины колонок.
     * Вызывается напрямую из AdapterSpreadSheet.onColumnsAutoFit / onColumnExpandResize
     * вместо dispatch(COLUMNS_AUTO_FIT).
     */
    autoFitColumns(columns: number[] = [], paddingX: number = DEFAULT_PADDING_X): void {
        const api = this.context.getMeasurementAPI();
        if (!assertMeasurementAPI(api, 'autoFitColumns')) return;

        const mm = this.context.metadataManager;
        const normalized =
            columns.length > 0 ? normalizeIndices(columns, mm.getColumnsCount()) : this._detectNonEmptyColumns();
        if (!normalized.length) return;

        this._startAsyncColumnsAutoFit(normalized, paddingX, api);
    }

    /**
     * Запускает async авто-подбор высоты строк.
     * Вызывается напрямую из AdapterSpreadSheet.onRowsAutoFit / onRowExpandResize
     * вместо dispatch(ROWS_AUTO_FIT).
     */
    autoFitRows(rows: number[] = [], paddingY: number = DEFAULT_PADDING_Y): void {
        const api = this.context.getMeasurementAPI();
        if (!assertMeasurementAPI(api, 'autoFitRows')) return;

        const mm = this.context.metadataManager;
        const normalized = rows.length > 0 ? normalizeIndices(rows, mm.getRowsCount()) : this._detectNonEmptyRows();
        if (!normalized.length) return;

        this._startAsyncRowsAutoFit(normalized, paddingY, api);
    }

    // ─── appendTransaction ────────────────────────────────────────────────────

    override appendTransaction(
        _tr: Transaction,
        _prevState: PluginMetadataState,
        _nextState: PluginMetadataState,
    ): SpreadsheetAction | SpreadsheetAction[] | null {
        return null;
    }

    override getContextMenuItems(_state: PluginMetadataState, ctx: ContextMenuContext): TContextMenuItem[] {
        const { rowIndex, columnIndex } = ctx.cell.coordinates;
        const isRowHeader = columnIndex === -1 && rowIndex >= 0;
        const isColumnHeader = rowIndex === -1 && columnIndex >= 0;

        const mm = this.context.metadataManager;
        const items: TContextMenuItem[] = [];

        if (isRowHeader) {
            const rowMeta = mm.getRowsView().at(rowIndex);
            const isCollapsed = rowMeta.height === 0;

            items.push(
                {
                    label: isCollapsed ? 'Развернуть строку' : 'Свернуть строку',
                    action: () => (isCollapsed ? this._expandRow(rowIndex) : this._collapseRow(rowIndex)),
                    disabled: false,
                },
                { divider: true },
            );
        }

        if (isColumnHeader) {
            const colMeta = mm.getColumnsView().at(columnIndex);
            const isCollapsed = colMeta.width === 0;
            items.push(
                {
                    label: isCollapsed ? 'Развернуть колонку' : 'Свернуть колонку',
                    action: () => (isCollapsed ? this._expandColumn(columnIndex) : this._collapseColumn(columnIndex)),
                    disabled: false,
                },
                { divider: true },
            );
        }

        return items;
    }

    // ─── getTableAdapterProps — удалён (данные теперь из MetadataManager напрямую) ─

    // ─── Export / Import (для DRP / snapshot) ────────────────────────────────

    override async export() {
        const mm = this.context.metadataManager;
        return {
            key: this.key,
            state: {
                // Wire-формат для обратной совместимости
                rowsCount: mm.getRowsCount(),
                columnsCount: mm.getColumnsCount(),
                rowsMeta: mm.getRowsOverrides(),
                columnsMeta: mm.getColumnsOverrides(),
            } as any,
        };
    }

    override async import(data: { key: string; state: Partial<PluginMetadataState> & Record<string, any> }) {
        const { rowsCount, columnsCount, rowsMeta, columnsMeta } = data.state;

        const tx = this.context.transaction().skipHistory();
        let hasChanges = false;

        if (rowsCount !== undefined) {
            tx.setRowsCount(rowsCount);
            hasChanges = true;
        }
        if (columnsCount !== undefined) {
            tx.setColumnsCount(columnsCount);
            hasChanges = true;
        }
        if (rowsMeta !== undefined) {
            tx.replaceRowsMeta(rowsMeta);
            hasChanges = true;
        }
        if (columnsMeta !== undefined) {
            tx.replaceColumnsMeta(columnsMeta);
            hasChanges = true;
        }

        if (hasChanges) {
            tx.commit(/* skipHistory */ true);
        }
    }
}
