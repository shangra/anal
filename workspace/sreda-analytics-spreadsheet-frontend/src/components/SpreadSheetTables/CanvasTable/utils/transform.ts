import { COLUMNS_HEADER_HEIGHT, ROWS_HEADER_WIDTH } from '../const';
import { ICamera } from '../types';
import { CellArea } from './coordinates';

export interface CanvasTransform {
    // Базовые параметры трансформации canvas
    scale: number;
    translateX: number;
    translateY: number;
}

/**
 * Создает трансформацию для области ячеек
 */
export function createCellTransform(
    area: CellArea,
    camera: ICamera,
    hasRowsHeader: boolean,
    hasColumnsHeader: boolean,
): CanvasTransform {
    const headersWidth = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;
    const headersHeight = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;

    const scale = camera.z;
    let translateX = headersWidth;
    let translateY = headersHeight;

    switch (area) {
        case 'frozen-both':
            // Не добавляем camera offset
            break;

        case 'frozen-rows':
            // Добавляем только camera.x
            translateX += camera.x;
            break;

        case 'frozen-columns':
            // Добавляем только camera.y
            translateY += camera.y;
            break;

        case 'scrollable':
            // Добавляем оба offset'а
            translateX += camera.x;
            translateY += camera.y;
            break;
    }

    return { scale, translateX, translateY };
}

/**
 * Применяет трансформацию к canvas context
 */
export function applyTransform(ctx: CanvasRenderingContext2D, transform: CanvasTransform): void {
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(transform.translateX, transform.translateY);
}

/**
 * Сбрасывает трансформацию
 */
export function resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.resetTransform();
}

/**
 * Создает трансформацию для headers
 */
export function createHeaderTransform(
    headerType: 'rows' | 'columns',
    isFrozen: boolean,
    camera: ICamera,
    hasRowsHeader: boolean,
    hasColumnsHeader: boolean,
): CanvasTransform {
    const headersWidth = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;
    const headersHeight = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;

    const scale = camera.z;
    let translateX = headersWidth;
    let translateY = headersHeight;

    if (headerType === 'rows') {
        // Rows header: рисуется в (-ROWS_HEADER_WIDTH, y)
        translateX = 0; // Компенсация для отрицательной X
        if (!isFrozen) {
            translateY += camera.y; // Скроллится по Y
        }
    } else {
        // Columns header: рисуется в (x, -COLUMNS_HEADER_HEIGHT)
        translateY = 0; // Компенсация для отрицательной Y
        if (!isFrozen) {
            translateX += camera.x; // Скроллится по X
        }
    }

    return { scale, translateX, translateY };
}
