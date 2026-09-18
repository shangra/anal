/**
 * MetadataManager — мутабельное хранилище метаданных таблицы.
 *
 * Паттерн: аналог StyleManager / PluginConfigManager.
 * - Хранит rowsCount, columnsCount, sparse overrides, defaultRowHeight, defaultColumnWidth.
 * - Предоставляет мемоизированные иммутабельные view-ы (VirtualRowsMetadata / VirtualColumnsMetadata).
 * - View инвалидируется при любой мутации (через _bumpVersion): старый view удаляется,
 *   новый создаётся при следующем обращении к getRowsView() / getColumnsView().
 * - Поддерживает export() / import() для undo/redo snapshot-restore.
 */

import { DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMNS_COUNT, DEFAULT_ROW_HEIGHT, DEFAULT_ROWS_COUNT } from '../../SpreadSheetPlugins';
import { ColumnMeta, RowMeta } from '../types';
import {
    conditionalInsertShiftMeta,
    deleteShiftMeta,
    IColumnsMetadata,
    insertShiftMeta,
    IRowsMetadata,
    VirtualColumnsMetadata,
    VirtualRowsMetadata,
} from './VirtualMetadata';

// ─── Snapshot (для undo/redo) ─────────────────────────────────────────────────

export interface MetadataSnapshot {
    rowsCount: number;
    columnsCount: number;
    rowsOverrides: Record<number, RowMeta>;
    columnsOverrides: Record<number, ColumnMeta>;
    defaultRowHeight: number;
    defaultColumnWidth: number;
}

// ─── MetadataManager ──────────────────────────────────────────────────────────

export class MetadataManager {
    private _rowsCount: number;

    private _columnsCount: number;

    private _rowsOverrides: Record<number, RowMeta>;

    private _columnsOverrides: Record<number, ColumnMeta>;

    private _defaultRowHeight: number;

    private _defaultColumnWidth: number;

    /** Версионный счётчик для инвалидации view-кеша */
    private _version = 0;

    /** Мемоизированные view-ы. Пересоздаются при _bumpVersion(). */
    private _rowsView: VirtualRowsMetadata | null = null;

    private _columnsView: VirtualColumnsMetadata | null = null;

    constructor(opts?: { rowsCount?: number; columnsCount?: number; defaultRowHeight?: number; defaultColumnWidth?: number }) {
        this._rowsCount = opts?.rowsCount ?? DEFAULT_ROWS_COUNT;
        this._columnsCount = opts?.columnsCount ?? DEFAULT_COLUMNS_COUNT;
        this._defaultRowHeight = opts?.defaultRowHeight ?? DEFAULT_ROW_HEIGHT;
        this._defaultColumnWidth = opts?.defaultColumnWidth ?? DEFAULT_COLUMN_WIDTH;
        this._rowsOverrides = {};
        this._columnsOverrides = {};
    }

    // ── Версионирование ───────────────────────────────────────────────────────

    private _bumpVersion(): void {
        this._version++;
        this._rowsView = null;
        this._columnsView = null;
    }

    getVersion(): number {
        return this._version;
    }

    // ── Структура ─────────────────────────────────────────────────────────────

    getRowsCount(): number {
        return this._rowsCount;
    }

    getColumnsCount(): number {
        return this._columnsCount;
    }

    setRowsCount(n: number): void {
        if (this._rowsCount === n) return;
        this._rowsCount = n;
        this._bumpVersion();
    }

    setColumnsCount(n: number): void {
        if (this._columnsCount === n) return;
        this._columnsCount = n;
        this._bumpVersion();
    }

    getDefaultRowHeight(): number {
        return this._defaultRowHeight;
    }

    getDefaultColumnWidth(): number {
        return this._defaultColumnWidth;
    }

    setDefaultRowHeight(h: number): void {
        if (this._defaultRowHeight === h) return;
        this._defaultRowHeight = h;
        this._bumpVersion();
    }

    setDefaultColumnWidth(w: number): void {
        if (this._defaultColumnWidth === w) return;
        this._defaultColumnWidth = w;
        this._bumpVersion();
    }

    // ── Sparse overrides — point-write ────────────────────────────────────────

    setRowHeight(index: number, height: number | null): void {
        if (height === null) {
            if (this._rowsOverrides[index] === undefined) return;
            delete this._rowsOverrides[index];
        } else {
            this._rowsOverrides[index] = { height };
        }
        this._bumpVersion();
    }

    setColumnWidth(index: number, width: number | null): void {
        if (width === null) {
            if (this._columnsOverrides[index] === undefined) return;
            delete this._columnsOverrides[index];
        } else {
            this._columnsOverrides[index] = { width };
        }
        this._bumpVersion();
    }

    // ── Sparse overrides — bulk write ─────────────────────────────────────────

    setRowHeights(map: Map<number, number>): void {
        for (const [idx, height] of map) {
            this._rowsOverrides[idx] = { height };
        }
        this._bumpVersion();
    }

    setColumnWidths(map: Map<number, number>): void {
        for (const [idx, width] of map) {
            this._columnsOverrides[idx] = { width };
        }
        this._bumpVersion();
    }

    /** Полная замена overrides (для import / BULK_SET). */
    replaceRowsMeta(overrides: Record<number, RowMeta>): void {
        this._rowsOverrides = { ...overrides };
        this._bumpVersion();
    }

    /** Полная замена overrides (для import / BULK_SET). */
    replaceColumnsMeta(overrides: Record<number, ColumnMeta>): void {
        this._columnsOverrides = { ...overrides };
        this._bumpVersion();
    }

    // ── INSERT / DELETE с сдвигом overrides ──────────────────────────────────

    insertRows(from: number, count: number, shouldShift: boolean): void {
        this._rowsCount += count;
        this._bumpVersion();
    }

    deleteRows(from: number, count: number): void {
        this._rowsCount = Math.max(0, this._rowsCount - count);
        this._bumpVersion();
    }

    insertColumns(from: number, count: number, shouldShift: boolean): void {
        this._columnsCount += count;
        this._bumpVersion();
    }

    deleteColumns(from: number, count: number): void {
        this._columnsCount = Math.max(0, this._columnsCount - count);
        this._bumpVersion();
    }

    conditionalShiftRows(from: number, count: number, shouldShift: boolean): void {
        this._rowsOverrides = conditionalInsertShiftMeta(this._rowsOverrides, from, count, shouldShift);
        this._bumpVersion();
    }

    conditionalShiftColumns(from: number, count: number, shouldShift: boolean): void {
        this._columnsOverrides = conditionalInsertShiftMeta(this._columnsOverrides, from, count, shouldShift);
        this._bumpVersion();
    }

    // ── Read API для Canvas ───────────────────────────────────────────────────

    /**
     * Иммутабельный view для Canvas. Мемоизируется до следующего _bumpVersion().
     */
    getRowsView(): IRowsMetadata {
        if (!this._rowsView) {
            this._rowsView = new VirtualRowsMetadata(this._rowsCount, this._rowsOverrides, this._defaultRowHeight);
        }
        return this._rowsView;
    }

    /**
     * Иммутабельный view для Canvas. Мемоизируется до следующего _bumpVersion().
     */
    getColumnsView(): IColumnsMetadata {
        if (!this._columnsView) {
            this._columnsView = new VirtualColumnsMetadata(
                this._columnsCount,
                this._columnsOverrides,
                this._defaultColumnWidth,
            );
        }
        return this._columnsView;
    }

    /** Прямой доступ к sparse-данным для export / XLSX / фасадов. */
    getRowsOverrides(): Readonly<Record<number, RowMeta>> {
        return this._rowsOverrides;
    }

    getColumnsOverrides(): Readonly<Record<number, ColumnMeta>> {
        return this._columnsOverrides;
    }

    // ── Snapshot / Restore (для undo/redo) ───────────────────────────────────

    export(): MetadataSnapshot {
        return {
            rowsCount: this._rowsCount,
            columnsCount: this._columnsCount,
            rowsOverrides: { ...this._rowsOverrides },
            columnsOverrides: { ...this._columnsOverrides },
            defaultRowHeight: this._defaultRowHeight,
            defaultColumnWidth: this._defaultColumnWidth,
        };
    }

    import(snap: MetadataSnapshot): void {
        this._rowsCount = snap.rowsCount;
        this._columnsCount = snap.columnsCount;
        this._rowsOverrides = { ...snap.rowsOverrides };
        this._columnsOverrides = { ...snap.columnsOverrides };
        this._defaultRowHeight = snap.defaultRowHeight;
        this._defaultColumnWidth = snap.defaultColumnWidth;
        this._bumpVersion();
    }

    /** Полный сброс к дефолтным значениям (для resetMatrixSize). */
    clear(opts?: { rowsCount?: number; columnsCount?: number; defaultRowHeight?: number; defaultColumnWidth?: number }): void {
        this._rowsCount = opts?.rowsCount ?? this._rowsCount;
        this._columnsCount = opts?.columnsCount ?? this._columnsCount;
        this._defaultRowHeight = opts?.defaultRowHeight ?? this._defaultRowHeight;
        this._defaultColumnWidth = opts?.defaultColumnWidth ?? this._defaultColumnWidth;
        this._rowsOverrides = {};
        this._columnsOverrides = {};
        this._bumpVersion();
    }
}
