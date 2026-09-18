import { useCallback, useContext } from 'react';

import { drawResizer } from '../components/Canvas/components/resizer';
import { COLUMNS_HEADER_HEIGHT, ROWS_HEADER_WIDTH } from '../const';
import { CanvasSpreadSheetContext } from '../context';
import { ViewportCacheContext } from '../context/ViewportCacheContext';
import { CellArea, worldToScreen } from '../utils/coordinates';

export const useOverlayRendering = () => {
    const {
        cursor,
        resizer,
        columnsMetadata,
        rowsMetadata,
        hasColumnsHeader,
        hasRowsHeader,
        camera,
        theme,
        rowGroups,
        columnGroups,
        frozenRows,
        frozenColumns,
    } = useContext(CanvasSpreadSheetContext);

    const viewportCache = useContext(ViewportCacheContext);

    /**
     * Рендерит resizers в screen space
     */
    const renderResizers = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            // Column resizer
            if (resizer && resizer.type === 'column') {
                const { index, mode, worldOffset } = resizer;
                const colMeta = columnsMetadata.at(index);
                if (!colMeta) return;

                const isFrozen = index < frozenColumns;
                const area: CellArea = isFrozen ? 'frozen-both' : 'frozen-rows';

                // Используем canvasLeftOffset для текущей позиции при dragging
                const worldX = mode === 'dragging' ? worldOffset : colMeta.x + colMeta.width;

                const coordCtx = {
                    camera,
                    hasRowsHeader,
                    hasColumnsHeader,
                    frozenRows,
                    frozenColumns,
                };

                const screenPos = worldToScreen(worldX, 0, area, coordCtx);
                const { x } = screenPos;
                const y = hasColumnsHeader ? (COLUMNS_HEADER_HEIGHT * camera.z) / 2 : 0;

                drawResizer(ctx, {
                    x,
                    y,
                    type: 'column',
                    mode,
                    height: ctx.canvas.height,
                    resizerColor: theme.columnResizerBg,
                    indicatorColor: theme.columnResizerIndicatorBg,
                });
            }

            // Row resizer
            if (resizer && resizer.type === 'row') {
                const { index, mode, worldOffset } = resizer;
                const rowMeta = rowsMetadata.at(index);
                if (!rowMeta) return;

                const isFrozen = index < frozenRows;
                const area: CellArea = isFrozen ? 'frozen-both' : 'frozen-columns';

                const worldY = mode === 'dragging' ? worldOffset : rowMeta.y + rowMeta.height;

                const coordCtx = {
                    camera,
                    hasRowsHeader,
                    hasColumnsHeader,
                    frozenRows,
                    frozenColumns,
                };

                const screenPos = worldToScreen(0, worldY, area, coordCtx);
                const x = hasRowsHeader ? (ROWS_HEADER_WIDTH * camera.z) / 2 : 0;
                const { y } = screenPos;

                drawResizer(ctx, {
                    x,
                    y,
                    type: 'row',
                    mode,
                    width: ctx.canvas.width,
                    resizerColor: theme.rowResizerBg,
                    indicatorColor: theme.rowResizerIndicatorBg,
                });
            }
        },
        [resizer, columnsMetadata, rowsMetadata, hasColumnsHeader, hasRowsHeader, theme, camera, frozenRows, frozenColumns],
    );

    /**
     * Рендерит индикаторы группировки
     */
    const renderGroupIndicators = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!viewportCache) return;

            ctx.save();
            ctx.strokeStyle = '#4a90e2';
            ctx.lineWidth = 2;

            const headersOffsetX = (hasRowsHeader ? ROWS_HEADER_WIDTH : 0) * camera.z;
            const headersOffsetY = (hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0) * camera.z;

            const coordCtx = {
                camera,
                hasRowsHeader,
                hasColumnsHeader,
                frozenRows,
                frozenColumns,
            };

            // Row groups
            rowGroups.forEach((group) => {
                const startRow = rowsMetadata.at(group.start);
                const endRow = rowsMetadata.at(group.end);
                if (!startRow || !endRow) return;

                const area: CellArea = group.end < frozenRows ? 'frozen-both' : 'scrollable';

                const startScreen = worldToScreen(0, startRow.y, area, coordCtx);
                const endScreen = worldToScreen(0, endRow.y + endRow.height, area, coordCtx);

                const x = headersOffsetX - 15 * camera.z;
                const startY = startScreen.y;
                const endY = endScreen.y;
                const centerY = (startY + endY) / 2;

                // Линии группы
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x + 10 * camera.z, startY);
                ctx.moveTo(x, endY);
                ctx.lineTo(x + 10 * camera.z, endY);
                ctx.moveTo(x, startY);
                ctx.lineTo(x, endY);
                ctx.stroke();

                // Кнопка
                ctx.fillStyle = '#4a90e2';
                ctx.beginPath();
                ctx.arc(x + 5 * camera.z, centerY, 8 * camera.z, 0, Math.PI * 2);
                ctx.fill();

                // Иконка
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2 * camera.z;
                ctx.beginPath();
                if (group.collapsed) {
                    ctx.moveTo(x + 1 * camera.z, centerY);
                    ctx.lineTo(x + 9 * camera.z, centerY);
                    ctx.moveTo(x + 5 * camera.z, centerY - 4 * camera.z);
                    ctx.lineTo(x + 5 * camera.z, centerY + 4 * camera.z);
                } else {
                    ctx.moveTo(x + 1 * camera.z, centerY);
                    ctx.lineTo(x + 9 * camera.z, centerY);
                }
                ctx.stroke();
            });

            // Column groups
            columnGroups.forEach((group) => {
                const startCol = columnsMetadata.at(group.start);
                const endCol = columnsMetadata.at(group.end);
                if (!startCol || !endCol) return;

                const area: CellArea = group.end < frozenColumns ? 'frozen-both' : 'scrollable';

                const startScreen = worldToScreen(startCol.x, 0, area, coordCtx);
                const endScreen = worldToScreen(endCol.x + endCol.width, 0, area, coordCtx);

                const startX = startScreen.x;
                const endX = endScreen.x;
                const centerX = (startX + endX) / 2;
                const y = headersOffsetY - 15 * camera.z;

                // Линии группы
                ctx.beginPath();
                ctx.moveTo(startX, y);
                ctx.lineTo(startX, y + 10 * camera.z);
                ctx.moveTo(endX, y);
                ctx.lineTo(endX, y + 10 * camera.z);
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
                ctx.stroke();

                // Кнопка
                ctx.fillStyle = '#4a90e2';
                ctx.beginPath();
                ctx.arc(centerX, y + 5 * camera.z, 8 * camera.z, 0, Math.PI * 2);
                ctx.fill();

                // Иконка
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2 * camera.z;
                ctx.beginPath();
                if (group.collapsed) {
                    ctx.moveTo(centerX - 4 * camera.z, y + 5 * camera.z);
                    ctx.lineTo(centerX + 4 * camera.z, y + 5 * camera.z);
                    ctx.moveTo(centerX, y + 1 * camera.z);
                    ctx.lineTo(centerX, y + 9 * camera.z);
                } else {
                    ctx.moveTo(centerX - 4 * camera.z, y + 5 * camera.z);
                    ctx.lineTo(centerX + 4 * camera.z, y + 5 * camera.z);
                }
                ctx.stroke();
            });

            ctx.restore();
        },
        [
            viewportCache,
            rowGroups,
            columnGroups,
            rowsMetadata,
            columnsMetadata,
            hasRowsHeader,
            hasColumnsHeader,
            frozenRows,
            frozenColumns,
            camera,
        ],
    );

    /**
     * Debug информация
     */
    const renderDebugInfo = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (localStorage.getItem('DBG_CVS_MONITOR') !== '1') return;

            ctx.save();
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            const rows = [
                `DPR: ${window.devicePixelRatio}`,
                `Zoom: ${(camera.z * 100).toFixed(0)}%`,
                `Camera: X=${camera.x.toFixed(1)} Y=${camera.y.toFixed(1)}`,
                `Frozen: R=${frozenRows} C=${frozenColumns}`,
            ];

            if (cursor) {
                rows.push(`Cursor: R${cursor.cell.coordinates.rowIndex} C${cursor.cell.coordinates.columnIndex}`);
            }

            if (viewportCache) {
                const { viewports, frozenAreas } = viewportCache;
                rows.push('--- Frozen Areas ---');
                rows.push(`Width: ${frozenAreas.width.toFixed(1)}`);
                rows.push(`Height: ${frozenAreas.height.toFixed(1)}`);
                rows.push('--- Scrollable ---');
                rows.push(`Rows: ${viewports.scrollable.minRowIndex}-${viewports.scrollable.maxRowIndex}`);
                rows.push(`Cols: ${viewports.scrollable.minColumnIndex}-${viewports.scrollable.maxColumnIndex}`);
            }

            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(5, 5, 300, rows.length * 18 + 10);

            ctx.fillStyle = '#00ff00';
            rows.forEach((row, i) => {
                ctx.fillText(row, 10, 10 + i * 18);
            });

            ctx.restore();
        },
        [camera, cursor, frozenRows, frozenColumns, viewportCache],
    );

    /**
     * Главная функция рендеринга overlay
     */
    const renderOverlay = useCallback(
        (canvas: HTMLCanvasElement | null) => {
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            renderResizers(ctx);
            renderGroupIndicators(ctx);
            renderDebugInfo(ctx);
        },
        [renderResizers, renderGroupIndicators, renderDebugInfo],
    );

    return renderOverlay;
};
