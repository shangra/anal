import React from 'react';

import { IMeasurementAPI } from '../../../AdapterSpreadSheet/measurement/types';
import { Cell, Range } from '../../../AdapterSpreadSheet/models';
import {
    CellDataType,
    ColumnIndex,
    IButton,
    ICellStyles,
    IHeaderGroup,
    IRangeStyles,
    RowIndex,
} from '../../../AdapterSpreadSheet/types';
import { ICursor } from '../../../SpreadSheetPlugins/PluginCursorCell/types';
import { IColumnsMetadata, IRowsMetadata } from '../../../SpreadSheetPlugins/PluginMetadata/types';
import { CursorStyle, JoinedCell, Theme } from '../../../TableAdapters/types';
import { IBox, ICamera, IComponentInfo, IResizer, SpreadSheetData } from '../types';

export interface CanvasTableContext {
    lastupdate: number;

    // ── Canvas refs ───────────────────────────────────────────────────────────
    backgroundRef: React.RefObject<HTMLCanvasElement>;
    contentRef: React.RefObject<HTMLCanvasElement>;
    selectionRef: React.RefObject<HTMLCanvasElement>;
    headersRef: React.RefObject<HTMLCanvasElement>;
    overlayRef: React.RefObject<HTMLCanvasElement>;

    // ── Размеры ───────────────────────────────────────────────────────────────
    width: number;
    height: number;
    columnsAmount: number;
    rowsAmount: number;

    measurementAPI: React.RefObject<IMeasurementAPI> | null;

    // ── Метаданные (readonly — управляются PluginMetadata, не Canvas) ─────────
    /**
     * Полные метаданные колонок с абсолютными x-позициями.
     * Источник: PluginMetadata.state.columnsMetadata.
     * Canvas не мутирует этот массив.
     */
    columnsMetadata: IColumnsMetadata;
    /**
     * Полные метаданные строк с абсолютными y-позициями.
     * Источник: PluginMetadata.state.rowsMetadata.
     * Canvas не мутирует этот массив.
     */
    rowsMetadata: IRowsMetadata;

    // ── Камера ────────────────────────────────────────────────────────────────
    camera: ICamera;
    setCamera: React.Dispatch<React.SetStateAction<ICamera>>;
    viewport: IBox;

    // ── Данные и стили ────────────────────────────────────────────────────────
    cursor: ICursor | null;
    ranges: Range[];
    rangesStyles: Record<string, IRangeStyles>;
    joinedCells: JoinedCell[];
    fillDraggingRange: Range | null;

    // ── Редактирование ────────────────────────────────────────────────────────
    editingCell: Cell | null;
    currentValue: string;

    // ── Frozen / Collapsed ────────────────────────────────────────────────────
    frozenRows: number;
    frozenColumns: number;
    frozenAreaWidth: number;
    frozenAreaHeight: number;

    // ── Headers ───────────────────────────────────────────────────────────────
    hasColumnsHeader: boolean;
    hasRowsHeader: boolean;
    currentHeader: React.MutableRefObject<'row' | 'column' | null>;
    currentColumnsHeaderCellIndex: React.MutableRefObject<number | null>;
    currentRowsHeaderCellIndex: React.MutableRefObject<number | null>;

    // ── Theme ─────────────────────────────────────────────────────────────────
    theme: Theme;
    setTheme: React.Dispatch<React.SetStateAction<Theme>>;

    // ── Resizer (только UI-состояние: позиция индикатора при drag) ────────────
    resizer: IResizer | null;
    setResizer: React.Dispatch<React.SetStateAction<IResizer | null>>;

    // ── Группы ───────────────────────────────────────────────────────────────
    rowGroups: IHeaderGroup[];
    columnGroups: IHeaderGroup[];
    onToggleGroup: (id: string, type: 'row' | 'column') => void;

    // ── Callbacks для данных ──────────────────────────────────────────────────
    getCellDisplayValue: (rowIndex: RowIndex, columnIndex: ColumnIndex) => CellDataType | null;
    getCellStyle: (rowIndex: RowIndex, columnIndex: ColumnIndex) => ICellStyles;
    getCellComponents: (rowIndex: RowIndex, columnIndex: ColumnIndex) => IButton[];

    // ── Callbacks для resize (вызывают dispatch в AdapterSpreadSheet) ─────────
    /**
     * Вызывается useResize по завершении drag.
     * Внутри: dispatch({ type: 'COLUMNS_RESIZE', payload: { columns } })
     * -> PluginMetadata пересчитывает columnsMetadata[] -> Canvas re-render.
     */
    onColumnsResize?: (columns: Map<number, number>) => void;
    /**
     * Вызывается useResize по завершении drag.
     * Внутри: dispatch({ type: 'ROWS_RESIZE', payload: { rows } })
     * -> PluginMetadata пересчитывает rowsMetadata[] -> Canvas re-render.
     */
    onRowsResize?: (rows: Map<number, number>) => void;

    /**
     * Вызывается при разворачивании свернутой строки через перетаскивание (ресайз).
     * Внутри: dispatch({ type: 'ROW_EXPAND_RESIZE', payload: rowIndex })
     * НЕ восстанавливает сохранённый размер — размер задаётся последующим ROWS_RESIZE.
     */
    onRowExpandResize?: (rowIndex: number) => void;
    /**
     * Вызывается при разворачивании свернутого столбца через перетаскивание (ресайз).
     * Внутри: dispatch({ type: 'COLUMN_EXPAND_RESIZE', payload: columnIndex })
     * НЕ восстанавливает сохранённый размер — размер задаётся последующим COLUMNS_RESIZE.
     */
    onColumnExpandResize?: (columnIndex: number) => void;

    // ── Auto-fit ─────────────────────────────────────────────────────────────

    /**
     * Dispatch COLUMNS_AUTO_FIT -> PluginMetadata измеряет через IMeasurementAPI.
     * [] = авто-подбор всех непустых колонок.
     */
    onColumnsAutoFit?: (columns: number[]) => void;
    /**
     * Dispatch ROWS_AUTO_FIT -> PluginMetadata измеряет через IMeasurementAPI.
     */
    onRowsAutoFit?: (rows: number[]) => void;

    // ── Компоненты ────────────────────────────────────────────────────────────

    componentsInfo: IComponentInfo[];
    setComponentsInfo: React.Dispatch<React.SetStateAction<IComponentInfo[]>>;
    cellsWithComponents: React.MutableRefObject<SpreadSheetData>;

    // ── Курсор (из плагинов, напр. Format Painter) ─────────────────────────
    cursorStyle?: CursorStyle;
}
