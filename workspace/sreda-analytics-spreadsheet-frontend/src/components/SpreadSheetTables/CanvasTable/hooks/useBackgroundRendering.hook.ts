import { useCallback, useContext, useMemo } from 'react';

import { IGradientColor } from '../../../AdapterSpreadSheet/types';
import { CanvasSpreadSheetContext } from '../context';
import { ViewportCacheContext } from '../context/ViewportCacheContext';
import { drawGradient, getCSSColor } from '../utils';
import { applyClipRegion, calculateClipBoundaries } from '../utils/clipBoundaries';
import { CellArea } from '../utils/coordinates';
import { applyTransform, createCellTransform } from '../utils/transform';

export const useBackgroundRendering = () => {
    const {
        rowsMetadata,
        columnsMetadata,
        theme,
        getCellStyle,
        camera,
        hasRowsHeader,
        hasColumnsHeader,
        frozenRows,
        frozenColumns,
        width,
        height,
    } = useContext(CanvasSpreadSheetContext);

    const viewportCache = useContext(ViewportCacheContext);

    const colors = useMemo(
        () => ({
            bgColor: getCSSColor(theme.bgColor),
            evenRowsBg: getCSSColor(theme.evenRowsCellBg ?? theme.bgColor),
            oddRowsBg: getCSSColor(theme.oddRowsCellBg ?? theme.bgColor),
            borderColor: getCSSColor(theme.borderColor ?? ''),
        }),
        [theme],
    );

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

    const renderMainBackground = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            ctx.save();
            ctx.fillStyle = colors.bgColor as string;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        },
        [colors.bgColor, width, height],
    );

    const renderRowBackgrounds = useCallback(
        (ctx: CanvasRenderingContext2D, minRow: number, maxRow: number, minCol: number, maxCol: number, area: CellArea) => {
            if (!colors.evenRowsBg && !colors.oddRowsBg) return;
            if (minRow < 0 || maxRow < 0 || minCol < 0 || maxCol < 0) return;

            const startCol = columnsMetadata.at(minCol);
            const endCol = columnsMetadata.at(maxCol);
            if (!startCol || !endCol) return;

            const areaX = startCol.x;
            const areaWidth = endCol.x + endCol.width - startCol.x;

            ctx.save();

            // Четные строки
            if (colors.evenRowsBg && typeof colors.evenRowsBg === 'string') {
                ctx.fillStyle = colors.evenRowsBg;
                ctx.beginPath();
                for (let i = minRow; i <= maxRow; i++) {
                    if ((i + 1) % 2 === 0) {
                        const row = rowsMetadata.at(i);
                        if (row) ctx.rect(areaX, row.y, areaWidth, row.height);
                    }
                }
                ctx.fill();
            }

            // Нечетные строки
            if (colors.oddRowsBg && colors.oddRowsBg !== colors.evenRowsBg && typeof colors.oddRowsBg === 'string') {
                ctx.fillStyle = colors.oddRowsBg;
                ctx.beginPath();
                for (let i = minRow; i <= maxRow; i++) {
                    if ((i + 1) % 2 !== 0) {
                        const row = rowsMetadata.at(i);
                        if (row) ctx.rect(areaX, row.y, areaWidth, row.height);
                    }
                }
                ctx.fill();
            }

            ctx.restore();
        },
        [colors, rowsMetadata, columnsMetadata],
    );

    const groupCellsByStyle = useCallback(
        (minRow: number, maxRow: number, minCol: number, maxCol: number, area: CellArea) => {
            const styleGroups = new Map<string, Array<{ x: number; y: number; width: number; height: number }>>();

            if (!viewportCache) return styleGroups;
            const { joinedCellsIndex: jcIndex } = viewportCache;

            const totalCells = (maxRow - minRow + 1) * (maxCol - minCol + 1);
            if (totalCells > 2000 && localStorage.getItem('DBG_PERF') === '1') {
                console.warn(`⚠️ groupCellsByStyle: Many cells (${totalCells})`);
            }

            for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
                const rowMeta = rowsMetadata.at(rowIndex);
                if (!rowMeta) continue;

                for (let columnIndex = minCol; columnIndex <= maxCol; columnIndex++) {
                    const colMeta = columnsMetadata.at(columnIndex);
                    if (!colMeta) continue;

                    const jc = jcIndex.get(rowIndex, columnIndex);

                    if (jc && !jcIndex.isMainCell(rowIndex, columnIndex)) {
                        continue;
                    }

                    const styles = getCellStyle(
                        jc ? jc.mainCell.coordinates.rowIndex : rowIndex,
                        jc ? jc.mainCell.coordinates.columnIndex : columnIndex,
                    );

                    let cellCoords;
                    if (jc) {
                        const startRow = rowsMetadata.at(jc.topLeft.coordinates.rowIndex);
                        const startCol = columnsMetadata.at(jc.topLeft.coordinates.columnIndex);
                        const endRow = rowsMetadata.at(jc.bottomRight.coordinates.rowIndex);
                        const endCol = columnsMetadata.at(jc.bottomRight.coordinates.columnIndex);

                        if (!startRow || !startCol || !endRow || !endCol) continue;

                        cellCoords = {
                            x: startCol.x,
                            y: startRow.y,
                            width: endCol.x + endCol.width - startCol.x,
                            height: endRow.y + endRow.height - startRow.y,
                        };
                    } else {
                        cellCoords = {
                            x: colMeta.x,
                            y: rowMeta.y,
                            width: colMeta.width,
                            height: rowMeta.height,
                        };
                    }

                    const styleKey = `${styles?.backgroundColor || ''}|${styles?.borderColor || ''}`;

                    if (!styleGroups.has(styleKey)) {
                        styleGroups.set(styleKey, []);
                    }

                    styleGroups.get(styleKey)!.push(cellCoords);
                }
            }

            return styleGroups;
        },
        [viewportCache, rowsMetadata, columnsMetadata],
    );

    const renderCellBackgrounds = useCallback(
        (ctx: CanvasRenderingContext2D, minRow: number, maxRow: number, minCol: number, maxCol: number, area: CellArea) => {
            const styleGroups = groupCellsByStyle(minRow, maxRow, minCol, maxCol, area);

            ctx.save();

            // Группируем по типу операции для батчинга
            const solidFills: Array<{ color: string; rects: any[] }> = [];
            const gradientFills: Array<{ gradient: IGradientColor; rects: any[] }> = [];
            const borders: Array<{ color: string; rects: any[] }> = [];

            styleGroups.forEach((cells, styleKey) => {
                const [bgColor, borderColor] = styleKey.split('|');

                const backgroundColor = bgColor ? getCSSColor(bgColor) : undefined;
                const borderColorParsed = borderColor
                    ? getCSSColor(borderColor || colors.borderColor || '')
                    : colors.borderColor;

                if (backgroundColor) {
                    if (typeof backgroundColor === 'string') {
                        solidFills.push({ color: backgroundColor, rects: cells });
                    } else {
                        gradientFills.push({ gradient: backgroundColor as IGradientColor, rects: cells });
                    }
                }

                if (borderColorParsed && typeof borderColorParsed === 'string') {
                    borders.push({ color: borderColorParsed, rects: cells });
                }
            });

            for (const { color, rects } of solidFills) {
                ctx.fillStyle = color;
                ctx.beginPath();
                for (const { x, y, width, height } of rects) {
                    ctx.rect(x, y, width, height);
                }
                ctx.fill();
            }

            // Градиенты рисуем отдельно
            for (const { gradient, rects } of gradientFills) {
                for (const { x, y, width, height } of rects) {
                    const grad = drawGradient(ctx, gradient, x, y, width, height);
                    ctx.fillStyle = grad;
                    ctx.fillRect(x, y, width, height);
                }
            }

            for (const { color, rects } of borders) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (const { x, y, width, height } of rects) {
                    ctx.rect(x, y, width, height);
                }
                ctx.stroke();
            }

            ctx.restore();
        },
        [groupCellsByStyle, colors.borderColor],
    );

    const renderArea = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            area: CellArea,
            vp: { minRowIndex: number; maxRowIndex: number; minColumnIndex: number; maxColumnIndex: number } | null,
            clip: { x: number; y: number; width: number; height: number } | null,
        ) => {
            if (!vp || !clip) return;
            if (clip.width <= 0 || clip.height <= 0) return;

            ctx.save();
            applyClipRegion(ctx, clip);

            const transform = createCellTransform(area, camera, hasRowsHeader, hasColumnsHeader);
            applyTransform(ctx, transform);

            renderRowBackgrounds(ctx, vp.minRowIndex, vp.maxRowIndex, vp.minColumnIndex, vp.maxColumnIndex, area);
            renderCellBackgrounds(ctx, vp.minRowIndex, vp.maxRowIndex, vp.minColumnIndex, vp.maxColumnIndex, area);

            ctx.restore();
        },
        [camera, hasRowsHeader, hasColumnsHeader, renderRowBackgrounds, renderCellBackgrounds],
    );

    const renderBackground = useCallback(
        (canvas: HTMLCanvasElement | null) => {
            if (!canvas || !viewportCache) return;

            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) return;

            const { viewports } = viewportCache;

            renderMainBackground(ctx);

            renderArea(ctx, 'frozen-both', viewports['frozen-both'], clipBoundaries['frozen-both']);
            renderArea(ctx, 'frozen-rows', viewports['frozen-rows'], clipBoundaries['frozen-rows']);
            renderArea(ctx, 'frozen-columns', viewports['frozen-columns'], clipBoundaries['frozen-columns']);
            renderArea(ctx, 'scrollable', viewports.scrollable, clipBoundaries.scrollable);
        },
        [viewportCache, renderMainBackground, renderArea, clipBoundaries],
    );

    return renderBackground;
};
