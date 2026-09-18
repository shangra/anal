/**
 * Фасад адаптера для PluginReports.
 *
 * Транслирует вызовы методов IAdapter (setCells, setRowsCount и т.д.)
 * в прямые мутации матрицы данных и dispatch-экшены через PluginContext.
 *
 * Благодаря фасаду RenderController.ts и getTableData.js не требуют изменений —
 * они продолжают обращаться к pluginReports.tableAdapter без изменений.
 */

import { Cell, Range } from '../../AdapterSpreadSheet/models';
import { PluginContext } from '../../AdapterSpreadSheet/plugin';
import {
    ColumnIndex,
    ColumnMeta,
    ICell,
    ICellConfig,
    ICellStyles,
    ICellWithStyles,
    RowIndex,
    RowMeta,
} from '../../AdapterSpreadSheet/types';
import { REPORTS_ACTION } from './constants';

// ─── Интерфейс для разрыва циклического импорта ──────────────────────────────

/**
 * Минимальный интерфейс PluginReports, необходимый фасаду.
 */
export interface IPluginReportsRef {
    readonly context: PluginContext;
}

// ─── Фасад ───────────────────────────────────────────────────────────────────

export class PluginReportsAdapterFacade {
    constructor(private readonly plugin: IPluginReportsRef) {}

    private get ctx(): PluginContext {
        return this.plugin.context;
    }

    private get _mm() {
        return this.ctx.metadataManager;
    }

    // ── Events ────────────────────────────────────────────────────────────────

    /** Транслирует emitEvent в dispatch */
    emitEvent(eventName: string, payload: any): void {
        // @ts-expect-error
        this.ctx.dispatch({ type: eventName, payload });
    }

    /**
     * В новой архитектуре любой dispatch вызывает _triggerUpdate в AdapterSpreadSheet.
     * Используется только там, где нет другого dispatch в цепочке.
     */
    forceUpdate(): void {
        this.ctx.dispatch({ type: REPORTS_ACTION.FORCE_UPDATE });
    }

    // ── Cell writes ───────────────────────────────────────────────────────────

    setCellStyle(cell: Cell, style: ICellStyles): void {
        const { rowIndex, columnIndex } = cell.coordinates;
        this.ctx.styleManager.setCellStyle(rowIndex, columnIndex, style);
    }

    // ── Batch cell operations ──────────────────────────────────────────────────

    setCells(cells: Map<RowIndex, Map<ColumnIndex, ICell>>): void {
        this.ctx.transaction().setCells(cells).commit(/* skipHistory */ true);
    }

    setCellsWithStyle(cells: Map<RowIndex, Map<ColumnIndex, ICellWithStyles>>): void {
        const dataOnly = new Map<RowIndex, Map<ColumnIndex, ICell>>();
        const tx = this.ctx.transaction();

        for (const [r, row] of cells) {
            if (!dataOnly.has(r)) dataOnly.set(r, new Map());
            for (const [c, { styles, ...cell }] of row) {
                const cellData = cell as ICell;
                dataOnly.get(r)!.set(c, cellData);
                if (styles) tx.setCellStyle(r, c, styles, false);
            }
        }

        tx.setCells(dataOnly).commit(/* skipHistory */ true);
    }

    // ── Data removal ──────────────────────────────────────────────────────────

    /**
     * Точечная очистка области отчёта (аналогично PluginPivot).
     * Удаляет данные, стили и plugin-configs только в указанном Range,
     * не затрагивая остальные ячейки листа.
     */
    removeData(startCell: Cell, endCell?: Cell): void {
        const range = new Range(startCell, endCell);

        this.ctx
            .transaction()
            .deleteRange(range)
            .clearRangeStyles(range)
            .clearPluginConfigRange(range)
            .commit(/* skipHistory */ true);
    }

    // ── Structure (через MetadataManager + builder) ───────────────────────────

    setRowsCount(count: number): void {
        this.ctx.transaction().withAction({ type: 'ROWS_COUNT_SET', payload: count }).setRowsCount(count).commit(true);
    }

    setColumnsCount(count: number): void {
        this.ctx.transaction().withAction({ type: 'COLUMNS_COUNT_SET', payload: count }).setColumnsCount(count).commit(true);
    }

    setRowsMetadata(meta: Record<RowIndex, RowMeta>): void {
        this.ctx.transaction().withAction({ type: 'ROWS_META_SET', payload: meta }).replaceRowsMeta(meta).commit(true);
    }

    setColumnsMetadata(meta: Record<ColumnIndex, ColumnMeta>): void {
        this.ctx.transaction().withAction({ type: 'COLUMNS_META_SET', payload: meta }).replaceColumnsMeta(meta).commit(true);
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
}
