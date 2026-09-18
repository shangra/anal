import { useCallback, useContext, useEffect, useRef } from 'react';

import { ObjectIndexes } from '../../../AdapterSpreadSheet/types';
import {
    COLLAPSED_INDICATOR_TOLERANCE,
    COLUMNS_HEADER_HEIGHT,
    DEFAULT_PADDING_X,
    DEFAULT_PADDING_Y,
    MIN_COLUMN_WIDTH,
    MIN_ROW_HEIGHT,
    ROWS_HEADER_WIDTH,
} from '../const';
import { CanvasSpreadSheetContext } from '../context';
import { ISpreadsheetMouseEvent } from '../types';
import { CellArea, getActiveColumns, getActiveRows, worldToScreen } from '../utils';
import { findCollapsedColumnIndicatorByScreenX, findCollapsedRowIndicatorByScreenY } from '../utils/collapsedIndicators';

/**
 * Упрощенные функции конвертации координат для useResize
 */
function _screenToWorld(
    screenCoord: number,
    axis: 'x' | 'y',
    options: {
        camera: any;
        isFrozenRow?: boolean;
        isFrozenColumn?: boolean;
        hasRowsHeader?: boolean;
        hasColumnsHeader?: boolean;
    },
): number {
    const { camera, isFrozenRow = false, isFrozenColumn = false, hasRowsHeader = false, hasColumnsHeader = false } = options;

    const isFrozen = axis === 'x' ? isFrozenColumn : isFrozenRow;

    const rowHeaderWidth = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;
    const columnsHeaderHeight = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;
    const headerSize = axis === 'x' ? rowHeaderWidth : columnsHeaderHeight;

    const worldCoord = (screenCoord - headerSize * camera.z) / camera.z;

    return isFrozen ? worldCoord : worldCoord - camera[axis];
}

function _worldToScreen(
    worldCoord: number,
    axis: 'x' | 'y',
    options: {
        camera: any;
        isFrozenRow?: boolean;
        isFrozenColumn?: boolean;
        hasRowsHeader?: boolean;
        hasColumnsHeader?: boolean;
    },
): number {
    const { camera, isFrozenRow = false, isFrozenColumn = false, hasRowsHeader = false, hasColumnsHeader = false } = options;

    const isFrozen = axis === 'x' ? isFrozenColumn : isFrozenRow;

    const rowHeaderWidth = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;
    const columnsHeaderHeight = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;
    const headerSize = axis === 'x' ? rowHeaderWidth : columnsHeaderHeight;

    const adjusted = isFrozen ? worldCoord : worldCoord + camera[axis];

    return adjusted * camera.z + headerSize * camera.z;
}

export const useResize = () => {
    const {
        overlayRef,
        hasColumnsHeader,
        hasRowsHeader,
        ranges,
        resizer,
        setResizer,
        columnsMetadata,
        rowsMetadata,
        camera,
        onColumnsResize,
        onRowsResize,
        onRowExpandResize,
        onColumnExpandResize,
        frozenRows,
        frozenColumns,
        // Auto-fit callbacks — предоставляются AdapterSpreadSheet
        onColumnsAutoFit,
        onRowsAutoFit,
    } = useContext(CanvasSpreadSheetContext);

    // ── Таймеры для разграничения single/double click ─────────────────────────
    const columnClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rowClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Column resize ─────────────────────────────────────────────────────────

    const onColumnResizeStart = useCallback(
        (_event: ISpreadsheetMouseEvent) => {
            if (!resizer || resizer.type !== 'column') return;
            // Если столбец свернут — развернуть через expand-resize (размер задаётся курсором, не восстанавливается)
            const colMeta = columnsMetadata.at(resizer.index);
            if (colMeta && colMeta.width === 0) {
                onColumnExpandResize?.(resizer.index);
            }
            setResizer({ ...resizer, mode: 'dragging' });
        },
        [resizer, setResizer, columnsMetadata, onColumnExpandResize],
    );

    const onColumnResizeMove = useCallback(
        (event: ISpreadsheetMouseEvent) => {
            if (!resizer || resizer.type !== 'column' || resizer.mode !== 'dragging') return;

            const { index } = resizer;
            const componentClientX = event.clientX - event.currentTarget.getBoundingClientRect().left;

            const isFrozen = index < frozenColumns;
            const worldX = _screenToWorld(componentClientX, 'x', {
                camera,
                isFrozenColumn: isFrozen,
                hasRowsHeader,
            });

            const colMeta = columnsMetadata.at(index);
            const minWorldX = colMeta.x + MIN_COLUMN_WIDTH + DEFAULT_PADDING_X * 2;
            const newWorldX = Math.max(worldX, minWorldX);
            const newScreenX = _worldToScreen(newWorldX, 'x', {
                camera,
                isFrozenColumn: isFrozen,
                hasRowsHeader,
            });

            setResizer({ ...resizer, screenOffset: newScreenX, worldOffset: newWorldX });
        },
        [resizer, camera, columnsMetadata, setResizer, hasRowsHeader, frozenColumns],
    );

    const onColumnResizeEnd = useCallback(
        (_event: ISpreadsheetMouseEvent) => {
            if (!resizer || resizer.type !== 'column' || resizer.mode !== 'dragging') return;

            const { index, worldOffset } = resizer;
            const newWidth = Math.max(MIN_COLUMN_WIDTH, worldOffset - columnsMetadata.at(index).x);

            // Определяем затронутые колонки
            const activeColumns = getActiveColumns(ranges, rowsMetadata.length);
            // Если активные колонки включают столбец, чей разделитель перетаскивается,
            // изменяем все активные колонки. Иначе изменяем только этот столбец.
            const columnsToResize = activeColumns.has(index) ? Array.from(activeColumns) : [index];

            const resized = new Map<number, number>();
            for (const col of columnsToResize) {
                resized.set(col, newWidth);
            }

            setResizer({ ...resizer, mode: 'normal' });

            // ── Диспатч -> PluginMetadata.reducer -> пересчёт columnsMetadata[] ─
            // Canvas получит новые метаданные через props при следующем render.
            // setColumnsMetadata НЕ вызывается — Canvas не управляет метаданными.
            onColumnsResize?.(resized);
        },
        [resizer, columnsMetadata, ranges, rowsMetadata.length, setResizer, onColumnsResize],
    );

    // ── Row resize ────────────────────────────────────────────────────────────

    const onRowResizeStart = useCallback(
        (_event: ISpreadsheetMouseEvent) => {
            if (!resizer || resizer.type !== 'row') return;
            // Если строка свернута — развернуть через expand-resize (размер задаётся курсором, не восстанавливается)
            const rowMeta = rowsMetadata.at(resizer.index);
            if (rowMeta && rowMeta.height === 0) {
                onRowExpandResize?.(resizer.index);
            }
            setResizer({ ...resizer, mode: 'dragging' });
        },
        [resizer, setResizer, rowsMetadata, onRowExpandResize],
    );

    const onRowResizeMove = useCallback(
        (event: ISpreadsheetMouseEvent) => {
            if (!resizer || resizer.type !== 'row' || resizer.mode !== 'dragging') return;

            const { index } = resizer;
            const componentClientY = event.clientY - event.currentTarget.getBoundingClientRect().top;

            const isFrozen = index < frozenRows;
            const worldY = _screenToWorld(componentClientY, 'y', {
                camera,
                isFrozenRow: isFrozen,
                hasColumnsHeader,
            });

            const rowMeta = rowsMetadata.at(index);
            const minWorldY = rowMeta.y + MIN_ROW_HEIGHT + DEFAULT_PADDING_Y * 2;
            const newWorldY = Math.max(worldY, minWorldY);
            const newScreenY = _worldToScreen(newWorldY, 'y', {
                camera,
                isFrozenRow: isFrozen,
                hasColumnsHeader,
            });

            setResizer({ ...resizer, screenOffset: newScreenY, worldOffset: newWorldY });
        },
        [resizer, camera, rowsMetadata, setResizer, hasColumnsHeader, frozenRows],
    );

    const onRowResizeEnd = useCallback(
        (_event: ISpreadsheetMouseEvent) => {
            if (!resizer || resizer.type !== 'row' || resizer.mode !== 'dragging') return;

            const { index, worldOffset } = resizer;
            const newHeight = Math.max(MIN_ROW_HEIGHT, worldOffset - rowsMetadata.at(index).y);

            const activeRows = getActiveRows(ranges, columnsMetadata.length);
            // Если активные строки включают строку, чей разделитель перетаскивается,
            // изменяем все активные строки. Иначе изменяем только эту строку.
            const rowsToResize = activeRows.has(index) ? Array.from(activeRows) : [index];

            const resized = new Map<number, number>();
            for (const row of rowsToResize) {
                resized.set(row, newHeight);
            }

            setResizer({ ...resizer, mode: 'normal' });

            // ── Диспатч -> PluginMetadata.reducer -> пересчёт rowsMetadata[] ────
            onRowsResize?.(resized);
        },
        [resizer, rowsMetadata, ranges, columnsMetadata.length, setResizer, onRowsResize],
    );

    // ── Auto-fit (двойной клик по resizer) ───────────────────────────────────

    const onColumnResizeFit = useCallback(
        (_event: ISpreadsheetMouseEvent) => {
            if (!resizer || resizer.type !== 'column') return;

            const activeColumns = getActiveColumns(ranges, rowsMetadata.length);
            // Если активные колонки включают столбец, чей разделитель был двойным кликом,
            // изменяем все активные колонки. Иначе изменяем только этот столбец.
            const columnsToFit = activeColumns.has(resizer.index) ? Array.from(activeColumns) : [resizer.index];

            setResizer({ ...resizer, mode: 'normal' });
            onColumnsAutoFit?.(columnsToFit);
        },
        [resizer, ranges, rowsMetadata.length, setResizer, onColumnsAutoFit],
    );

    const onRowResizeFit = useCallback(
        (_event: ISpreadsheetMouseEvent) => {
            if (!resizer || resizer.type !== 'row') return;

            const activeRows = getActiveRows(ranges, columnsMetadata.length);
            // Если активные строки включают строку, чей разделитель был двойным кликом,
            // изменяем все активные строки. Иначе изменяем только эту строку.
            const rowsToFit = activeRows.has(resizer.index) ? Array.from(activeRows) : [resizer.index];

            setResizer({ ...resizer, mode: 'normal' });
            onRowsAutoFit?.(rowsToFit);
        },
        [resizer, ranges, columnsMetadata.length, setResizer, onRowsAutoFit],
    );

    /**
     * Проверяет попадание точки на resizer с учетом зума
     */
    const isPointOnResizer = useCallback(
        (
            screenX: number,
            screenY: number,
            resizerScreenX: number,
            resizerScreenY: number,
            type: 'column' | 'row',
            tolerance: number = 4,
        ): boolean => {
            if (type === 'column') {
                const handleWidth = 4;
                const handleHeight = 16;

                return (
                    screenX >= resizerScreenX - handleWidth / 2 - tolerance &&
                    screenX <= resizerScreenX + handleWidth / 2 + tolerance &&
                    screenY >= resizerScreenY - handleHeight / 2 - tolerance &&
                    screenY <= resizerScreenY + handleHeight / 2 + tolerance
                );
            }

            // Row resizer
            const handleWidth = 16;
            const handleHeight = 4;

            return (
                screenX >= resizerScreenX - handleWidth / 2 - tolerance &&
                screenX <= resizerScreenX + handleWidth / 2 + tolerance &&
                screenY >= resizerScreenY - handleHeight / 2 - tolerance &&
                screenY <= resizerScreenY + handleHeight / 2 + tolerance
            );
        },
        [],
    );

    // ── onColumn/RowResizerMouseDown/Up, setResizingCursor ──

    const onColumnResizerMouseDown = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>): boolean => {
            if (!resizer || resizer.type !== 'column') return false;
            if (!columnsMetadata.at(resizer.index)) return false;

            if (event.detail === 2) {
                if (columnClickTimerRef.current !== null) {
                    clearTimeout(columnClickTimerRef.current);
                    columnClickTimerRef.current = null;
                }
                onColumnResizeFit(event);
                return true;
            }

            if (event.detail === 1) {
                if (columnClickTimerRef.current !== null) {
                    clearTimeout(columnClickTimerRef.current);
                }
                columnClickTimerRef.current = setTimeout(() => {
                    columnClickTimerRef.current = null;
                    onColumnResizeStart(event);
                }, 100);
                return true;
            }

            return false;
        },
        [columnsMetadata, onColumnResizeFit, onColumnResizeStart, resizer],
    );

    const onColumnResizerMouseUp = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            if (!resizer || resizer.type !== 'column' || resizer.mode !== 'dragging') return;
            onColumnResizeEnd(event);
        },
        [onColumnResizeEnd, resizer],
    );

    const onRowResizerMouseDown = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>): boolean => {
            if (!resizer || resizer.type !== 'row') return false;
            if (!rowsMetadata.at(resizer.index)) return false;

            if (event.detail === 2) {
                if (rowClickTimerRef.current !== null) {
                    clearTimeout(rowClickTimerRef.current);
                    rowClickTimerRef.current = null;
                }
                onRowResizeFit(event);
                return true;
            }

            if (event.detail === 1) {
                if (rowClickTimerRef.current !== null) {
                    clearTimeout(rowClickTimerRef.current);
                }
                rowClickTimerRef.current = setTimeout(() => {
                    rowClickTimerRef.current = null;
                    onRowResizeStart(event);
                }, 100);
                return true;
            }

            return false;
        },
        [rowsMetadata, onRowResizeFit, onRowResizeStart, resizer],
    );

    // ── Очистка таймеров при размонтировании ──────────────────────────────────
    useEffect(
        () => () => {
            if (columnClickTimerRef.current !== null) clearTimeout(columnClickTimerRef.current);
            if (rowClickTimerRef.current !== null) clearTimeout(rowClickTimerRef.current);
        },
        [],
    );

    const onRowResizerMouseUp = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            if (!resizer || resizer.type !== 'row' || resizer.mode !== 'dragging') return;
            onRowResizeEnd(event);
        },
        [onRowResizeEnd, resizer],
    );

    const setResizingCursor = useCallback(
        (
            screenX: number,
            screenY: number,
            ctx: HTMLCanvasElement | null,
            cell: ObjectIndexes,
            headerType: 'row' | 'column' | null,
        ) => {
            if (!ctx) return;
            if (resizer && resizer.mode === 'dragging') return;

            if (headerType === 'column') {
                // Сначала проверяем: попадает ли курсор в зону collapsed-индикатора
                const collapsedColumnIndex = findCollapsedColumnIndicatorByScreenX(
                    screenX,
                    columnsMetadata,
                    camera,
                    hasRowsHeader,
                    ROWS_HEADER_WIDTH,
                    COLLAPSED_INDICATOR_TOLERANCE,
                    columnsMetadata.length,
                );
                if (collapsedColumnIndex !== null) {
                    // Курсор в зоне collapsed-индикатора — ресайз свёрнутого столбца
                    setResizer({
                        index: collapsedColumnIndex,
                        screenOffset: screenX,
                        worldOffset: 0,
                        type: 'column',
                        mode: 'normal',
                    });
                    ctx.style.cursor = 'ew-resize';
                    return;
                }

                // Курсор вне tolerance collapsed-индикатора — ресайз ближайшего видимого столбца
                // Находим ближайший видимый столбец (не свёрнутый)
                let visibleColIndex = cell.columnIndex;
                while (visibleColIndex >= 0 && columnsMetadata.at(visibleColIndex)?.width === 0) {
                    visibleColIndex--;
                }

                const colMeta = visibleColIndex >= 0 ? columnsMetadata.at(visibleColIndex) : null;
                if (colMeta) {
                    const isFrozen = visibleColIndex < frozenColumns;
                    const area: CellArea = isFrozen ? 'frozen-both' : 'frozen-rows';
                    const coordCtx = { camera, hasRowsHeader, hasColumnsHeader, frozenRows, frozenColumns };
                    const resizerY = hasColumnsHeader ? (COLUMNS_HEADER_HEIGHT * camera.z) / 2 : 0;

                    // Находим левую границу текущей колонки
                    const leftEdgeScreenPos = worldToScreen(colMeta.x, 0, area, coordCtx);
                    if (isPointOnResizer(screenX, screenY, leftEdgeScreenPos.x, resizerY, 'column')) {
                        // Ищем предыдущую видимую колонку
                        let prevVisibleColIndex = visibleColIndex - 1;
                        while (prevVisibleColIndex >= 0 && columnsMetadata.at(prevVisibleColIndex)?.width === 0) {
                            prevVisibleColIndex--;
                        }

                        if (prevVisibleColIndex >= 0) {
                            const prevColMeta = columnsMetadata.at(prevVisibleColIndex);
                            const prevWorldX = prevColMeta.x + prevColMeta.width;
                            const prevScreenPos = worldToScreen(prevWorldX, 0, area, coordCtx);

                            setResizer({
                                index: prevVisibleColIndex,
                                screenOffset: prevScreenPos.x,
                                worldOffset: prevWorldX,
                                type: 'column',
                                mode: 'normal',
                            });
                            ctx.style.cursor = 'col-resize';
                            return;
                        }
                    }

                    // Находим правую границу текущей колонки
                    const rightWorldX = colMeta.x + colMeta.width;
                    const rightScreenPos = worldToScreen(rightWorldX, 0, area, coordCtx);

                    if (isPointOnResizer(screenX, screenY, rightScreenPos.x, resizerY, 'column')) {
                        setResizer({
                            index: visibleColIndex,
                            screenOffset: rightScreenPos.x,
                            worldOffset: rightWorldX,
                            type: 'column',
                            mode: 'normal',
                        });
                        ctx.style.cursor = 'col-resize';
                        return;
                    }
                }
            }

            if (headerType === 'row') {
                // Сначала проверяем: попадает ли курсор в зону collapsed-индикатора
                const collapsedRowIndex = findCollapsedRowIndicatorByScreenY(
                    screenY,
                    rowsMetadata,
                    camera,
                    hasColumnsHeader,
                    COLUMNS_HEADER_HEIGHT,
                    COLLAPSED_INDICATOR_TOLERANCE,
                    rowsMetadata.length,
                );
                if (collapsedRowIndex !== null) {
                    // Курсор в зоне collapsed-индикатора — ресайз свёрнутой строки
                    setResizer({
                        index: collapsedRowIndex,
                        screenOffset: screenY,
                        worldOffset: 0,
                        type: 'row',
                        mode: 'normal',
                    });
                    ctx.style.cursor = 'ns-resize';
                    return;
                }

                // Курсор вне tolerance collapsed-индикатора — ресайз ближайшей видимой строки
                let visibleRowIndex = cell.rowIndex;
                while (visibleRowIndex >= 0 && rowsMetadata.at(visibleRowIndex)?.height === 0) {
                    visibleRowIndex--;
                }
                const rowMeta = visibleRowIndex >= 0 ? rowsMetadata.at(visibleRowIndex) : null;
                if (rowMeta) {
                    const isFrozen = visibleRowIndex < frozenRows;
                    const area: CellArea = isFrozen ? 'frozen-both' : 'frozen-columns';
                    const coordCtx = { camera, hasRowsHeader, hasColumnsHeader, frozenRows, frozenColumns };
                    const resizerX = hasRowsHeader ? (ROWS_HEADER_WIDTH * camera.z) / 2 : 0;

                    const topEdgeScreenPos = worldToScreen(0, rowMeta.y, area, coordCtx);
                    if (isPointOnResizer(screenX, screenY, resizerX, topEdgeScreenPos.y, 'row')) {
                        // Ищем предыдущую видимую строку
                        let prevVisibleRowIndex = visibleRowIndex - 1;
                        while (prevVisibleRowIndex >= 0 && rowsMetadata.at(prevVisibleRowIndex)?.height === 0) {
                            prevVisibleRowIndex--;
                        }

                        if (prevVisibleRowIndex >= 0) {
                            const prevRowMeta = rowsMetadata.at(prevVisibleRowIndex);
                            const prevWorldY = prevRowMeta.y + prevRowMeta.height;
                            const prevScreenPos = worldToScreen(0, prevWorldY, area, coordCtx);

                            setResizer({
                                index: prevVisibleRowIndex,
                                screenOffset: prevScreenPos.y,
                                worldOffset: prevWorldY,
                                type: 'row',
                                mode: 'normal',
                            });
                            ctx.style.cursor = 'row-resize';
                            return;
                        }
                    }

                    // Проверка нижнего края текущей строки
                    const bottomWorldY = rowMeta.y + rowMeta.height;
                    const bottomScreenPos = worldToScreen(0, bottomWorldY, area, coordCtx);

                    if (isPointOnResizer(screenX, screenY, resizerX, bottomScreenPos.y, 'row')) {
                        setResizer({
                            index: visibleRowIndex,
                            screenOffset: bottomScreenPos.y,
                            worldOffset: bottomWorldY,
                            type: 'row',
                            mode: 'normal',
                        });
                        ctx.style.cursor = 'row-resize';
                        return;
                    }
                }
            }

            setResizer(null);
            ctx.style.cursor = 'default';
        },
        [
            resizer,
            setResizer,
            columnsMetadata,
            frozenColumns,
            camera,
            hasRowsHeader,
            hasColumnsHeader,
            frozenRows,
            isPointOnResizer,
            rowsMetadata,
        ],
    );

    // document-level listeners (без изменений)
    const handleDocumentMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!resizer || resizer.mode !== 'dragging') return;
            const canvasEvent = {
                clientX: event.clientX,
                clientY: event.clientY,
                currentTarget: overlayRef.current!,
                altKey: event.altKey,
                button: event.button,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
            } as ISpreadsheetMouseEvent;
            if (resizer.type === 'column') onColumnResizeMove(canvasEvent);
            else if (resizer.type === 'row') onRowResizeMove(canvasEvent);
        },
        [onColumnResizeMove, onRowResizeMove, overlayRef, resizer],
    );

    const handleDocumentMouseUp = useCallback(
        (event: MouseEvent) => {
            if (!resizer || resizer.mode !== 'dragging') return;
            const canvasEvent = {
                clientX: event.clientX,
                clientY: event.clientY,
                currentTarget: overlayRef.current!,
                altKey: event.altKey,
                button: event.button,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
            } as ISpreadsheetMouseEvent;
            if (resizer.type === 'column') onColumnResizeEnd(canvasEvent);
            else if (resizer.type === 'row') onRowResizeEnd(canvasEvent);
        },
        [onColumnResizeEnd, onRowResizeEnd, overlayRef, resizer],
    );

    const handleDocumentWheel = useCallback(() => setResizer(null), [setResizer]);

    useEffect(() => {
        document.addEventListener('mousemove', handleDocumentMouseMove);
        document.addEventListener('mouseup', handleDocumentMouseUp);
        document.addEventListener('wheel', handleDocumentWheel, { passive: false });
        return () => {
            document.removeEventListener('mousemove', handleDocumentMouseMove);
            document.removeEventListener('mouseup', handleDocumentMouseUp);
            document.removeEventListener('wheel', handleDocumentWheel);
        };
    }, [handleDocumentMouseMove, handleDocumentMouseUp, handleDocumentWheel]);

    return {
        isPointOnResizer,
        setResizingCursor,
        onColumnResizeStart,
        onColumnResizeMove,
        onColumnResizeEnd,
        onColumnResizeFit,
        onRowResizeStart,
        onRowResizeMove,
        onRowResizeEnd,
        onRowResizeFit,
        onColumnResizerMouseDown,
        onColumnResizerMouseUp,
        onRowResizerMouseDown,
        onRowResizerMouseUp,
    };
};
