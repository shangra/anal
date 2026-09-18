import { Cell, Range } from '../../models';
import { ColumnIndex, ICell, ICellPluginsConfig, ICellStyles, ICellWithStyles, RowIndex } from '../../types';
import { SparseMatrixHelper } from '../../utils';
import { MetadataManager, MetadataSnapshot } from '../../utils/MetadataManager';
import PluginConfigManager from '../../utils/PluginConfigManager';
import StyleManager from '../../utils/StyleManager';
import { SpreadsheetAction } from '../SpreadsheetAction';
import { createTransaction, DataChange, PluginConfigSnapshot, StylesSnapshot, Transaction, txMeta } from './Transaction';

export type CommitFn = (tr: Transaction) => void;

interface PendingWrite {
    rowIndex: number;
    columnIndex: number;
    cell: ICell | null; // null = delete
}

export class TransactionBuilder {
    private _action: SpreadsheetAction | null = null;

    private _extraActions: SpreadsheetAction[] = [];

    private readonly _changes: DataChange[] = [];

    private _stylesSnapshot: StylesSnapshot | null = null;

    private _pluginConfigSnapshot: PluginConfigSnapshot | null = null;

    private _metadataSnapshot: MetadataSnapshot | null = null;

    private _hasStyleChanges = false;

    private _hasPluginConfigChanges = false;

    private _hasMetadataChanges = false;

    private _skipHistory = false;

    private _committed = false;

    private readonly _pendingWrites: PendingWrite[] = [];

    constructor(
        private readonly dataMatrix: Map<number, Map<number, ICell>>,
        private readonly styleManager: StyleManager,
        private readonly pluginConfigManager: PluginConfigManager,
        private readonly metadataManager: MetadataManager,
        private readonly commitCallback: CommitFn,
    ) {}

    // ── Приватные утилиты ─────────────────────────────────────────────────────

    private ensureStylesSnapshot(): void {
        if (!this._stylesSnapshot) {
            this._stylesSnapshot = this.styleManager.export();
        }
    }

    private ensurePluginConfigSnapshot(): void {
        if (!this._pluginConfigSnapshot) {
            this._pluginConfigSnapshot = this.pluginConfigManager.export();
        }
    }

    private ensureMetadataSnapshot(): void {
        if (!this._metadataSnapshot && this.metadataManager) {
            this._metadataSnapshot = this.metadataManager.export();
        }
    }

    private assertNotCommitted(): void {
        if (this._committed) {
            throw new Error('TransactionBuilder: нельзя использовать builder после commit()');
        }
    }

    // Применить все отложенные записи к dataMatrix.
    // Вызывается Adapter-ом ПОСЛЕ прохождения veto, ПЕРЕД reducers.
    _flushPendingWrites(): void {
        for (const { rowIndex, columnIndex, cell } of this._pendingWrites) {
            if (cell === null) {
                SparseMatrixHelper.deleteCell(this.dataMatrix, rowIndex, columnIndex);
            } else {
                SparseMatrixHelper.setCell(this.dataMatrix, rowIndex, columnIndex, cell);
            }
        }
    }

    // Откатить все отложенные записи (при veto).
    // Стили, конфиги и метаданные тоже нужно откатить — используем snapshot.
    _rollbackPendingWrites(): void {
        // Данные: восстановить из _changes.before
        for (const { rowIndex, columnIndex, before } of this._changes) {
            if (before === null) {
                SparseMatrixHelper.deleteCell(this.dataMatrix, rowIndex, columnIndex);
            } else {
                SparseMatrixHelper.setCell(this.dataMatrix, rowIndex, columnIndex, before);
            }
        }
        // Стили: восстановить из snapshot
        if (this._stylesSnapshot && this._hasStyleChanges) {
            this.styleManager.import(this._stylesSnapshot);
        }
        // Plugin configs: восстановить из snapshot
        if (this._pluginConfigSnapshot && this._hasPluginConfigChanges) {
            this.pluginConfigManager.import(this._pluginConfigSnapshot);
        }
        // Metadata: восстановить из snapshot
        if (this._metadataSnapshot && this._hasMetadataChanges && this.metadataManager) {
            this.metadataManager.import(this._metadataSnapshot);
        }
    }

    // ── Action ────────────────────────────────────────────────────────────────

    withAction(actions: SpreadsheetAction | SpreadsheetAction[]): this {
        this.assertNotCommitted();
        const normalized = Array.isArray(actions) ? actions : [actions];
        this._action = normalized[0] ?? null;
        this._extraActions = normalized.slice(1);
        this._skipHistory = false;
        return this;
    }

    skipHistory(): this {
        this.assertNotCommitted();
        this._skipHistory = true;
        return this;
    }

    // ── Данные ячеек ──────────────────────────────────────────────────────────

    setCellsWithStyle(
        data: Map<RowIndex, Map<ColumnIndex, ICellWithStyles>>,
        offset: { x: ColumnIndex; y: RowIndex } = { x: 0, y: 0 },
    ): this {
        this.assertNotCommitted();

        // Собираем батчи до первого обращения к менеджерам,
        // чтобы снапшоты брались один раз (ensureXxxSnapshot идемпотентны).
        const styleBatch: Array<{ row: number; col: number; data: ICellStyles }> = [];
        const pluginConfigBatches = new Map<
            keyof ICellPluginsConfig,
            Array<{ row: number; col: number; data: ICellPluginsConfig[keyof ICellPluginsConfig] }>
        >();

        for (const [relRow, row] of data) {
            const absRow = offset.y + Number(relRow);
            for (const [relCol, { styles: cellStyles, pluginsConfig, ...cellData }] of row) {
                const absCol = offset.x + Number(relCol);

                const before = SparseMatrixHelper.getCell(this.dataMatrix, absRow, absCol);

                this._changes.push({
                    rowIndex: absRow,
                    columnIndex: absCol,
                    before: before ? { ...before } : null,
                    after: cellData as ICell,
                });

                if (cellStyles) {
                    styleBatch.push({ row: absRow, col: absCol, data: cellStyles });
                }

                if (pluginsConfig) {
                    for (const [pluginKey, config] of Object.entries(pluginsConfig)) {
                        const key = pluginKey as keyof ICellPluginsConfig;
                        if (!pluginConfigBatches.has(key)) pluginConfigBatches.set(key, []);
                        pluginConfigBatches.get(key)!.push({ row: absRow, col: absCol, data: config });
                    }
                }

                this._pendingWrites.push({
                    rowIndex: absRow,
                    columnIndex: absCol,
                    cell: cellData as ICell,
                });
            }
        }

        // Применяем батчи через setCellsBatch — O(N log N) + RLE-сжатие,
        // вместо N × setCellStyle (N × O(log N) splice в _insertSorted).
        if (styleBatch.length > 0) {
            this.ensureStylesSnapshot();
            this.styleManager.setCellsBatch(styleBatch);
            this._hasStyleChanges = true;
        }

        if (pluginConfigBatches.size > 0) {
            this.ensurePluginConfigSnapshot();
            for (const [pluginKey, entries] of pluginConfigBatches) {
                this.pluginConfigManager.setPluginCellsBatch(pluginKey, entries);
            }
            this._hasPluginConfigChanges = true;
        }

        return this;
    }

    setCells(data: Map<RowIndex, Map<ColumnIndex, ICell>>, offset: { x: ColumnIndex; y: RowIndex } = { x: 0, y: 0 }): this {
        this.assertNotCommitted();

        for (const [relRow, row] of data) {
            const absRow = offset.y + Number(relRow);
            for (const [relCol, cellData] of row) {
                const absCol = offset.x + Number(relCol);

                const before = SparseMatrixHelper.getCell(this.dataMatrix, absRow, absCol);

                this._changes.push({
                    rowIndex: absRow,
                    columnIndex: absCol,
                    before: before ? { ...before } : null,
                    after: { ...cellData },
                });

                this._pendingWrites.push({ rowIndex: absRow, columnIndex: absCol, cell: cellData });
            }
        }
        return this;
    }

    deleteRange(range: Range): this {
        this.assertNotCommitted();
        const { rowIndex: r1, columnIndex: c1 } = range.topLeft.coordinates;
        const { rowIndex: r2, columnIndex: c2 } = range.bottomRight.coordinates;
        for (let r = r1; r <= r2; r++) {
            const row = SparseMatrixHelper.getRowCells(this.dataMatrix, r);
            for (const [c, cell] of row) {
                if (c >= c1 && c <= c2) {
                    this._changes.push({
                        rowIndex: r,
                        columnIndex: c,
                        before: { ...cell },
                        after: null,
                    });
                    this._pendingWrites.push({ rowIndex: r, columnIndex: c, cell: null });
                }
            }
        }
        return this;
    }

    deleteCell(rowIndex: number, columnIndex: number): this {
        this.assertNotCommitted();
        const before = SparseMatrixHelper.getCell(this.dataMatrix, rowIndex, columnIndex);
        if (before) {
            this._changes.push({
                rowIndex,
                columnIndex,
                before: { ...before },
                after: null,
            });
            this._pendingWrites.push({ rowIndex, columnIndex, cell: null });
        }
        return this;
    }

    // ── Стили ─────────────────────────────────────────────────────────────────

    setCellStyle(rowIndex: number, columnIndex: number, style: ICellStyles, merge = false): this {
        this.assertNotCommitted();
        this.ensureStylesSnapshot();
        this.styleManager.setCellStyle(rowIndex, columnIndex, style, merge);
        this._hasStyleChanges = true;
        return this;
    }

    setRangeStyle(range: Range, style: ICellStyles, merge = false): this {
        this.assertNotCommitted();
        this.ensureStylesSnapshot();
        this.styleManager.setRangeStyle(range, style, merge);
        this._hasStyleChanges = true;
        return this;
    }

    removeRangeStyle(rangeId: string): this {
        this.assertNotCommitted();
        this.ensureStylesSnapshot();
        this.styleManager.removeRange(rangeId);
        this._hasStyleChanges = true;
        return this;
    }

    clearRangeStyles(range: Range): this {
        this.assertNotCommitted();
        this.ensureStylesSnapshot();
        this.styleManager.clearRangeStyles(range);
        this._hasStyleChanges = true;
        return this;
    }

    removeCellStyle(row: number, col: number): this {
        this.assertNotCommitted();
        this.ensureStylesSnapshot();
        this.styleManager.removeCellStyle(row, col);
        this._hasStyleChanges = true;
        return this;
    }

    setCellStylesMap(map: Map<string, ICellStyles>, merge = false): this {
        this.assertNotCommitted();
        if (map.size === 0) return this;
        this.ensureStylesSnapshot();
        for (const [key, style] of map) {
            const [row, col] = key.split(':').map(Number);
            this.styleManager.setCellStyle(row, col, style, merge);
        }
        this._hasStyleChanges = true;
        return this;
    }

    // ── Конфигурации плагинов ─────────────────────────────────────────────────

    setPluginConfigRange<K extends keyof ICellPluginsConfig>(
        range: Range,
        pluginKey: K,
        config: ICellPluginsConfig[K],
        merge = true,
    ): this {
        this.assertNotCommitted();
        this.ensurePluginConfigSnapshot();
        this.pluginConfigManager.setPluginRange(range, pluginKey, config, merge);
        this._hasPluginConfigChanges = true;
        return this;
    }

    setPluginConfigCell<K extends keyof ICellPluginsConfig>(
        row: number,
        col: number,
        pluginKey: K,
        config: ICellPluginsConfig[K],
        merge = false,
    ): this {
        this.assertNotCommitted();
        this.ensurePluginConfigSnapshot();
        this.pluginConfigManager.setPluginCell(row, col, pluginKey, config, merge);
        this._hasPluginConfigChanges = true;
        return this;
    }

    removePluginConfigRange(rangeId: string): this {
        this.assertNotCommitted();
        this.ensurePluginConfigSnapshot();
        this.pluginConfigManager.removeRange(rangeId);
        this._hasPluginConfigChanges = true;
        return this;
    }

    removePluginConfigCell<K extends keyof ICellPluginsConfig>(row: number, col: number, pluginKey: K): this {
        this.assertNotCommitted();
        this.ensurePluginConfigSnapshot();
        this.pluginConfigManager.clearPluginInRange(new Range(new Cell({ rowIndex: row, columnIndex: col })), pluginKey);
        this._hasPluginConfigChanges = true;
        return this;
    }

    clearPluginConfigInRange<K extends keyof ICellPluginsConfig>(range: Range, pluginKey: K): this {
        this.assertNotCommitted();
        this.ensurePluginConfigSnapshot();
        this.pluginConfigManager.clearPluginInRange(range, pluginKey);
        this._hasPluginConfigChanges = true;
        return this;
    }

    clearPluginConfigRange(range: Range): this {
        this.assertNotCommitted();
        this.ensurePluginConfigSnapshot();
        this.pluginConfigManager.clearRange(range);
        this._hasPluginConfigChanges = true;
        return this;
    }

    // ── Метаданные (MetadataManager) ─────────────────────────────────────────

    /** Resize: устанавливает ширины колонок (Map<colIdx, width>). */
    resizeColumns(map: Map<number, number>): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.setColumnWidths(map);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Resize: устанавливает высоты строк (Map<rowIdx, height>). */
    resizeRows(map: Map<number, number>): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.setRowHeights(map);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Устанавливает override ширины одной колонки (null = restore default). */
    setColumnOverride(index: number, width: number | null): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.setColumnWidth(index, width);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Устанавливает override высоты одной строки (null = restore default). */
    setRowOverride(index: number, height: number | null): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.setRowHeight(index, height);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Полная замена overrides строк (для import / BULK_SET). */
    replaceRowsMeta(overrides: Record<number, { height: number }>): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.replaceRowsMeta(overrides);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Полная замена overrides колонок (для import / BULK_SET). */
    replaceColumnsMeta(overrides: Record<number, { width: number }>): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.replaceColumnsMeta(overrides);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Устанавливает количество строк. */
    setRowsCount(n: number): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.setRowsCount(n);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Устанавливает количество колонок. */
    setColumnsCount(n: number): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.setColumnsCount(n);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Вставляет строки с опциональным сдвигом overrides. */
    insertRows(from: number, count: number, shouldShift: boolean): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.insertRows(from, count, shouldShift);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Удаляет строки со сдвигом overrides. */
    deleteRows(from: number, count: number): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.deleteRows(from, count);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Вставляет колонки с опциональным сдвигом overrides. */
    insertColumns(from: number, count: number, shouldShift: boolean): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.insertColumns(from, count, shouldShift);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Удаляет колонки со сдвигом overrides. */
    deleteColumns(from: number, count: number): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.deleteColumns(from, count);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Условный сдвиг overrides строк (без изменения count). */
    conditionalShiftRows(from: number, count: number, shouldShift: boolean): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.conditionalShiftRows(from, count, shouldShift);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Условный сдвиг overrides колонок (без изменения count). */
    conditionalShiftColumns(from: number, count: number, shouldShift: boolean): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.conditionalShiftColumns(from, count, shouldShift);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Устанавливает высоту строки по умолчанию. */
    setDefaultRowHeight(h: number): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.setDefaultRowHeight(h);
        this._hasMetadataChanges = true;
        return this;
    }

    /** Устанавливает ширину колонки по умолчанию. */
    setDefaultColumnWidth(w: number): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.setDefaultColumnWidth(w);
        this._hasMetadataChanges = true;
        return this;
    }

    /**
     * Сбрасывает все overrides, сохраняя count и defaults.
     * Используется для resetMatrixSize.
     */
    clearMetadata(opts?: {
        rowsCount?: number;
        columnsCount?: number;
        defaultRowHeight?: number;
        defaultColumnWidth?: number;
    }): this {
        this.assertNotCommitted();
        if (!this.metadataManager) return this;
        this.ensureMetadataSnapshot();
        this.metadataManager.clear(opts);
        this._hasMetadataChanges = true;
        return this;
    }

    // ── Очистка всего ─────────────────────────────────────────────────────────

    clearAll(): this {
        this.assertNotCommitted();
        for (const [rowIndex, row] of this.dataMatrix) {
            for (const [columnIndex, cell] of row) {
                this._changes.push({ rowIndex, columnIndex, before: { ...cell }, after: null });
            }
        }
        this.ensureStylesSnapshot();
        this.ensurePluginConfigSnapshot();
        this._hasStyleChanges = true;
        this._hasPluginConfigChanges = true;

        this.styleManager.clear();
        this.pluginConfigManager.clear();

        for (const [rowIndex, row] of this.dataMatrix) {
            for (const [columnIndex] of row) {
                this._pendingWrites.push({ rowIndex, columnIndex, cell: null });
            }
        }

        return this;
    }

    // ── Сборка Transaction ────────────────────────────────────────────────────

    _buildForAppend(): Transaction {
        this.assertNotCommitted();
        this._committed = true;
        return this._build(this._skipHistory);
    }

    private _build(skipHistory = false): Transaction {
        const tr = createTransaction(this._action);

        if (this._extraActions.length > 0) {
            tr.attachExtraActions(this._extraActions);
        }

        if (this._changes.length > 0) {
            tr.attachDataChanges(this._changes);
        }

        if (this._pendingWrites.length > 0) {
            tr.attachPendingWrites(this._pendingWrites);
        }

        if (this._stylesSnapshot && this._hasStyleChanges) {
            tr.attachStylesSnapshot(this._stylesSnapshot);
        }
        if (this._pluginConfigSnapshot && this._hasPluginConfigChanges) {
            tr.attachPluginConfigSnapshot(this._pluginConfigSnapshot);
        }
        if (this._metadataSnapshot && this._hasMetadataChanges) {
            tr.attachMetadataSnapshot(this._metadataSnapshot);
        }
        if (skipHistory) {
            txMeta.setSkipHistory(tr);
        }
        return tr;
    }

    commit(skipHistory = false): void {
        this.assertNotCommitted();
        this._committed = true;
        this.commitCallback(this._build(skipHistory));
    }
}
