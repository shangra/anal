import { IMeasurementAPI } from '../AdapterSpreadSheet/measurement/types';
import { Cell, JoinedCell, Range } from '../AdapterSpreadSheet/models';
import {
    CellDataType,
    ColumnIndex,
    IButton,
    ICellPluginsConfig,
    ICellStyles,
    IHeaderGroup,
    IRangeStyles,
    ObjectIndexes,
    RowIndex,
} from '../AdapterSpreadSheet/types';
import { ICursor } from '../SpreadSheetPlugins/PluginCursorCell/types';
import { IColumnsMetadata, IRowsMetadata } from '../SpreadSheetPlugins/PluginMetadata/types';
import { IPoint, IVisibleRanges } from '../SpreadSheetTables/CanvasTable/types';

export { Cell, Range, JoinedCell } from '../AdapterSpreadSheet/models';

export type CursorStyle = 'default' | 'copy' | 'crosshair';

export type Theme = {
    bgColor: string;
    borderColor: string;
    rowsCellBg?: string;
    evenRowsCellBg?: string;
    color: string;
    cmpColor: string;
    headerCellBg: string;
    headerCellAltBg: string;
    headerCellActiveBg: string;

    selectedRangeBg: string;
    activeСellBorderColor: string;

    rowResizerBg?: string;
    rowResizerIndicatorBg?: string;
    columnResizerBg?: string;
    columnResizerIndicatorBg?: string;
    activeСellColor?: string;
    activeСellBgColor?: string;
    evenRowsCellColor?: string;
    evenRowsCellBorderColor?: string;
    oddRowsCellColor?: string;
    oddRowsCellBg?: string;
    oddRowsCellBorderColor?: string;
    cmpPrimaryColor?: string;
    cmpPrimaryHoverColor?: string;
    cmpSecondaryColor?: string;
    cmpSecondaryHoverColor?: string;
    cmpControlledColor?: string;
    cmpControlledHoverColor?: string;
};

export interface ITableAPI<TElement extends HTMLElement = HTMLElement> {
    current: TElement | null;

    // ── Focus ───────────────────────────────────────────────────────────────
    focus: () => void;

    // ── Rendering ─────────────────────────────────────────────────────────────
    refresh: () => void;

    // ── Camera ────────────────────────────────────────────────────────────────
    panCamera: (dx: number, dy: number) => void;
    zoomCamera: (point: IPoint, dz: number) => void;
    zoomCameraIn: () => void;
    zoomCameraOut: () => void;
    scrollToColumn: (columnIndex: number) => void;
    scrollToRow: (rowIndex: number) => void;
    scrollToCell: (cell: ObjectIndexes) => void;

    // ── Viewport ──────────────────────────────────────────────────────────────
    getVisibleRanges: () => IVisibleRanges | null;

    /**
     * API измерения текста, реализованный визуальным слоем.
     * Доступен сразу после монтирования компонента.
     */
    getMeasurementAPI(): IMeasurementAPI | null;
}

export interface ISpreadSheet<TableAPI extends ITableAPI = ITableAPI> {
    tableAPIRef: React.RefObject<TableAPI>;

    lastupdate: number;
    width: number;
    height: number;
    columnsAmount?: number;
    rowsAmount?: number;
    zoom?: number;

    /**
     * Полные метаданные колонок — предоставляются PluginMetadata.
     * Содержат: index, x (абсолютная позиция), width, name (A/B/C...).
     * Canvas использует напрямую, не генерирует самостоятельно.
     */
    columnsMetadata: IColumnsMetadata;

    /**
     * Полные метаданные строк — предоставляются PluginMetadata.
     * Содержат: index, y (абсолютная позиция), height.
     */
    rowsMetadata: IRowsMetadata;

    cursor: ICursor | null;
    ranges?: Range[];
    rangesStyles?: Record<string, IRangeStyles>;
    joinedCells?: JoinedCell[];
    frozenRows?: number;
    frozenColumns?: number;
    fillDraggingRange?: Range | null;
    cursorStyle?: CursorStyle;
    themeOverride?: Partial<Theme>;
    hasColumnsHeader?: boolean;
    hasRowsHeader?: boolean;
    rowGroups?: IHeaderGroup[];
    columnGroups?: IHeaderGroup[];

    // ── Редактирование ────────────────────────────────────────────────────────
    editingCell: Cell | null;
    currentValue: string;

    // Accessors
    getCellDisplayValue: (rowIndex: RowIndex, columnIndex: ColumnIndex) => CellDataType | null;
    getCellStyle: (rowIndex: RowIndex, columnIndex: ColumnIndex) => ICellStyles;
    getCellComponents: (rowIndex: RowIndex, columnIndex: ColumnIndex) => IButton[];
    getCellPluginConfig?: <K extends keyof ICellPluginsConfig>(cell: Cell, key: K) => ICellPluginsConfig[K] | null;

    // Event handlers
    onViewportChange?: (ranges: IVisibleRanges) => void;
    onKeyDown?: (event: React.KeyboardEvent) => void;
    onKeyUp?: (event: React.KeyboardEvent) => void;
    onClick?: (event: any) => void;
    onDblClick?: (event: any) => void;
    onMouseDown?: (event: any) => void;
    onMouseUp?: (event: any) => void;
    onCellEnter?: (event: any) => void;
    onCellLeave?: (event: any) => void;
    onContextMenu?: (event: any) => void;
    onRootMouseDown?: (event: any) => void;
    onRootMouseUp?: (event: any) => void;
    onColumnsHeaderCellEnter?: (event: any, columnIndex: ColumnIndex) => void;
    onColumnsHeaderCellMouseDown?: (event: any) => void;
    onColumnsHeaderCellClick?: (event: any) => void;
    onColumnsHeaderCellMouseUp?: (event: any) => void;
    onColumnsHeaderCellLeave?: (event: any, columnIndex: ColumnIndex) => void;
    onRowsHeaderCellEnter?: (event: any, rowIndex: RowIndex) => void;
    onRowsHeaderCellMouseDown?: (event: any) => void;
    onRowsHeaderCellClick?: (event: any) => void;
    onRowsHeaderCellMouseUp?: (event: any) => void;
    onRowsHeaderCellLeave?: (event: any, rowIndex: RowIndex) => void;
    onFillHandleMouseDown?: (event: { cell: ObjectIndexes }) => void;
    onFillHandleMouseMove?: (event: { cell: ObjectIndexes }) => void;
    onFillHandleMouseUp?: (event: { cell: ObjectIndexes }) => void;
    onRowsResize?: (rows: Map<number, number>) => void;
    onColumnsResize?: (columns: Map<number, number>) => void;
    /** Развернуть строку через ресайз — размер задаётся последующим ROWS_RESIZE */
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

    onScroll?: (delta: any) => void;
    onZooming?: (zoom: number) => void;
    onToggleGroup?: (id: string, type: 'row' | 'column') => void;

    /** @see CanvasTableContext.getColumnAutoWidth */
    getColumnAutoWidth?: (columnIndex: number) => number;
    /** @see CanvasTableContext.getRowAutoHeight */
    getRowAutoHeight?: (rowIndex: number) => number;
}

export type SpreadSheetAdapter<P extends ISpreadSheet> = React.ComponentType<P & React.RefAttributes<unknown>>;
