import { useCallback, useContext, useMemo } from 'react';

import { Range } from '../../../AdapterSpreadSheet/models';
import { drawSelection } from '../components/Canvas/components/selection';
import { CanvasSpreadSheetContext } from '../context';
import { ViewportCacheContext } from '../context/ViewportCacheContext';
import { getCSSColor } from '../utils';
import { applyClipRegion, calculateClipBoundaries } from '../utils/clipBoundaries';
import { CellArea, getCellArea } from '../utils/coordinates';
import { applyTransform, createCellTransform } from '../utils/transform';
import { useFillHandleRendering } from './useFillHandleRendering.hook';

export const useSelectionRendering = () => {
    const {
        ranges,
        rangesStyles,
        cursor,
        columnsMetadata,
        rowsMetadata,
        theme,
        camera,
        hasRowsHeader,
        hasColumnsHeader,
        frozenRows,
        frozenColumns,
        width,
        height,
    } = useContext(CanvasSpreadSheetContext);

    const viewportCache = useContext(ViewportCacheContext);

    const { renderFillHandle, renderFillDraggingIndicator } = useFillHandleRendering();

    const clipBoundaries = useMemo(
        () =>
            calculateClipBoundaries(
                camera,
                frozenRows,
                frozenColumns,
                rowsMetadata,
                columnsMetadata,
                hasRowsHeader,
                hasColumnsHeader,
                width,
                height,
            ),
        [camera, frozenRows, frozenColumns, rowsMetadata, columnsMetadata, hasRowsHeader, hasColumnsHeader, width, height],
    );

    /**
     * Получает world координаты ячейки
     */
    const getCellWorldCoords = useCallback(
        (rowIndex: number, columnIndex: number): { x: number; y: number; width: number; height: number } | null => {
            const rowMeta = rowsMetadata.at(rowIndex);
            const colMeta = columnsMetadata.at(columnIndex);

            if (!rowMeta || !colMeta) return null;

            return {
                x: colMeta.x,
                y: rowMeta.y,
                width: colMeta.width,
                height: rowMeta.height,
            };
        },
        [rowsMetadata, columnsMetadata],
    );

    /**
     * Получает world координаты range
     */
    const getRangeWorldCoords = useCallback(
        (range: any) => {
            const { topLeft, bottomRight } = range;

            const startRow = rowsMetadata.at(topLeft.coordinates.rowIndex);
            const startCol = columnsMetadata.at(topLeft.coordinates.columnIndex);
            const endRow = rowsMetadata.at(bottomRight.coordinates.rowIndex);
            const endCol = columnsMetadata.at(bottomRight.coordinates.columnIndex);

            if (!startRow || !startCol || !endRow || !endCol) return null;

            return {
                x: startCol.x,
                y: startRow.y,
                width: endCol.x + endCol.width - startCol.x,
                height: endRow.y + endRow.height - startRow.y,
            };
        },
        [rowsMetadata, columnsMetadata],
    );

    /**
     * Проверяет пересечение range с viewport области
     */
    const rangeIntersectsViewport = useCallback(
        (range: any, vp: { minRowIndex: number; maxRowIndex: number; minColumnIndex: number; maxColumnIndex: number }) => {
            const { topLeft, bottomRight } = range;

            return !(
                bottomRight.coordinates.rowIndex < vp.minRowIndex ||
                topLeft.coordinates.rowIndex > vp.maxRowIndex ||
                bottomRight.coordinates.columnIndex < vp.minColumnIndex ||
                topLeft.coordinates.columnIndex > vp.maxColumnIndex
            );
        },
        [],
    );

    /**
     * Рендерит range в области
     */
    const renderRangeInArea = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            range: Range,
            area: CellArea,
            vp: { minRowIndex: number; maxRowIndex: number; minColumnIndex: number; maxColumnIndex: number },
            clip: { x: number; y: number; width: number; height: number } | null,
            timestamp = 0,
        ) => {
            if (!clip || clip.width <= 0 || clip.height <= 0) return;
            if (!rangeIntersectsViewport(range, vp)) return;

            const rangeCoords = getRangeWorldCoords(range);
            if (!rangeCoords) return;

            const rangeStyles = rangesStyles[range.toString()];

            if (!viewportCache) return;
            const { joinedCellsIndex } = viewportCache;

            ctx.save();
            applyClipRegion(ctx, clip);

            const transform = createCellTransform(area, camera, hasRowsHeader, hasColumnsHeader);
            applyTransform(ctx, transform);

            const intersectionBounds = {
                minRow: Math.max(range.topLeft.coordinates.rowIndex, vp.minRowIndex),
                maxRow: Math.min(range.bottomRight.coordinates.rowIndex, vp.maxRowIndex),
                minColumn: Math.max(range.topLeft.coordinates.columnIndex, vp.minColumnIndex),
                maxColumn: Math.min(range.bottomRight.coordinates.columnIndex, vp.maxColumnIndex),
            };

            const hasCursorInRange =
                cursor &&
                range.contains(cursor.cell) &&
                cursor.cell.coordinates.rowIndex >= intersectionBounds.minRow &&
                cursor.cell.coordinates.rowIndex <= intersectionBounds.maxRow &&
                cursor.cell.coordinates.columnIndex >= intersectionBounds.minColumn &&
                cursor.cell.coordinates.columnIndex <= intersectionBounds.maxColumn;

            ctx.globalAlpha = rangeStyles?.backgroundOpacity ?? 1;
            ctx.fillStyle = getCSSColor(rangeStyles?.backgroundColor ?? theme.selectedRangeBg) as string;

            // Заливка фона
            if (!hasCursorInRange) {
                const visStartRow = rowsMetadata.at(intersectionBounds.minRow);
                const visStartCol = columnsMetadata.at(intersectionBounds.minColumn);
                const visEndRow = rowsMetadata.at(intersectionBounds.maxRow);
                const visEndCol = columnsMetadata.at(intersectionBounds.maxColumn);

                if (visStartRow && visStartCol && visEndRow && visEndCol) {
                    const visWidth = visEndCol.x + visEndCol.width - visStartCol.x;
                    const visHeight = visEndRow.y + visEndRow.height - visStartRow.y;

                    ctx.fillRect(visStartCol.x, visStartRow.y, visWidth, visHeight);
                }
            } else {
                for (let rowIndex = intersectionBounds.minRow; rowIndex <= intersectionBounds.maxRow; rowIndex++) {
                    for (
                        let columnIndex = intersectionBounds.minColumn;
                        columnIndex <= intersectionBounds.maxColumn;
                        columnIndex++
                    ) {
                        if (
                            cursor.cell.coordinates.rowIndex === rowIndex &&
                            cursor.cell.coordinates.columnIndex === columnIndex
                        ) {
                            continue;
                        }

                        // ОПТИМИЗАЦИЯ: O(1) вместо O(n)
                        const joinedCell = joinedCellsIndex.get(rowIndex, columnIndex);

                        // Пропускаем не-главные ячейки
                        if (joinedCell && !joinedCellsIndex.isMainCell(rowIndex, columnIndex)) {
                            continue;
                        }

                        let cellCoords;
                        if (joinedCell) {
                            cellCoords = getRangeWorldCoords(joinedCell.range);
                        } else {
                            cellCoords = getCellWorldCoords(rowIndex, columnIndex);
                        }

                        if (cellCoords) {
                            ctx.fillRect(cellCoords.x, cellCoords.y, cellCoords.width, cellCoords.height);
                        }
                    }
                }
            }

            ctx.globalAlpha = 1;

            // rangeStyles?.backgroundOpacity;
            // Граница range
            drawSelection(ctx, {
                x: rangeCoords.x,
                y: rangeCoords.y,
                width: rangeCoords.width,
                height: rangeCoords.height,
                borderColor: getCSSColor(rangeStyles?.borderColor ?? theme.activeСellBorderColor) as string,
                animated: rangeStyles?.animated,
                borderStyle: rangeStyles?.borderStyle,
                timestamp,
            });

            ctx.restore();
        },
        [
            rangeIntersectsViewport,
            getRangeWorldCoords,
            rangesStyles,
            camera,
            hasRowsHeader,
            hasColumnsHeader,
            cursor,
            theme.activeСellBorderColor,
            theme.selectedRangeBg,
            rowsMetadata,
            columnsMetadata,
            viewportCache,
            getCellWorldCoords,
        ],
    );

    /**
     * Рендерит все выделенные ranges
     */
    const renderSelectedRanges = useCallback(
        (ctx: CanvasRenderingContext2D, timestamp = 0) => {
            if (!ranges.length || !viewportCache) return;

            const { viewports } = viewportCache;
            const areas: Array<{ area: CellArea; vp: any; clip: any }> = [
                { area: 'frozen-both', vp: viewports['frozen-both'], clip: clipBoundaries['frozen-both'] },
                { area: 'frozen-rows', vp: viewports['frozen-rows'], clip: clipBoundaries['frozen-rows'] },
                { area: 'frozen-columns', vp: viewports['frozen-columns'], clip: clipBoundaries['frozen-columns'] },
                { area: 'scrollable', vp: viewports.scrollable, clip: clipBoundaries.scrollable },
            ];

            for (const range of ranges) {
                for (const { area, vp, clip } of areas) {
                    if (!vp || !clip) continue;
                    renderRangeInArea(ctx, range, area, vp, clip, timestamp);
                }
            }
        },
        [ranges, viewportCache, renderRangeInArea, clipBoundaries],
    );

    /**
     * Рендерит активную ячейку (cursor)
     */
    const renderActiveCell = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!cursor || !viewportCache) return;
            if (ranges.some((r) => r.contains(cursor.cell))) return;

            const { rowIndex, columnIndex } = cursor.cell.coordinates;
            const area = getCellArea(rowIndex, columnIndex, frozenRows, frozenColumns);

            const vp = viewportCache.viewports[area];
            if (!vp) return;

            const clip = clipBoundaries[area];
            if (!clip || clip.width <= 0 || clip.height <= 0) return;

            if (
                rowIndex < vp.minRowIndex ||
                rowIndex > vp.maxRowIndex ||
                columnIndex < vp.minColumnIndex ||
                columnIndex > vp.maxColumnIndex
            ) {
                return;
            }

            const joinedCell = viewportCache.joinedCellsIndex.get(rowIndex, columnIndex);

            let cellCoords;
            if (joinedCell) {
                cellCoords = getRangeWorldCoords(joinedCell.range);
            } else {
                cellCoords = getCellWorldCoords(rowIndex, columnIndex);
            }

            if (!cellCoords) return;

            ctx.save();
            applyClipRegion(ctx, clip);

            const transform = createCellTransform(area, camera, hasRowsHeader, hasColumnsHeader);
            applyTransform(ctx, transform);

            drawSelection(ctx, {
                x: cellCoords.x,
                y: cellCoords.y,
                width: cellCoords.width,
                height: cellCoords.height,
                borderColor: getCSSColor(theme.activeСellBorderColor) as string,
            });

            ctx.restore();
        },
        [
            cursor,
            ranges,
            viewportCache,
            getCellWorldCoords,
            getRangeWorldCoords,
            theme,
            frozenRows,
            frozenColumns,
            camera,
            hasRowsHeader,
            hasColumnsHeader,
            clipBoundaries,
        ],
    );

    /**
     * Главная функция рендеринга selection
     */
    const renderSelection = useCallback(
        (canvas: HTMLCanvasElement | null, timestamp = 0) => {
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Рендерим выделенные диапазоны
            renderSelectedRanges(ctx, timestamp);

            // Рендерим активную ячейку
            renderActiveCell(ctx);

            // Рендерим индикатор при протягивании fill handle
            renderFillDraggingIndicator(ctx);

            // Рендерим сам fill handle (квадратик)
            renderFillHandle(ctx);
        },
        [renderSelectedRanges, renderActiveCell, renderFillDraggingIndicator, renderFillHandle],
    );

    return renderSelection;
};
