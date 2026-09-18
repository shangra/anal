import { useCallback, useContext, useMemo } from 'react';

import { IGradientColor } from '../../../AdapterSpreadSheet/types';
import { COLUMNS_HEADER_HEIGHT, ROWS_HEADER_WIDTH } from '../const';
import { CanvasSpreadSheetContext } from '../context';
import { ViewportCacheContext } from '../context/ViewportCacheContext';
import { drawGradient, generateTitleFromOrderNumber, getCSSColor } from '../utils';
import { applyClipRegion } from '../utils/clipBoundaries';
import { getCollapsedColumnIndicatorPosition, getCollapsedRowIndicatorPosition } from '../utils/collapsedIndicators';
import { applyTransform, createHeaderTransform } from '../utils/transform';

export const useHeadersRendering = () => {
    const {
        rowsMetadata,
        columnsMetadata,
        hasColumnsHeader,
        hasRowsHeader,
        theme,
        ranges,
        rowsAmount,
        columnsAmount,
        camera,
        frozenRows,
        frozenColumns,
        width,
        height,
    } = useContext(CanvasSpreadSheetContext);

    const viewportCache = useContext(ViewportCacheContext);

    const colors = useMemo(
        () => ({
            headerBg: getCSSColor(theme.headerCellBg),
            headerActiveBg: getCSSColor(theme.headerCellActiveBg),
            headerAltBg: getCSSColor(theme.headerCellAltBg),
            borderColor: getCSSColor(theme.oddRowsCellBorderColor ?? theme.borderColor),
            color: getCSSColor(theme.evenRowsCellColor ?? theme.color),
            frozenDividerColor: '#2196F3',
            cmpSecondaryColor: getCSSColor(theme.cmpSecondaryColor ?? theme.cmpColor),
        }),
        [theme],
    );

    const headerClipBoundaries = useMemo(() => {
        const headersWidthScreen = (hasRowsHeader ? ROWS_HEADER_WIDTH : 0) * camera.z;
        const headersHeightScreen = (hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0) * camera.z;

        const frozenAreas = viewportCache?.frozenAreas || { width: 0, height: 0 };
        const frozenWidthScreen = frozenAreas.width * camera.z;
        const frozenHeightScreen = frozenAreas.height * camera.z;

        return {
            root:
                hasRowsHeader && hasColumnsHeader
                    ? {
                          x: 0,
                          y: 0,
                          width: headersWidthScreen,
                          height: headersHeightScreen,
                      }
                    : null,
            rowsFrozen:
                hasRowsHeader && frozenRows > 0
                    ? {
                          x: 0,
                          y: headersHeightScreen,
                          width: headersWidthScreen,
                          height: frozenHeightScreen,
                      }
                    : null,
            rowsScrollable: hasRowsHeader
                ? {
                      x: 0,
                      y: headersHeightScreen + frozenHeightScreen,
                      width: headersWidthScreen,
                      height: Math.max(0, height - headersHeightScreen - frozenHeightScreen),
                  }
                : null,
            columnsFrozen:
                hasColumnsHeader && frozenColumns > 0
                    ? {
                          x: headersWidthScreen,
                          y: 0,
                          width: frozenWidthScreen,
                          height: headersHeightScreen,
                      }
                    : null,
            columnsScrollable: hasColumnsHeader
                ? {
                      x: headersWidthScreen + frozenWidthScreen,
                      y: 0,
                      width: Math.max(0, width - headersWidthScreen - frozenWidthScreen),
                      height: headersHeightScreen,
                  }
                : null,
        };
    }, [hasRowsHeader, hasColumnsHeader, frozenRows, frozenColumns, camera, viewportCache, width, height]);

    /**
     * Быстрая проверка активности строки БЕЗ цикла
     */
    const isRowActive = useCallback(
        (rowIndex: number): boolean => {
            // Проверяем только если есть выделение
            if (!ranges.length) return false;

            // Оптимизация: проверяем только первый range (обычно один)
            if (ranges.length === 1) {
                const range = ranges[0];
                return (
                    range.topLeft.coordinates.rowIndex <= rowIndex &&
                    range.bottomRight.coordinates.rowIndex >= rowIndex &&
                    range.topLeft.coordinates.columnIndex === 0 &&
                    range.bottomRight.coordinates.columnIndex === columnsAmount - 1
                );
            }

            // Для множественного выделения - полная проверка
            return ranges.some(
                (range) =>
                    range.topLeft.coordinates.rowIndex <= rowIndex &&
                    range.bottomRight.coordinates.rowIndex >= rowIndex &&
                    range.topLeft.coordinates.columnIndex === 0 &&
                    range.bottomRight.coordinates.columnIndex === columnsAmount - 1,
            );
        },
        [ranges, columnsAmount],
    );

    /**
     * Быстрая проверка активности колонки БЕЗ цикла
     */
    const isColumnActive = useCallback(
        (columnIndex: number): boolean => {
            if (!ranges.length) return false;

            if (ranges.length === 1) {
                const range = ranges[0];
                return (
                    range.topLeft.coordinates.columnIndex <= columnIndex &&
                    range.bottomRight.coordinates.columnIndex >= columnIndex &&
                    range.topLeft.coordinates.rowIndex === 0 &&
                    range.bottomRight.coordinates.rowIndex === rowsAmount - 1
                );
            }

            return ranges.some(
                (range) =>
                    range.topLeft.coordinates.columnIndex <= columnIndex &&
                    range.bottomRight.coordinates.columnIndex >= columnIndex &&
                    range.topLeft.coordinates.rowIndex === 0 &&
                    range.bottomRight.coordinates.rowIndex === rowsAmount - 1,
            );
        },
        [ranges, rowsAmount],
    );

    /**
     * Проверка alt состояния (частично выделен)
     */
    const isRowAlt = useCallback(
        (rowIndex: number): boolean => {
            if (!ranges.length) return false;

            return ranges.some(
                (range) =>
                    range.topLeft.coordinates.rowIndex <= rowIndex &&
                    range.bottomRight.coordinates.rowIndex >= rowIndex &&
                    // НЕ весь диапазон колонок
                    !(
                        range.topLeft.coordinates.columnIndex === 0 &&
                        range.bottomRight.coordinates.columnIndex === columnsAmount - 1
                    ),
            );
        },
        [ranges, columnsAmount],
    );

    const isColumnAlt = useCallback(
        (columnIndex: number): boolean => {
            if (!ranges.length) return false;

            return ranges.some(
                (range) =>
                    range.topLeft.coordinates.columnIndex <= columnIndex &&
                    range.bottomRight.coordinates.columnIndex >= columnIndex &&
                    !(range.topLeft.coordinates.rowIndex === 0 && range.bottomRight.coordinates.rowIndex === rowsAmount - 1),
            );
        },
        [ranges, rowsAmount],
    );

    /**
     * Рендерит root corner
     */
    const renderRoot = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            let { borderColor } = colors;
            if (typeof borderColor === 'object') borderColor = '';

            let bgColor: string | IGradientColor | CanvasGradient | undefined = colors.headerBg;
            if (typeof bgColor === 'object') {
                bgColor = drawGradient(ctx, bgColor, 0, 0, ROWS_HEADER_WIDTH, COLUMNS_HEADER_HEIGHT);
            }

            ctx.save();
            ctx.fillStyle = bgColor as string;
            ctx.fillRect(0, 0, ROWS_HEADER_WIDTH, COLUMNS_HEADER_HEIGHT);

            ctx.strokeStyle = borderColor as string;
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, ROWS_HEADER_WIDTH, COLUMNS_HEADER_HEIGHT);
            ctx.restore();
        },
        [colors],
    );

    /**
     * Рендерит ТОЛЬКО ВИДИМЫЕ rows headers с батчингом
     */
    const renderRowsHeaderForArea = useCallback(
        (ctx: CanvasRenderingContext2D, minRow: number, maxRow: number, isFrozen: boolean) => {
            if (minRow < 0 || maxRow < 0 || minRow > maxRow) return;

            const headersCount = maxRow - minRow + 1;
            if (headersCount > 500) {
                console.warn(`⚠️ renderRowsHeaderForArea: Too many headers (${headersCount})`);
            }

            const start = performance.now();

            let { borderColor, cmpSecondaryColor } = colors;
            if (typeof borderColor === 'object') borderColor = '';
            if (typeof cmpSecondaryColor === 'object') cmpSecondaryColor = '';

            ctx.save();

            // Группируем headers по состоянию
            const normalHeaders: number[] = [];
            const altHeaders: number[] = [];
            const activeHeaders: number[] = [];

            // Один проход для группировки
            for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
                // Пропускаем свернутые строки
                const rowMeta = rowsMetadata.at(rowIndex);
                if (rowMeta.height === 0) {
                    continue;
                }
                if (isRowActive(rowIndex)) {
                    activeHeaders.push(rowIndex);
                } else if (isRowAlt(rowIndex)) {
                    altHeaders.push(rowIndex);
                } else {
                    normalHeaders.push(rowIndex);
                }
            }

            // Функция для рендера группы
            const renderGroup = (indices: number[], bgColor: string | IGradientColor | undefined) => {
                if (!indices.length) return;

                // Фон
                if (bgColor && typeof bgColor === 'string') {
                    ctx.fillStyle = bgColor;
                    ctx.beginPath();
                    for (const rowIndex of indices) {
                        const rowMeta = rowsMetadata.at(rowIndex);
                        if (rowMeta) {
                            ctx.rect(0, rowMeta.y, ROWS_HEADER_WIDTH, rowMeta.height);
                        }
                    }
                    ctx.fill();
                }

                // Границы (батчим)
                ctx.strokeStyle = borderColor as string;
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (const rowIndex of indices) {
                    const rowMeta = rowsMetadata.at(rowIndex);
                    if (rowMeta) {
                        ctx.rect(0, rowMeta.y, ROWS_HEADER_WIDTH, rowMeta.height);
                    }
                }
                ctx.stroke();

                // Текст
                ctx.fillStyle = colors.color as string;
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                for (const rowIndex of indices) {
                    const rowMeta = rowsMetadata.at(rowIndex);
                    if (rowMeta) {
                        ctx.fillText(String(rowIndex + 1), ROWS_HEADER_WIDTH / 2, rowMeta.y + rowMeta.height / 2);
                    }
                }
            };

            // Рендерим группы
            if (normalHeaders.length && colors.headerBg && typeof colors.headerBg === 'string') {
                renderGroup(normalHeaders, colors.headerBg);
            } else if (normalHeaders.length) {
                // Без фона - только границы и текст
                renderGroup(normalHeaders, undefined);
            }

            renderGroup(altHeaders, colors.headerAltBg);
            renderGroup(activeHeaders, colors.headerActiveBg);

            // Индикаторы свёрнутых строк в стиле Excel (двойная горизонтальная линия)
            // Собираем уникальные позиции индикаторов для свёрнутых строк в видимом диапазоне
            const rowIndicatorPositions = new Set<number>();
            for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
                const rowMeta = rowsMetadata.at(rowIndex);
                // Если строка свернута (высота 0), вычисляем позицию индикатора
                if (rowMeta && rowMeta.height === 0) {
                    const indicatorY = getCollapsedRowIndicatorPosition(rowIndex, rowsMetadata);
                    if (indicatorY !== null) {
                        rowIndicatorPositions.add(indicatorY);
                    }
                }
            }

            // Гарантируем отрисовку индикатора для свернутой строки 0, даже если она вне видимого диапазона
            const rowZeroMeta = rowsMetadata.at(0);
            if (rowZeroMeta && rowZeroMeta.height === 0) {
                const indicatorY = getCollapsedRowIndicatorPosition(0, rowsMetadata);
                if (indicatorY !== null) {
                    rowIndicatorPositions.add(indicatorY);
                }
            }

            const margin = 3;
            const lineGap = 2;

            ctx.save();
            ctx.strokeStyle = cmpSecondaryColor;
            ctx.lineWidth = 1;

            for (const indicatorY of rowIndicatorPositions) {
                // Первая линия
                ctx.beginPath();
                ctx.moveTo(margin, indicatorY - lineGap);
                ctx.lineTo(ROWS_HEADER_WIDTH - margin, indicatorY - lineGap);
                ctx.stroke();

                // Вторая линия (ближе к границе)
                ctx.beginPath();
                ctx.moveTo(margin, indicatorY + lineGap);
                ctx.lineTo(ROWS_HEADER_WIDTH - margin, indicatorY + lineGap);
                ctx.stroke();
            }

            ctx.restore();

            ctx.restore();

            const elapsed = performance.now() - start;
            if (localStorage.getItem('DBG_PERF_DETAIL') === '1') {
                console.log(`  ├─ renderRowsHeaders(${minRow}-${maxRow}): ${elapsed.toFixed(2)}ms | count: ${headersCount}`);
            }
        },
        [rowsMetadata, colors, isRowActive, isRowAlt],
    );

    /**
     * КРИТИЧНО: Рендерит ТОЛЬКО ВИДИМЫЕ columns headers с батчингом
     */
    const renderColumnsHeaderForArea = useCallback(
        (ctx: CanvasRenderingContext2D, minCol: number, maxCol: number, isFrozen: boolean) => {
            if (minCol < 0 || maxCol < 0 || minCol > maxCol) return;

            const headersCount = maxCol - minCol + 1;
            if (headersCount > 500) {
                console.warn(`⚠️ renderColumnsHeaderForArea: Too many headers (${headersCount})`);
            }

            const start = performance.now();

            let { borderColor, cmpSecondaryColor } = colors;
            if (typeof borderColor === 'object') borderColor = '';
            if (typeof cmpSecondaryColor === 'object') cmpSecondaryColor = '';

            ctx.save();

            const normalHeaders: number[] = [];
            const altHeaders: number[] = [];
            const activeHeaders: number[] = [];

            for (let columnIndex = minCol; columnIndex <= maxCol; columnIndex++) {
                // Пропускаем свернутые колонки
                const colMeta = columnsMetadata.at(columnIndex);
                if (!colMeta || colMeta.width === 0) {
                    continue;
                }
                if (isColumnActive(columnIndex)) {
                    activeHeaders.push(columnIndex);
                } else if (isColumnAlt(columnIndex)) {
                    altHeaders.push(columnIndex);
                } else {
                    normalHeaders.push(columnIndex);
                }
            }

            const renderGroup = (indices: number[], bgColor: string | IGradientColor | undefined) => {
                if (!indices.length) return;

                // Фон
                if (bgColor && typeof bgColor === 'string') {
                    ctx.fillStyle = bgColor;
                    ctx.beginPath();
                    for (const columnIndex of indices) {
                        const colMeta = columnsMetadata.at(columnIndex);
                        if (colMeta) {
                            ctx.rect(colMeta.x, 0, colMeta.width, COLUMNS_HEADER_HEIGHT);
                        }
                    }
                    ctx.fill();
                }

                // Границы
                ctx.strokeStyle = borderColor as string;
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (const columnIndex of indices) {
                    const colMeta = columnsMetadata.at(columnIndex);
                    if (colMeta) {
                        ctx.rect(colMeta.x, 0, colMeta.width, COLUMNS_HEADER_HEIGHT);
                    }
                }
                ctx.stroke();

                // Текст
                ctx.fillStyle = colors.color as string;
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                for (const columnIndex of indices) {
                    const colMeta = columnsMetadata.at(columnIndex);
                    if (colMeta) {
                        const value = generateTitleFromOrderNumber(columnIndex);
                        ctx.fillText(value, colMeta.x + colMeta.width / 2, COLUMNS_HEADER_HEIGHT / 2);
                    }
                }
            };

            if (normalHeaders.length && colors.headerBg && typeof colors.headerBg === 'string') {
                renderGroup(normalHeaders, colors.headerBg);
            } else if (normalHeaders.length) {
                renderGroup(normalHeaders, undefined);
            }

            renderGroup(altHeaders, colors.headerAltBg);
            renderGroup(activeHeaders, colors.headerActiveBg);

            // Индикаторы свёрнутых столбцов в стиле Excel (двойная вертикальная линия)
            // Собираем уникальные позиции индикаторов для свёрнутых колонок в видимом диапазоне
            const columnIndicatorPositions = new Set<number>();
            for (let columnIndex = minCol; columnIndex <= maxCol; columnIndex++) {
                const colMeta = columnsMetadata.at(columnIndex);
                if (!colMeta || colMeta.width !== 0) continue;

                const indicatorX = getCollapsedColumnIndicatorPosition(columnIndex, columnsMetadata);
                if (indicatorX !== null) {
                    columnIndicatorPositions.add(indicatorX);
                }
            }

            // Гарантируем отрисовку индикатора для свернутого столбца 0, даже если он вне видимого диапазона
            const colZeroMeta = columnsMetadata.at(0);
            if (colZeroMeta && colZeroMeta.width === 0) {
                const indicatorX = getCollapsedColumnIndicatorPosition(0, columnsMetadata);
                if (indicatorX !== null) {
                    columnIndicatorPositions.add(indicatorX);
                }
            }

            const margin = 3;
            const lineGap = 2;

            ctx.save();
            ctx.strokeStyle = cmpSecondaryColor;
            ctx.lineWidth = 1;

            for (const indicatorX of columnIndicatorPositions) {
                // Первая линия
                ctx.beginPath();
                ctx.moveTo(indicatorX - lineGap, margin);
                ctx.lineTo(indicatorX - lineGap, COLUMNS_HEADER_HEIGHT - margin);
                ctx.stroke();

                // Вторая линия
                ctx.beginPath();
                ctx.moveTo(indicatorX + lineGap, margin);
                ctx.lineTo(indicatorX + lineGap, COLUMNS_HEADER_HEIGHT - margin);
                ctx.stroke();
            }

            ctx.restore();

            ctx.restore();

            const elapsed = performance.now() - start;
            if (localStorage.getItem('DBG_PERF_DETAIL') === '1') {
                console.log(
                    `  ├─ renderColumnsHeaders(${minCol}-${maxCol}): ${elapsed.toFixed(2)}ms | count: ${headersCount}`,
                );
            }
        },
        [columnsMetadata, colors, isColumnActive, isColumnAlt],
    );

    /**
     * Рендерит frozen dividers
     */
    const renderFrozenDividers = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!viewportCache) return;

            ctx.save();
            ctx.strokeStyle = colors.frozenDividerColor;
            ctx.lineWidth = 2;

            const { frozenAreas } = viewportCache;

            // Вертикальный divider для frozen columns
            if (frozenColumns > 0 && frozenAreas.width > 0) {
                const headersWidth = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;
                const x = (headersWidth + frozenAreas.width) * camera.z;

                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, ctx.canvas.height);
                ctx.stroke();
            }

            // Горизонтальный divider для frozen rows
            if (frozenRows > 0 && frozenAreas.height > 0) {
                const headersHeight = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;
                const y = (headersHeight + frozenAreas.height) * camera.z;

                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(ctx.canvas.width, y);
                ctx.stroke();
            }

            ctx.restore();
        },
        [viewportCache, colors, frozenRows, frozenColumns, hasRowsHeader, hasColumnsHeader, camera],
    );

    /**
     * Главная функция рендеринга headers
     */
    const renderHeaders = useCallback(
        (canvas: HTMLCanvasElement | null) => {
            if (!canvas || !viewportCache) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const { viewports } = viewportCache;

            // Rows header frozen - рендерим если есть frozen rows
            if (hasRowsHeader) {
                if (frozenRows > 0 && headerClipBoundaries.rowsFrozen) {
                    ctx.save();
                    applyClipRegion(ctx, headerClipBoundaries.rowsFrozen);
                    const transform = createHeaderTransform('rows', true, camera, hasRowsHeader, hasColumnsHeader);
                    applyTransform(ctx, transform);
                    renderRowsHeaderForArea(ctx, 0, frozenRows - 1, true);
                    ctx.restore();
                }

                // Rows header scrollable - всегда рендерим если есть rows header
                if (viewports.scrollable && headerClipBoundaries.rowsScrollable) {
                    ctx.save();
                    applyClipRegion(ctx, headerClipBoundaries.rowsScrollable);
                    const transform = createHeaderTransform('rows', false, camera, hasRowsHeader, hasColumnsHeader);
                    applyTransform(ctx, transform);

                    const minRow = viewports.scrollable.minRowIndex;
                    const maxRow = viewports.scrollable.maxRowIndex;

                    renderRowsHeaderForArea(ctx, minRow, maxRow, false);
                    ctx.restore();
                }
            }

            // Columns header frozen - рендерим если есть frozen columns
            if (hasColumnsHeader) {
                // Frozen columns
                if (frozenColumns > 0 && headerClipBoundaries.columnsFrozen) {
                    ctx.save();
                    applyClipRegion(ctx, headerClipBoundaries.columnsFrozen);
                    const transform = createHeaderTransform('columns', true, camera, hasRowsHeader, hasColumnsHeader);
                    applyTransform(ctx, transform);
                    renderColumnsHeaderForArea(ctx, 0, frozenColumns - 1, true);
                    ctx.restore();
                }

                // Columns header scrollable - всегда рендерим если есть columns header
                if (viewports.scrollable && headerClipBoundaries.columnsScrollable) {
                    ctx.save();
                    applyClipRegion(ctx, headerClipBoundaries.columnsScrollable);
                    const transform = createHeaderTransform('columns', false, camera, hasRowsHeader, hasColumnsHeader);
                    applyTransform(ctx, transform);

                    const minCol = viewports.scrollable.minColumnIndex;
                    const maxCol = viewports.scrollable.maxColumnIndex;

                    renderColumnsHeaderForArea(ctx, minCol, maxCol, false);
                    ctx.restore();
                }
            }

            // Frozen dividers
            if (frozenRows > 0 || frozenColumns > 0) {
                renderFrozenDividers(ctx);
            }

            // Root corner
            if (hasRowsHeader && hasColumnsHeader && headerClipBoundaries.root) {
                ctx.save();
                applyClipRegion(ctx, headerClipBoundaries.root);
                ctx.scale(camera.z, camera.z);
                renderRoot(ctx);
                ctx.restore();
            }
        },
        [
            viewportCache,
            hasRowsHeader,
            hasColumnsHeader,
            frozenRows,
            frozenColumns,
            camera,
            headerClipBoundaries,
            renderRoot,
            renderRowsHeaderForArea,
            renderColumnsHeaderForArea,
            renderFrozenDividers,
        ],
    );

    return renderHeaders;
};
