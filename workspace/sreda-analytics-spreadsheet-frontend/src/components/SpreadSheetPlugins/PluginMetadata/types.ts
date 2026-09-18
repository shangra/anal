import { ColumnIndex, RowIndex } from '../../AdapterSpreadSheet/types';
import {
    IColumnMetadata,
    IColumnsMetadata,
    IRowMetadata,
    IRowsMetadata,
    VirtualColumnsMetadata,
    VirtualRowsMetadata,
} from '../../AdapterSpreadSheet/utils/VirtualMetadata';
import { PLUGIN_METADATA_KEY } from './constants';
import { PluginMetadata } from './PluginMetadata';

// Реэкспорт для обратной совместимости — потребители импортируют из plugin/types
export type { IColumnMetadata, IColumnsMetadata, IRowMetadata, IRowsMetadata };
export { VirtualColumnsMetadata, VirtualRowsMetadata };

// ─── State ────────────────────────────────────────────────────────────────────

/**
 * Состояние PluginMetadata.
 *
 * После рефакторинга state плагина пустой — единственный источник истины
 * для метаданных хранится в MetadataManager (context.metadataManager).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginMetadataState {}

export interface PluginMetadataOptions {
    defaultColumnWidth?: number;
    defaultRowHeight?: number;
    /** Начальное количество строк (переопределяет DEFAULT_ROWS_COUNT) */
    initialRowsCount?: number;
    /** Начальное количество колонок (переопределяет DEFAULT_COLUMNS_COUNT) */
    initialColumnsCount?: number;
}

// ─── Action map ───────────────────────────────────────────────────────────────

type PluginMetadataActionMap = {
    // Resize
    ROWS_META_SET: Record<RowIndex, { height: number }>;
    COLUMNS_META_SET: Record<ColumnIndex, { width: number }>;

    // Структурные
    ROWS_COUNT_SET: number;
    COLUMNS_COUNT_SET: number;
    ROW_INSERT: { index: number; position: 'before' | 'after'; count: number };
    ROW_DELETE: { index: number; count: number };
    COLUMN_INSERT: { index: number; position: 'before' | 'after'; count: number };
    COLUMN_DELETE: { index: number; count: number };
    ROWS_META_CONDITIONAL_SHIFT: { from: number; count: number; shouldShift: boolean; metaType: 'rows' | 'columns' };

    // Collapse/Expand
    ROW_COLLAPSE: { rowIndex: number };
    ROW_EXPAND: { rowIndex: number; mode?: 'restore' | 'minimal' };
    COLUMN_COLLAPSE: { columnIndex: number };
    COLUMN_EXPAND: { columnIndex: number; mode?: 'restore' | 'minimal' };
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginMetadataActionMap {}
}

// ─── Plugin registry ─────────────────────────────────────────────────────────

interface PluginMetadataPluginRegistry {
    [PLUGIN_METADATA_KEY]: PluginMetadata;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginMetadataPluginRegistry {}
}
