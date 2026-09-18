import { IColumnsMetadata, IRowsMetadata } from '../../../SpreadSheetPlugins/PluginMetadata/types';
import { COLUMNS_HEADER_HEIGHT, ROWS_HEADER_WIDTH } from '../const';
import { ICamera } from '../types';
import { calculateFrozenAreas } from './coordinates';

export interface ClipBoundary {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ClipBoundaries {
    ['frozen-both']: ClipBoundary | null;
    ['frozen-rows']: ClipBoundary | null;
    ['frozen-columns']: ClipBoundary | null;
    scrollable: ClipBoundary;
}

/**
 * Вычисляет clip boundaries для всех областей в SCREEN SPACE
 */
export function calculateClipBoundaries(
    camera: ICamera,
    frozenRows: number,
    frozenColumns: number,
    rowsMetadata: IRowsMetadata,
    columnsMetadata: IColumnsMetadata,
    hasRowsHeader: boolean,
    hasColumnsHeader: boolean,
    viewportWidth: number,
    viewportHeight: number,
): ClipBoundaries {
    // Вычисляем frozen области в world space
    const frozenAreas = calculateFrozenAreas(frozenRows, frozenColumns, rowsMetadata, columnsMetadata);

    // Headers в screen space (масштабируются!)
    const headersWidthScreen = (hasRowsHeader ? ROWS_HEADER_WIDTH : 0) * camera.z;
    const headersHeightScreen = (hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0) * camera.z;

    // Frozen области в screen space
    const frozenWidthScreen = frozenAreas.width * camera.z;
    const frozenHeightScreen = frozenAreas.height * camera.z;

    // Вычисляем clip boundaries для каждой области
    const frozenBoth: ClipBoundary | null =
        frozenRows > 0 && frozenColumns > 0
            ? {
                  x: headersWidthScreen,
                  y: headersHeightScreen,
                  width: frozenWidthScreen,
                  height: frozenHeightScreen,
              }
            : null;

    const frozenRows_: ClipBoundary | null =
        frozenRows > 0
            ? {
                  x: headersWidthScreen + frozenWidthScreen,
                  y: headersHeightScreen,
                  width: Math.max(0, viewportWidth - headersWidthScreen - frozenWidthScreen),
                  height: frozenHeightScreen,
              }
            : null;

    const frozenColumns_: ClipBoundary | null =
        frozenColumns > 0
            ? {
                  x: headersWidthScreen,
                  y: headersHeightScreen + frozenHeightScreen,
                  width: frozenWidthScreen,
                  height: Math.max(0, viewportHeight - headersHeightScreen - frozenHeightScreen),
              }
            : null;

    const scrollable: ClipBoundary = {
        x: headersWidthScreen + frozenWidthScreen,
        y: headersHeightScreen + frozenHeightScreen,
        width: Math.max(0, viewportWidth - headersWidthScreen - frozenWidthScreen),
        height: Math.max(0, viewportHeight - headersHeightScreen - frozenHeightScreen),
    };

    return {
        'frozen-both': frozenBoth,
        'frozen-rows': frozenRows_,
        'frozen-columns': frozenColumns_,
        scrollable,
    };
}

/**
 * Применяет clip region к контексту
 */
export function applyClipRegion(ctx: CanvasRenderingContext2D, clip: ClipBoundary): void {
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.width, clip.height);
    ctx.clip();
}
