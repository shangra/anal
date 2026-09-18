import React from 'react';

import { Cell, Range } from '../../AdapterSpreadSheet/models';
import {
    CellDataType,
    ColumnIndex,
    IButton,
    ICell as IAdapterSpreadSheetCell,
    ICellStyles,
    IHeaderGroup,
    IRangeStyles,
    ObjectIndexes,
    RowIndex,
} from '../../AdapterSpreadSheet/types';
import { ICursor } from '../../SpreadSheetPlugins/PluginCursorCell/types';
import { IColumnsMetadata, IRowsMetadata } from '../../SpreadSheetPlugins/PluginMetadata/types';
import { CursorStyle, ITableAPI, JoinedCell, Theme } from '../../TableAdapters/types';
import { AnimationOptions, Keyframe } from './animation/types';

export interface IPoint {
    x: number;
    y: number;
}

export interface ICamera {
    x: number;
    y: number;
    z: number;
}

export interface IBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

export interface CompenentMouseEvent {
    metaKey: boolean;
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    cell: ObjectIndexes;
    component: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface IComponentInfo {
    x: number;
    y: number;
    width: number;
    height: number;
    rowIndex: number;
    columnIndex: number;
    onClick?: (event: CompenentMouseEvent) => void;
    onDblClick?: (event: CompenentMouseEvent) => void;
    onMouseDown?: (event: CompenentMouseEvent) => void;
    onMouseUp?: (event: CompenentMouseEvent) => void;
    disabled?: boolean;
    loading?: boolean;
}

export type SpreadSheetData = Map<number, Map<number, IAdapterSpreadSheetCell>>;

export interface ISpreadsheetMouseEvent
    extends Pick<
        React.MouseEvent<HTMLCanvasElement>,
        'clientX' | 'clientY' | 'currentTarget' | 'metaKey' | 'altKey' | 'ctrlKey' | 'shiftKey' | 'button'
    > {}

/**
 * @prop {number} columnIndex - индекс изменяемой колонки/строки
 * @prop {number} screenLeftOffset - отступ относительно экрана
 * @prop {number} canvasLeftOffset - отступ относительно canvas и всего контента
 * @prop {number} mode - режим изменения (normal: - при hover'е над заголовками; dragging: - при самом перетаскивании)
 */
export interface IResizer {
    index: number;
    screenOffset: number;
    worldOffset: number;
    type: 'row' | 'column';
    mode: 'normal' | 'dragging';
}

export interface IVisibleRange {
    minRowIndex: number;
    maxRowIndex: number;
    minColumnIndex: number;
    maxColumnIndex: number;
}

export interface IVisibleRanges {
    'frozen-both': IVisibleRange | null;
    'frozen-rows': IVisibleRange | null;
    'frozen-columns': IVisibleRange | null;
    scrollable: IVisibleRange;
    /** Объединенный диапазон всех видимых ячеек */
    combined: IVisibleRange;
}

export interface ICanvasTableAPI extends ITableAPI<HTMLCanvasElement> {
    refresh: () => void;
    getCanvasContext: (layer: 'background' | 'content' | 'selection' | 'overlay') => CanvasRenderingContext2D | null;
    exportToImage: (layer: 'background' | 'content' | 'selection' | 'overlay') => string | null;
    getVisibleRanges: () => IVisibleRanges | null;
}

type ISpreadsheetCellEvent = {
    metaKey: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    cell: ObjectIndexes;
};

export interface ICanvasTableProps {
    lastupdate: number;
    width: number;
    height: number;
    zoom?: number;

    // ── Метаданные ────────────────────────────────────────────────────────────
    columnsMetadata: IColumnsMetadata;
    rowsMetadata: IRowsMetadata;
    columnsAmount?: number;
    rowsAmount?: number;

    // ── Данные ────────────────────────────────────────────────────────────────
    cursor: ICursor | null;
    ranges?: Range[];
    rangesStyles?: Record<string, IRangeStyles>;
    joinedCells?: JoinedCell[];

    // ── Редактирование ────────────────────────────────────────────────────────
    editingCell: Cell | null;
    currentValue: string;

    frozenRows?: number;
    frozenColumns?: number;
    fillDraggingRange?: Range | null;
    cursorStyle?: CursorStyle;
    themeOverride?: Partial<Theme>;
    hasColumnsHeader?: boolean;
    hasRowsHeader?: boolean;
    enablePerformanceMonitoring?: boolean;

    // ── Accessors ─────────────────────────────────────────────────────────────
    getCellDisplayValue: (rowIndex: RowIndex, columnIndex: ColumnIndex) => CellDataType | null;
    getCellStyle: (rowIndex: RowIndex, columnIndex: ColumnIndex) => ICellStyles;
    getCellComponents: (rowIndex: RowIndex, columnIndex: ColumnIndex) => IButton[];

    // ── Группы ────────────────────────────────────────────────────────────────
    rowGroups?: IHeaderGroup[];
    columnGroups?: IHeaderGroup[];
    onToggleGroup?: (id: string, type: 'row' | 'column') => void;

    // ── Event handlers ────────────────────────────────────────────────────────
    onViewportChange?: (ranges: IVisibleRanges) => void;
    onKeyDown?: (event: React.KeyboardEvent) => void;
    onKeyUp?: (event: React.KeyboardEvent) => void;
    onClick?: (event: ISpreadsheetCellEvent) => void;
    onDblClick?: (event: ISpreadsheetCellEvent) => void;
    onMouseDown?: (event: ISpreadsheetCellEvent) => void;
    onMouseUp?: (event: ISpreadsheetCellEvent) => void;
    onCellEnter?: (event: ISpreadsheetCellEvent) => void;
    onCellLeave?: (event: Partial<ISpreadsheetCellEvent>) => void;
    onContextMenu?: (event: { cell: ObjectIndexes; clientX: number; clientY: number }) => void;
    onRootMouseDown?: (event: ISpreadsheetCellEvent) => void;
    onRootMouseUp?: (event: ISpreadsheetCellEvent) => void;

    // Header handlers
    onColumnsHeaderCellEnter?: (event: { metaKey: boolean }, columnIndex: ColumnIndex) => void;
    onColumnsHeaderCellLeave?: (event: { metaKey: boolean }, columnIndex: ColumnIndex) => void;
    onColumnsHeaderCellMouseDown?: (event: ISpreadsheetCellEvent) => void;
    onColumnsHeaderCellMouseUp?: (event: ISpreadsheetCellEvent) => void;
    onColumnsHeaderCellClick?: (event: ISpreadsheetCellEvent) => void;
    onRowsHeaderCellEnter?: (event: { metaKey: boolean }, rowIndex: RowIndex) => void;
    onRowsHeaderCellLeave?: (event: { metaKey: boolean }, rowIndex: RowIndex) => void;
    onRowsHeaderCellMouseDown?: (event: ISpreadsheetCellEvent) => void;
    onRowsHeaderCellMouseUp?: (event: ISpreadsheetCellEvent) => void;
    onRowsHeaderCellClick?: (event: ISpreadsheetCellEvent) => void;

    // Fill handle
    onFillHandleMouseDown?: (event: { cell: ObjectIndexes }) => void;
    onFillHandleMouseMove?: (event: { cell: ObjectIndexes }) => void;
    onFillHandleMouseUp?: (event: { cell: ObjectIndexes }) => void;

    // ── Resize ────────────────────────────────────────────────────────────────
    onRowsResize?: (rows: Map<number, number>) => void;
    onColumnsResize?: (columns: Map<number, number>) => void;
    /** Развернуть строку через контекстное меню — восстанавливает сохранённый размер */
    onRowExpandResize?: (rowIndex: number) => void;
    /** Развернуть столбец через ресайз — размер задаётся последующим COLUMNS_RESIZE */
    onColumnExpandResize?: (columnIndex: number) => void;

    /**
     * Авто-подбор ширины колонок (двойной клик на resizer).
     * [] = все непустые колонки.
     */
    onColumnsAutoFit?: (columns: number[]) => void;

    /**
     * Авто-подбор высоты строк (двойной клик на row resizer).
     */
    onRowsAutoFit?: (rows: number[]) => void;

    // ── Zoom / Scroll ─────────────────────────────────────────────────────────
    onZooming?: (zoom: number) => void;
    onScroll?: (delta: any) => void;
}
