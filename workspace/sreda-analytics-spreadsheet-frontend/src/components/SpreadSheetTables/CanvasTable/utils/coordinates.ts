import { IColumnsMetadata, IRowsMetadata } from '../../../SpreadSheetPlugins/PluginMetadata/types';
import { COLUMNS_HEADER_HEIGHT, ROWS_HEADER_WIDTH } from '../const';
import { ICamera } from '../types';

/**
 * UNIFIED COORDINATE SYSTEM
 *
 * Три пространства координат:
 * 1. WORLD SPACE - координаты контента (ячейки, metadata)
 * 2. CAMERA SPACE - world с учетом camera offset
 * 3. SCREEN SPACE - финальные пиксели на экране
 *
 * Трансформация: WORLD -> CAMERA -> SCREEN
 */

interface CoordinateContext {
    camera: ICamera;
    hasRowsHeader: boolean;
    hasColumnsHeader: boolean;
    frozenRows: number;
    frozenColumns: number;
}

/**
 * Определяет область по индексам ячейки
 */
export type CellArea = 'frozen-both' | 'frozen-rows' | 'frozen-columns' | 'scrollable';

export function getCellArea(rowIndex: number, columnIndex: number, frozenRows: number, frozenColumns: number): CellArea {
    const inFrozenRows = rowIndex < frozenRows;
    const inFrozenColumns = columnIndex < frozenColumns;

    if (inFrozenRows && inFrozenColumns) return 'frozen-both';
    if (inFrozenRows) return 'frozen-rows';
    if (inFrozenColumns) return 'frozen-columns';
    return 'scrollable';
}

/**
 * WORLD -> SCREEN (с учетом области)
 */
export function worldToScreen(
    worldX: number,
    worldY: number,
    area: CellArea,
    ctx: CoordinateContext,
): { x: number; y: number } {
    const { camera, hasRowsHeader, hasColumnsHeader } = ctx;

    // Headers offsets в screen space
    const headersOffsetX = (hasRowsHeader ? ROWS_HEADER_WIDTH : 0) * camera.z;
    const headersOffsetY = (hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0) * camera.z;

    let screenX: number;
    let screenY: number;

    // В зависимости от области применяем или нет camera offset
    switch (area) {
        case 'frozen-both':
            // Не скроллится ни по X ни по Y
            screenX = worldX * camera.z + headersOffsetX;
            screenY = worldY * camera.z + headersOffsetY;
            break;

        case 'frozen-rows':
            // Скроллится по X, не скроллится по Y
            screenX = (worldX + camera.x) * camera.z + headersOffsetX;
            screenY = worldY * camera.z + headersOffsetY;
            break;

        case 'frozen-columns':
            // Не скроллится по X, скроллится по Y
            screenX = worldX * camera.z + headersOffsetX;
            screenY = (worldY + camera.y) * camera.z + headersOffsetY;
            break;

        case 'scrollable':
            // Скроллится по обеим осям
            screenX = (worldX + camera.x) * camera.z + headersOffsetX;
            screenY = (worldY + camera.y) * camera.z + headersOffsetY;
            break;
    }

    return { x: screenX, y: screenY };
}

/**
 * SCREEN -> WORLD (с автоопределением области)
 */
export function screenToWorld(
    screenX: number,
    screenY: number,
    ctx: CoordinateContext,
    frozenAreaWidth: number,
    frozenAreaHeight: number,
): { x: number; y: number; area: CellArea } {
    const { camera, hasRowsHeader, hasColumnsHeader } = ctx;

    // Headers offsets в screen space
    const headersOffsetX = (hasRowsHeader ? ROWS_HEADER_WIDTH : 0) * camera.z;
    const headersOffsetY = (hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0) * camera.z;

    // Убираем headers offset
    const screenXWithoutHeaders = screenX - headersOffsetX;
    const screenYWithoutHeaders = screenY - headersOffsetY;

    // Frozen области в screen space
    const frozenScreenWidth = frozenAreaWidth * camera.z;
    const frozenScreenHeight = frozenAreaHeight * camera.z;

    // Определяем область
    const inFrozenX = screenXWithoutHeaders < frozenScreenWidth;
    const inFrozenY = screenYWithoutHeaders < frozenScreenHeight;

    let area: CellArea;
    let worldX: number;
    let worldY: number;

    if (inFrozenY && inFrozenX) {
        area = 'frozen-both';
        worldX = screenXWithoutHeaders / camera.z;
        worldY = screenYWithoutHeaders / camera.z;
    } else if (inFrozenY) {
        area = 'frozen-rows';
        worldX = screenXWithoutHeaders / camera.z - camera.x;
        worldY = screenYWithoutHeaders / camera.z;
    } else if (inFrozenX) {
        area = 'frozen-columns';
        worldX = screenXWithoutHeaders / camera.z;
        worldY = screenYWithoutHeaders / camera.z - camera.y;
    } else {
        area = 'scrollable';
        worldX = screenXWithoutHeaders / camera.z - camera.x;
        worldY = screenYWithoutHeaders / camera.z - camera.y;
    }

    return { x: worldX, y: worldY, area };
}

/**
 * Находит индекс колонки по world X (бинарный поиск)
 */
export function findColumnIndexByWorldX(worldX: number, metadata: IColumnsMetadata): number {
    if (!metadata.length) return -1;

    if (worldX < metadata.at(0).x) {
        return 0;
    }

    const lastCol = metadata.at(metadata.length - 1);
    if (worldX >= lastCol.x + lastCol.width) {
        return metadata.length - 1;
    }

    let left = 0;
    let right = metadata.length - 1;
    let result = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const col = metadata.at(mid);

        if (worldX >= col.x && worldX <= col.x + col.width) {
            return mid;
        }

        if (worldX < col.x) {
            result = mid;
            right = mid - 1;
        } else {
            left = mid + 1;
            result = mid + 1;
        }
    }

    return Math.min(Math.max(0, result), metadata.length - 1);
}

/**
 * Находит индекс строки по world Y (бинарный поиск)
 */
export function findRowIndexByWorldY(worldY: number, metadata: IRowsMetadata): number {
    if (!metadata.length) return -1;

    // Если worldY меньше первой строки
    if (worldY < metadata.at(0).y) {
        return 0;
    }

    // Если worldY больше последней строки
    const lastRow = metadata.at(metadata.length - 1);
    if (worldY >= lastRow.y + lastRow.height) {
        return metadata.length - 1;
    }

    let left = 0;
    let right = metadata.length - 1;
    let result = -1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const row = metadata.at(mid);

        // Точное попадание
        if (worldY >= row.y && worldY <= row.y + row.height) {
            return mid;
        }

        if (worldY < row.y) {
            result = mid; // Сохраняем как потенциальный результат
            right = mid - 1;
        } else {
            left = mid + 1;
            result = mid + 1; // След. строка - потенциальный результат
        }
    }

    // Возвращаем ближайшую найденную строку
    return Math.min(Math.max(0, result), metadata.length - 1);
}

/**
 * Вычисляет границы видимости для области
 */
export function calculateVisibleIndices(
    area: CellArea,
    ctx: CoordinateContext,
    columnsMetadata: IColumnsMetadata,
    rowsMetadata: IRowsMetadata,
    frozenAreaWidth: number,
    frozenAreaHeight: number,
    viewportWidth: number,
    viewportHeight: number,
): {
    minRowIndex: number;
    maxRowIndex: number;
    minColumnIndex: number;
    maxColumnIndex: number;
} {
    const { camera, hasRowsHeader, hasColumnsHeader, frozenRows, frozenColumns } = ctx;

    // Early returns для frozen областей
    if (area === 'frozen-both') {
        return {
            minRowIndex: 0,
            maxRowIndex: Math.max(0, frozenRows - 1),
            minColumnIndex: 0,
            maxColumnIndex: Math.max(0, frozenColumns - 1),
        };
    }

    if (area === 'frozen-rows') {
        const headersWidth = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;
        const scrollableViewportWidth = viewportWidth / camera.z - headersWidth - frozenAreaWidth;
        const scrollStartX = frozenAreaWidth - camera.x;
        const scrollEndX = scrollStartX + scrollableViewportWidth;

        // КРИТИЧНО: Используем исправленный бинарный поиск
        let minColumnIndex = findColumnIndexByWorldX(scrollStartX, columnsMetadata);
        let maxColumnIndex = findColumnIndexByWorldX(scrollEndX, columnsMetadata);

        // Валидация
        minColumnIndex = Math.max(frozenColumns, Math.min(minColumnIndex, columnsMetadata.length - 1));
        maxColumnIndex = Math.max(minColumnIndex, Math.min(maxColumnIndex, columnsMetadata.length - 1));

        return {
            minRowIndex: 0,
            maxRowIndex: Math.max(0, frozenRows - 1),
            minColumnIndex,
            maxColumnIndex,
        };
    }

    if (area === 'frozen-columns') {
        const headersHeight = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;
        const scrollableViewportHeight = viewportHeight / camera.z - headersHeight - frozenAreaHeight;
        const scrollStartY = frozenAreaHeight - camera.y;
        const scrollEndY = scrollStartY + scrollableViewportHeight;

        let minRowIndex = findRowIndexByWorldY(scrollStartY, rowsMetadata);
        let maxRowIndex = findRowIndexByWorldY(scrollEndY, rowsMetadata);

        minRowIndex = Math.max(frozenRows, Math.min(minRowIndex, rowsMetadata.length - 1));
        maxRowIndex = Math.max(minRowIndex, Math.min(maxRowIndex, rowsMetadata.length - 1));

        return {
            minRowIndex,
            maxRowIndex,
            minColumnIndex: 0,
            maxColumnIndex: Math.max(0, frozenColumns - 1),
        };
    }

    // Scrollable area
    const headersWidth = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;
    const headersHeight = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;

    const scrollableViewportWidth = viewportWidth / camera.z - headersWidth - frozenAreaWidth;
    const scrollableViewportHeight = viewportHeight / camera.z - headersHeight - frozenAreaHeight;

    const scrollStartX = frozenAreaWidth - camera.x;
    const scrollEndX = scrollStartX + scrollableViewportWidth;
    const scrollStartY = frozenAreaHeight - camera.y;
    const scrollEndY = scrollStartY + scrollableViewportHeight;

    let minColumnIndex = findColumnIndexByWorldX(scrollStartX, columnsMetadata);
    let maxColumnIndex = findColumnIndexByWorldX(scrollEndX, columnsMetadata);
    let minRowIndex = findRowIndexByWorldY(scrollStartY, rowsMetadata);
    let maxRowIndex = findRowIndexByWorldY(scrollEndY, rowsMetadata);

    // КРИТИЧНО: Строгая валидация границ
    minColumnIndex = Math.max(frozenColumns, Math.min(minColumnIndex, columnsMetadata.length - 1));
    maxColumnIndex = Math.max(minColumnIndex, Math.min(maxColumnIndex, columnsMetadata.length - 1));
    minRowIndex = Math.max(frozenRows, Math.min(minRowIndex, rowsMetadata.length - 1));
    maxRowIndex = Math.max(minRowIndex, Math.min(maxRowIndex, rowsMetadata.length - 1));

    return { minRowIndex, maxRowIndex, minColumnIndex, maxColumnIndex };
}

/**
 * Вычисляет размеры frozen областей в world space
 */
export function calculateFrozenAreas(
    frozenRows: number,
    frozenColumns: number,
    rowsMetadata: IRowsMetadata,
    columnsMetadata: IColumnsMetadata,
): { width: number; height: number } {
    let width = 0;
    if (frozenColumns > 0 && columnsMetadata.at(frozenColumns - 1)) {
        const lastFrozen = columnsMetadata.at(frozenColumns - 1);
        width = lastFrozen.x + lastFrozen.width;
    }

    let height = 0;
    if (frozenRows > 0 && rowsMetadata.at(frozenRows - 1)) {
        const lastFrozen = rowsMetadata.at(frozenRows - 1);
        height = lastFrozen.y + lastFrozen.height;
    }

    return { width, height };
}

/**
 * Вычисляет максимальные границы камеры
 */
export function calculateCameraBounds(
    camera: ICamera,
    columnsMetadata: IColumnsMetadata,
    rowsMetadata: IRowsMetadata,
    frozenAreaWidth: number,
    frozenAreaHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    hasRowsHeader: boolean,
    hasColumnsHeader: boolean,
): { maxX: number; maxY: number } {
    const lastCol = columnsMetadata.at(columnsMetadata.length - 1);
    const lastRow = rowsMetadata.at(rowsMetadata.length - 1);

    if (!lastCol || !lastRow) return { maxX: 0, maxY: 0 };

    const totalContentWidth = lastCol.x + lastCol.width;
    const totalContentHeight = lastRow.y + lastRow.height;

    const headersWidth = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;
    const headersHeight = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;

    // Scrollable viewport в world space
    const scrollableViewportWidth = viewportWidth / camera.z - headersWidth - frozenAreaWidth;
    const scrollableViewportHeight = viewportHeight / camera.z - headersHeight - frozenAreaHeight;

    const maxX = Math.max(0, totalContentWidth - frozenAreaWidth - scrollableViewportWidth);
    const maxY = Math.max(0, totalContentHeight - frozenAreaHeight - scrollableViewportHeight);

    return { maxX, maxY };
}
