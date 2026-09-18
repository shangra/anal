import { useCallback, useContext, useMemo } from 'react';

import { CanvasSpreadSheetContext } from '../context';
import { ViewportCacheContext } from '../context/ViewportCacheContext';
import { applyTransform, createCellTransform, getCSSColor } from '../utils';
import { applyClipRegion, calculateClipBoundaries, ClipBoundary } from '../utils/clipBoundaries';
import { CellArea, getCellArea, worldToScreen } from '../utils/coordinates';

const FILL_HANDLE_SIZE = 8;
const FILL_HANDLE_TOLERANCE = 2;
/**
 * Хук для рендеринга fill handle (ТОЛЬКО ПРЕДСТАВЛЕНИЕ, БЕЗ БИЗНЕС-ЛОГИКИ)
 */
export const useFillHandleRendering = () => {
    const {
        width,
        height,
        ranges,
        rowsMetadata,
        columnsMetadata,
        camera,
        hasRowsHeader,
        hasColumnsHeader,
        frozenRows,
        frozenColumns,
        theme,
        fillDraggingRange,
    } = useContext(CanvasSpreadSheetContext);

    const viewportCache = useContext(ViewportCacheContext);

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
     * Получает screen координаты fill handle для текущего выделения
     */
    const getFillHandlePosition = useCallback((): {
        area: CellArea;
        clip: ClipBoundary;
        screen: { x: number; y: number };
        world: { x: number; y: number };
    } | null => {
        if (!viewportCache || !ranges.length || ranges.length > 1) return null;

        const range = ranges[0];

        const rangeCoords = getRangeWorldCoords(range);
        if (!rangeCoords) return null;

        const area = getCellArea(
            range.topLeft.coordinates.rowIndex,
            range.topLeft.coordinates.columnIndex,
            frozenRows,
            frozenColumns,
        );

        const vp = viewportCache.viewports[area];
        if (!vp) return null;

        const clip = clipBoundaries[area];
        if (!clip || clip.width <= 0 || clip.height <= 0) return null;

        if (!rangeIntersectsViewport(range, vp)) return null;

        const coordCtx = { camera, hasRowsHeader, hasColumnsHeader, frozenRows, frozenColumns };

        const screenPos = worldToScreen(rangeCoords.x + rangeCoords.width, rangeCoords.y + rangeCoords.height, area, coordCtx);

        return {
            area,
            clip,
            screen: screenPos,
            world: {
                x: rangeCoords.x + rangeCoords.width,
                y: rangeCoords.y + rangeCoords.height,
            },
        };
    }, [
        viewportCache,
        ranges,
        getRangeWorldCoords,
        frozenRows,
        frozenColumns,
        clipBoundaries,
        rangeIntersectsViewport,
        camera,
        hasRowsHeader,
        hasColumnsHeader,
    ]);

    /**
     * Проверяет, находится ли точка над fill handle
     */
    const isPointOnFillHandle = useCallback(
        (screenX: number, screenY: number): boolean => {
            const handlePos = getFillHandlePosition();
            if (!handlePos) return false;

            const size = FILL_HANDLE_SIZE * camera.z;
            const tolerance = FILL_HANDLE_TOLERANCE * camera.z;
            const halfSize = size / 2;

            return (
                screenX >= handlePos.screen.x - halfSize - tolerance &&
                screenX <= handlePos.screen.x + halfSize + tolerance &&
                screenY >= handlePos.screen.y - halfSize - tolerance &&
                screenY <= handlePos.screen.y + halfSize + tolerance
            );
        },
        [getFillHandlePosition, camera.z],
    );

    /**
     * Рендерит fill handle (квадратик в углу выделения)
     */
    const renderFillHandle = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!viewportCache || !ranges.length || ranges.length > 1) return;
            if (fillDraggingRange) return;

            // Не показываем при протягивании
            const handlePos = getFillHandlePosition();
            if (!handlePos) return;

            ctx.save();

            applyClipRegion(ctx, handlePos.clip);

            const transform = createCellTransform(handlePos.area, camera, hasRowsHeader, hasColumnsHeader);
            applyTransform(ctx, transform);

            // Рисуем в screen space
            const size = FILL_HANDLE_SIZE * camera.z;
            const halfSize = size / 2;

            // Фон квадратика
            ctx.fillStyle = getCSSColor(theme.activeСellBorderColor) as string;
            ctx.fillRect(handlePos.world.x - halfSize, handlePos.world.y - halfSize, size, size);

            // Белая граница
            ctx.strokeStyle = getCSSColor(theme.evenRowsCellBg ?? '') as string;
            ctx.lineWidth = 1;
            ctx.strokeRect(handlePos.world.x - halfSize, handlePos.world.y - halfSize, size, size);

            ctx.restore();
        },
        [
            viewportCache,
            ranges.length,
            fillDraggingRange,
            getFillHandlePosition,
            camera,
            hasRowsHeader,
            hasColumnsHeader,
            theme.activeСellBorderColor,
            theme.evenRowsCellBg,
        ],
    );

    /**
     * Рендерит индикатор диапазона заполнения при протягивании
     */
    const renderFillDraggingIndicator = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!fillDraggingRange || !viewportCache) return;

            const rangeCoords = getRangeWorldCoords(fillDraggingRange);
            if (!rangeCoords) return;

            const area = getCellArea(
                fillDraggingRange.topLeft.coordinates.rowIndex,
                fillDraggingRange.topLeft.coordinates.columnIndex,
                frozenRows,
                frozenColumns,
            );

            const vp = viewportCache.viewports[area];
            if (!vp) return;

            const clip = clipBoundaries[area];
            if (!clip || clip.width <= 0 || clip.height <= 0) return;

            if (!rangeIntersectsViewport(fillDraggingRange, vp)) return;

            ctx.save();

            applyClipRegion(ctx, clip);

            const transform = createCellTransform(area, camera, hasRowsHeader, hasColumnsHeader);
            applyTransform(ctx, transform);

            // Полупрозрачная заливка
            ctx.fillStyle = getCSSColor(theme.activeСellBorderColor) as string;
            ctx.globalAlpha = 0.1;

            ctx.fillRect(rangeCoords.x, rangeCoords.y, rangeCoords.width, rangeCoords.height);

            // Пунктирная граница
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = getCSSColor(theme.activeСellBorderColor) as string;
            ctx.lineWidth = 2;

            ctx.setLineDash([4, 4]);
            ctx.strokeRect(rangeCoords.x, rangeCoords.y, rangeCoords.width, rangeCoords.height);
            ctx.setLineDash([]);

            ctx.restore();
        },
        [
            fillDraggingRange,
            viewportCache,
            getRangeWorldCoords,
            frozenRows,
            frozenColumns,
            clipBoundaries,
            rangeIntersectsViewport,
            camera,
            hasRowsHeader,
            hasColumnsHeader,
            theme.activeСellBorderColor,
        ],
    );

    return {
        getFillHandlePosition,
        isPointOnFillHandle,
        renderFillHandle,
        renderFillDraggingIndicator,
        FILL_HANDLE_SIZE,
    };
};
