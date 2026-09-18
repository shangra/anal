/**
 * Фасад адаптера для PluginPivot.
 *
 * Транслирует вызовы методов таблицы (setCells, insertRow и т.д.)
 * в прямые мутации матрицы данных и dispatch-экшены через PluginContext.
 */

import { Cell, Range } from '../../AdapterSpreadSheet/models';
import { PluginContext } from '../../AdapterSpreadSheet/plugin';
import {
    ColumnIndex,
    ColumnMeta,
    ICell,
    ICellConfig,
    ICellPluginsConfig,
    ICellStyles,
    ICellWithStyles,
    RowIndex,
    RowMeta,
} from '../../AdapterSpreadSheet/types';
import { PIVOT_ACTION } from './constants';
import { TPluginRange } from './types';

// ─── Интерфейс для разрыва циклического импорта ──────────────────────────────

export interface IPluginPivotRef {
    readonly context: PluginContext;
    readonly pluginRange: TPluginRange;
}

// ─── Фасад ───────────────────────────────────────────────────────────────────

export class PluginPivotAdapterFacade {
    constructor(private readonly plugin: IPluginPivotRef) {}

    private get ctx(): PluginContext {
        return this.plugin.context;
    }

    private get _mm() {
        return this.ctx.metadataManager;
    }

    public get tableAPIRef() {
        return this.ctx.table?.current ?? null;
    }

    // ── Events ────────────────────────────────────────────────────────────────

    emitEvent(eventName: string, payload: any): void {
        // @ts-expect-error
        this.ctx.dispatch({ type: eventName, payload });
    }

    forceUpdate(): void {
        this.ctx.dispatch({ type: PIVOT_ACTION.FORCE_UPDATE });
    }

    // ── Cell writes ───────────────────────────────────────────────────────────

    getCellPluginConfig<T extends keyof ICellPluginsConfig>(cell: Cell, key: T): ICellPluginsConfig[T] | null {
        return this.ctx.getCellPluginConfig(cell, key);
    }

    setCellStyle(cell: Cell, style: ICellStyles): void {
        const { rowIndex, columnIndex } = cell.coordinates;
        this.ctx.styleManager.setCellStyle(rowIndex, columnIndex, style);
    }

    // ── Batch cell operations ──────────────────────────────────────────────────

    setCells(cells: Map<RowIndex, Map<ColumnIndex, ICell>>): void {
        this.ctx.transaction().setCells(cells).commit(/* skipHistory */ true);
    }

    setCellsWithStyle(cells: Map<RowIndex, Map<ColumnIndex, ICellWithStyles>>): void {
        const tx = this.ctx.transaction();
        tx.setCellsWithStyle(cells).commit(/* skipHistory */ true);
    }

    // ── Data removal ──────────────────────────────────────────────────────────

    /**
     * Удаляет данные ячеек и стили в указанном диапазоне.
     * Конфиги плагинов (форматирование, PLUGIN_PIVOT_KEY) теперь хранятся в
     * PluginPivotConfigStore и очищаются через configStore.clearAll() в RenderController —
     * PluginConfigManager больше не содержит пивот-owned данных.
     */
    removeData(startCell: Cell, endCell?: Cell): void {
        const range = new Range(startCell, endCell);
        this.ctx.transaction().deleteRange(range).clearRangeStyles(range).commit(true);
    }

    // ── Structure (resize) — через MetadataManager + builder ────────────────

    /**
     * Pivot всегда передаёт shouldShift=true — нет свёрнутых строк (перед каждым рендером
     * вызывается removeData(), сдвиг SparseMatrix не нужен).
     */
    async insertRow(index: number, position: 'before' | 'after', count = 1): Promise<void> {
        const from = position === 'before' ? index : index + 1;
        this.ctx.transaction().insertRows(from, count, /* shouldShift */ true).commit(true);
    }

    async deleteRow(index: number, _position: 'before' | 'after', count = 1): Promise<void> {
        this.ctx.transaction().deleteRows(index, count).commit(true);
    }

    async insertColumn(index: number, position: 'before' | 'after', count = 1): Promise<void> {
        const from = position === 'before' ? index : index + 1;
        this.ctx.transaction().insertColumns(from, count, /* shouldShift */ true).commit(true);
    }

    async deleteColumn(index: number, _position: 'before' | 'after', count = 1): Promise<void> {
        this.ctx.transaction().deleteColumns(index, count).commit(true);
    }

    // ── Readers (напрямую из MetadataManager) ────────────────────────────────

    getColumnsCount(): number {
        return this._mm.getColumnsCount();
    }

    getRowsCount(): number {
        return this._mm.getRowsCount();
    }

    getColumnsMetadata(): Record<ColumnIndex, ColumnMeta> {
        return this._mm.getColumnsOverrides() as Record<ColumnIndex, ColumnMeta>;
    }

    getRowsMetadata(): Record<RowIndex, RowMeta> {
        return this._mm.getRowsOverrides() as Record<RowIndex, RowMeta>;
    }

    // ── TableParams update (используется в import()) ──────────────────────────

    updateTableParams(params: {
        rowsCount: number;
        columnsCount: number;
        rowsMeta?: Record<RowIndex, RowMeta>;
        columnsMeta?: Record<ColumnIndex, ColumnMeta>;
    }): void {
        const tx = this.ctx.transaction();

        let hasChanges = false;
        if (params.rowsCount) {
            tx.withAction({ type: 'ROWS_COUNT_SET', payload: params.rowsCount }).setRowsCount(params.rowsCount);
            hasChanges = true;
        }
        if (params.columnsCount) {
            tx.setColumnsCount(params.columnsCount);
            hasChanges = true;
        }
        if (params.rowsMeta) {
            tx.replaceRowsMeta(params.rowsMeta);
            hasChanges = true;
        }
        if (params.columnsMeta) {
            tx.replaceColumnsMeta(params.columnsMeta);
            hasChanges = true;
        }

        if (hasChanges) {
            tx.commit(true);
        }
    }

    // ── Auto-fit (автоподгонка ширины колонок по содержимому) ────────────────

    /**
     * Автоматически подогнать ширину колонок по содержимому в указанном диапазоне.
     * @param startCol - Начальный индекс колонки (включительно)
     * @param endCol   - Конечный индекс колонки (не включая)
     */
    autoFitColumns(startCol: number, endCol: number): void {
        const columns: number[] = [];
        for (let i = startCol; i < endCol; i++) {
            columns.push(i);
        }

        if (columns.length > 0) {
            // Вызываем public API PluginMetadata напрямую
            const pluginMetadata = (this.ctx as any).getPlugin?.('PluginMetadata') as any;
            pluginMetadata?.autoFitColumns?.(columns);
        }
    }
}
