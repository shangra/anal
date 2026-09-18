import { Range } from '../../../AdapterSpreadSheet/models';
import { IGradientColor, ObjectIndexes } from '../../../AdapterSpreadSheet/types';
import { IColumnsMetadata, IRowsMetadata } from '../../../SpreadSheetPlugins/PluginMetadata/types';
import { COLUMNS_HEADER_HEIGHT, ROWS_HEADER_WIDTH } from '../const';
import { IBox, ICamera } from '../types';
import { calculateFrozenAreas, findColumnIndexByWorldX, findRowIndexByWorldY, screenToWorld } from './coordinates';

export * from './coordinates';
export * from './transform';

// Debounce function to limit rendering frequency
export function debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout | null = null;
    return function fn(...args: any[]) {
        const later = () => {
            if (timeout) clearTimeout(timeout);
            func(...args);
        };
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout | null = null;
    let previous = 0;

    return function (...args: any[]) {
        const now = Date.now();
        const remaining = wait - (now - previous);

        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            func(...args);
        } else if (!timeout) {
            timeout = setTimeout(() => {
                previous = Date.now();
                timeout = null;
                func(...args);
            }, remaining);
        }
    };
}

export function getViewport(camera: ICamera, box: IBox, hasRowsHeader: boolean, hasColumnsHeader: boolean): IBox {
    // Headers в world space (константы)
    const headersWidthWorld = hasRowsHeader ? ROWS_HEADER_WIDTH : 0;
    const headersHeightWorld = hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0;

    // Headers в screen space (масштабируются!)
    const headersScreenWidth = headersWidthWorld * camera.z;
    const headersScreenHeight = headersHeightWorld * camera.z;

    // Scrollable viewport в screen space (вычитаем headers)
    const scrollableScreenWidth = box.width - headersScreenWidth;
    const scrollableScreenHeight = box.height - headersScreenHeight;

    // Scrollable viewport в world space
    const scrollableWorldWidth = scrollableScreenWidth / camera.z;
    const scrollableWorldHeight = scrollableScreenHeight / camera.z;

    // World viewport для контента
    const minX = -camera.x;
    const minY = -camera.y;
    const maxX = minX + scrollableWorldWidth;
    const maxY = minY + scrollableWorldHeight;

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: scrollableWorldWidth,
        height: scrollableWorldHeight,
    };
}

export function screen2Cell(
    screenX: number,
    screenY: number,
    columnsMetadata: IColumnsMetadata,
    rowsMetadata: IRowsMetadata,
    camera: ICamera,
    frozenRows: number,
    frozenColumns: number,
    hasRowsHeader: boolean,
    hasColumnsHeader: boolean,
): ObjectIndexes {
    // Вычисляем размеры frozen областей
    const frozenAreas = calculateFrozenAreas(frozenRows, frozenColumns, rowsMetadata, columnsMetadata);

    const coordCtx = {
        camera,
        hasRowsHeader,
        hasColumnsHeader,
        frozenRows,
        frozenColumns,
    };

    // Проверяем headers
    const headersWidthScreen = (hasRowsHeader ? ROWS_HEADER_WIDTH : 0) * camera.z;
    const headersHeightScreen = (hasColumnsHeader ? COLUMNS_HEADER_HEIGHT : 0) * camera.z;

    if (screenX < headersWidthScreen && screenY < headersHeightScreen) {
        // Root corner
        return { columnIndex: -1, rowIndex: -1 };
    }

    if (screenX < headersWidthScreen) {
        // Rows header
        const worldPoint = screenToWorld(screenX, screenY, coordCtx, frozenAreas.width, frozenAreas.height);
        const rowIndex = findRowIndexByWorldY(worldPoint.y, rowsMetadata);
        return { columnIndex: -1, rowIndex };
    }

    if (screenY < headersHeightScreen) {
        // Columns header
        const worldPoint = screenToWorld(screenX, screenY, coordCtx, frozenAreas.width, frozenAreas.height);
        const columnIndex = findColumnIndexByWorldX(worldPoint.x, columnsMetadata);
        return { rowIndex: -1, columnIndex };
    }

    // Обычная ячейка
    const worldPoint = screenToWorld(screenX, screenY, coordCtx, frozenAreas.width, frozenAreas.height);
    const columnIndex = findColumnIndexByWorldX(worldPoint.x, columnsMetadata);
    const rowIndex = findRowIndexByWorldY(worldPoint.y, rowsMetadata);

    return { columnIndex, rowIndex };
}

export const viewportXOverflowSize = (
    currentViewport: IBox,
    shape: { x: number; width: number },
    ignoreHeaders: boolean = false,
) => {
    const rowsHeaderWidth = ROWS_HEADER_WIDTH;

    if (shape.x < currentViewport.minX + (ignoreHeaders ? 0 : rowsHeaderWidth)) {
        return 'left';
    }
    if (shape.x + shape.width > currentViewport.maxX) {
        return 'right';
    }

    return null;
};

export const viewportYOverflowSize = (
    currentViewport: IBox,
    shape: { y: number; height: number },
    ignoreHeaders: boolean = false,
) => {
    const columnsHeaderHeight = COLUMNS_HEADER_HEIGHT;

    if (shape.y < currentViewport.minY + (ignoreHeaders ? 0 : columnsHeaderHeight)) {
        return 'top';
    }
    if (shape.y + shape.height > currentViewport.maxY) {
        return 'bottom';
    }

    return null;
};

export const generateTitleFromOrderNumber = (orderNumber: number): string => {
    const numeric = orderNumber % 26;
    const letter = String.fromCharCode(65 + numeric);
    const num2 = Math.floor(orderNumber / 26);

    if (num2 > 0) {
        const newLetter = generateTitleFromOrderNumber(num2 - 1);
        return `${newLetter}${letter}`;
    }
    return letter;
};

/**
 * Разбиение строки на линии
 */
export function getLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const { width } = ctx.measureText(`${currentLine} ${word}`);
        if (width < maxWidth) {
            currentLine += ` ${word}`;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

export const getAlignOffset = (max: number, current: number, align?: 'start' | 'center' | 'end'): number => {
    if (max < current) return 0;

    switch (align) {
        case 'center': {
            return (max - current) / 2;
        }
        case 'end': {
            return max - current;
        }
        default: {
            return 0;
        }
    }
};

export const getCSSColor = (cssColor: string | IGradientColor): string | IGradientColor => {
    /**
     * - Linear gradients: linear-gradient(to direction, color stops...)
     * - Linear gradients with angles: linear-gradient(45deg, color stops...)
     * - Radial gradients: radial-gradient(shape, color stops...)
     */
    const parseGradient = (gradient: string) => {
        const gradientMatch = gradient.match(/(linear|radial)-gradient\((.+)\)/i);
        if (!gradientMatch) return null;

        const type = gradientMatch[1].toLowerCase();
        let content = gradientMatch[2] as string;

        let direction = 'to bottom';
        if (type === 'linear') {
            const parts = content.split(/(?<=\ddeg|to \w+),/);
            if (parts.length > 1) {
                direction = parts[0].trim();
                content = parts[1].trim();
            }
        } else if (type === 'radial') {
            const parts = content.match(
                /((?:(?:circle|ellipse)|(?:(?:\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh|vmin|vmax)?)\s+(?:\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh|vmin|vmax)?))|(?:closest-side|farthest-side|closest-corner|farthest-corner))?(?:\s+at\s+(?:[\w\s%.-]+))?)?\s*(?:,\s*)?(.*)/,
            );
            if (!parts) return null;

            [, direction, content] = parts;
        } else {
            return null;
        }

        const colorStops = content
            .trim()
            .matchAll(
                /(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)(\s+(?:[0-9.]+(?:%|px|em|rem|vw|vh)?(?:\s+[0-9.]+(?:%|px|em|rem|vw|vh)?)?))?/g,
            );
        if (!colorStops) return null;

        const stops = [...colorStops].map(([, color, position]) => ({
            color,
            position: position ? parseFloat(position) / 100 : null,
        }));

        return { type, direction, stops } as IGradientColor;
    };

    function convertRGBtoHEX(channels: number[]) {
        const hexChannels = channels.map((entry) => `0${entry.toString(16)}`.slice(-2));
        return `#${hexChannels.join('')}`;
    }

    function parseRGB(raw: string) {
        const channels = raw
            .replace(/rgba?|\(|\)/g, '')
            .split(/,\s*/g)
            .map((entry, index) => {
                const number = parseFloat(entry);
                return index === 3 ? Math.floor(number * 255) : number;
            });

        return channels;
    }

    let canvasColor;

    if (cssColor && typeof cssColor === 'string') {
        if (/(linear|radial|conic)-gradient\((.+)\)/i.test(cssColor)) {
            canvasColor = parseGradient(cssColor);
        } else if (cssColor.substring(0, 3) === 'var') {
            // var(--primary-bg-color)
            const color = cssColor.substring(4, cssColor.length - 1);
            const element = document.getElementById('root') as Element;
            canvasColor = getComputedStyle(element).getPropertyValue(color)?.toString();
            // Есть "персонажи" которые в переменной указывают rgba, поэтому прогоним еще раз
            canvasColor = getCSSColor(canvasColor);
        } else if (cssColor.substring(0, 3) === 'rgb') {
            canvasColor = convertRGBtoHEX(parseRGB(cssColor))?.toString();
        } else if (cssColor.substring(0, 1) === '#') {
            canvasColor = cssColor;
        }
    }

    return canvasColor ?? '';
};

// Linear gradient functions
export function getLinearGradientCoords(direction: string, width: number, height: number) {
    const angles: Record<string, { x0: number; y0: number; x1: number; y1: number }> = {
        'to top': { x0: 0, y0: height, x1: 0, y1: 0 },
        'to right': { x0: 0, y0: 0, x1: width, y1: 0 },
        'to bottom': { x0: 0, y0: 0, x1: 0, y1: height },
        'to left': { x0: width, y0: 0, x1: 0, y1: 0 },
        'to top right': { x0: 0, y0: height, x1: width, y1: 0 },
        'to bottom right': { x0: 0, y0: 0, x1: width, y1: height },
        'to bottom left': { x0: width, y0: 0, x1: 0, y1: height },
        'to top left': { x0: width, y0: height, x1: 0, y1: 0 },
    };

    if (angles[direction]) {
        return angles[direction];
    }

    const degMatch = direction.match(/(\d+)deg/);
    if (degMatch) {
        const angle = (parseInt(degMatch[1], 10) - 90) * (Math.PI / 180);
        const dx = Math.cos(angle) * width;
        const dy = Math.sin(angle) * height;
        return {
            x0: width / 2 - dx / 2,
            y0: height / 2 - dy / 2,
            x1: width / 2 + dx / 2,
            y1: height / 2 + dy / 2,
        };
    }

    return { x0: 0, y0: 0, x1: width, y1: 0 };
}

// Parse CSS position string to coordinates
function parsePosition(position: string, width: number, height: number): { x: number; y: number } {
    const positions: Record<string, { x: number; y: number }> = {
        center: { x: width / 2, y: height / 2 },
        top: { x: width / 2, y: 0 },
        bottom: { x: width / 2, y: height },
        left: { x: 0, y: height / 2 },
        right: { x: width, y: height / 2 },
        'top left': { x: 0, y: 0 },
        'top right': { x: width, y: 0 },
        'bottom left': { x: 0, y: height },
        'bottom right': { x: width, y: height },
    };

    if (positions[position]) {
        return positions[position];
    }

    // Handle percentage values like "30% 60%"
    const percentMatch = position.match(/(\d+)%\s+(\d+)%/);
    if (percentMatch) {
        return {
            x: (parseInt(percentMatch[1], 10) / 100) * width,
            y: (parseInt(percentMatch[2], 10) / 100) * height,
        };
    }

    // Handle pixel values like "100px 200px"
    const pixelMatch = position.match(/(\d+)px\s+(\d+)px/);
    if (pixelMatch) {
        return {
            x: parseInt(pixelMatch[1], 10),
            y: parseInt(pixelMatch[2], 10),
        };
    }

    // Default to center
    return { x: width / 2, y: height / 2 };
}

// Calculate radii based on size keywords
function calculateRadii(
    size: string,
    shape: string,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
): [number, number] {
    const distances = {
        left: centerX,
        right: width - centerX,
        top: centerY,
        bottom: height - centerY,
    };

    let radiusX: number;
    let radiusY: number;

    switch (size) {
        case 'closest-side':
            radiusX = Math.min(distances.left, distances.right);
            radiusY = Math.min(distances.top, distances.bottom);
            break;

        case 'farthest-side':
            radiusX = Math.max(distances.left, distances.right);
            radiusY = Math.max(distances.top, distances.bottom);
            break;

        case 'closest-corner': {
            const corners = [
                Math.sqrt(distances.left ** 2 + distances.top ** 2),
                Math.sqrt(distances.right ** 2 + distances.top ** 2),
                Math.sqrt(distances.left ** 2 + distances.bottom ** 2),
                Math.sqrt(distances.right ** 2 + distances.bottom ** 2),
            ];
            const closest = Math.min(...corners);
            radiusX = closest;
            radiusY = closest;
            break;
        }
        // farthest-corner
        default: {
            const farthest = Math.max(
                Math.sqrt(distances.left ** 2 + distances.top ** 2),
                Math.sqrt(distances.right ** 2 + distances.top ** 2),
                Math.sqrt(distances.left ** 2 + distances.bottom ** 2),
                Math.sqrt(distances.right ** 2 + distances.bottom ** 2),
            );
            radiusX = farthest;
            radiusY = farthest;
            break;
        }
    }

    // For circle shape, use the smaller radius to maintain circular shape
    if (shape === 'circle') {
        const minRadius = Math.min(radiusX, radiusY);

        radiusX = minRadius;
        radiusY = minRadius;
    }

    return [radiusX, radiusY];
}

// Radial gradient functions
export function getRadialGradientCoords(direction: string, width: number, height: number) {
    // Default values
    let shape: 'circle' | 'ellipse' = 'ellipse';
    let size: string = 'farthest-corner';
    let position: string = 'center';
    let x1: number = width / 2;
    let y1: number = height / 2;

    // Parse the radial gradient string
    const match = direction.match(
        /((?:circle|ellipse)|(?:(?:\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh|vmin|vmax)?)\s+(?:\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh|vmin|vmax)?))|(?:closest-side|farthest-side|closest-corner|farthest-corner))?(?:\s+at\s+([\w\s%.-]+))?/,
    );
    if (match) {
        // Parse shape and size
        if (match[1]) {
            const shapeSize = match[1].trim();

            if (shapeSize === 'circle' || shapeSize === 'ellipse') {
                shape = shapeSize as 'circle' | 'ellipse';
            } else if (
                shapeSize.includes('closest-side') ||
                shapeSize.includes('farthest-side') ||
                shapeSize.includes('closest-corner') ||
                shapeSize.includes('farthest-corner')
            ) {
                size = shapeSize;
            } else {
                // Handle explicit size values like "100px 50px"
                const sizeMatch = shapeSize.match(
                    /(\d+(?:\.\d+)?)(px|%|em|rem|vw|vh|vmin|vmax)?\s+(\d+(?:\.\d+)?)(px|%|em|rem|vw|vh|vmin|vmax)?/,
                );
                if (sizeMatch) {
                    x1 = parseFloat(sizeMatch[1]);
                    y1 = parseFloat(sizeMatch[3]);

                    // Convert units to pixels if needed
                    if (sizeMatch[2] === '%') x1 = (x1 / 100) * width;
                    if (sizeMatch[4] === '%') y1 = (y1 / 100) * height;
                }
            }
        }

        // Parse position
        if (match[2]) {
            position = match[2].trim();
        }
    }

    // Calculate center position
    const center = parsePosition(position, width, height);

    // Calculate radii based on size keywords
    if (size !== 'farthest-corner') {
        // Default is farthest-corner
        [x1, y1] = calculateRadii(size, shape, center.x, center.y, width, height);
    } else if (shape === 'circle') {
        const maxX = Math.max(center.x, width - center.x);
        const maxY = Math.max(center.y, height - center.y);
        x1 = Math.sqrt(maxX ** 2 + maxY ** 2);
        y1 = x1;
    } else {
        x1 = Math.max(center.x, width - center.x);
        y1 = Math.max(center.y, height - center.y);
    }

    return {
        x0: center.x,
        y0: center.y,
        r0: 0, // Start radius (usually 0 for radial gradients)
        r1: Math.max(x1, y1), // End radius
        x1,
        y1,
    };
}

export const drawGradient = (
    ctx: CanvasRenderingContext2D,
    { type, direction, stops }: IGradientColor,
    x: number,
    y: number,
    width: number,
    height: number,
) => {
    let gradient: CanvasGradient;
    if (type === 'linear') {
        const coords = getLinearGradientCoords(direction, width, height);
        gradient = ctx.createLinearGradient(x + coords.x0, y + coords.y0, x + coords.x1, y + coords.y1);
    } else {
        const coords = getRadialGradientCoords(direction, width, height);
        gradient = ctx.createRadialGradient(x + coords.x0, y + coords.y0, coords.r0, x + coords.x1, y + coords.y1, coords.r1);
    }

    stops.forEach(({ position, color }, index) => {
        if (!position) {
            position = index / (stops.length - 1);
        }
        color = getCSSColor(color) as string;
        gradient.addColorStop(position, color);
    });

    return gradient;
};

/**
 * Получает все активные строки из ranges
 */
export const getActiveRows = (ranges: Range[], columnsCount: number): Set<number> => {
    const activeRows = new Set<number>();

    ranges.forEach((range) => {
        const { topLeft, bottomRight } = range;
        // Проверяем, что range покрывает все колонки
        if (topLeft.coordinates.columnIndex === 0 && bottomRight.coordinates.columnIndex === columnsCount - 1) {
            for (let row = topLeft.coordinates.rowIndex; row <= bottomRight.coordinates.rowIndex; row++) {
                activeRows.add(row);
            }
        }
    });

    return activeRows;
};

/**
 * Получает все активные колонки из ranges
 */
export const getActiveColumns = (ranges: Range[], rowsCount: number): Set<number> => {
    const activeColumns = new Set<number>();

    ranges.forEach((range) => {
        const { topLeft, bottomRight } = range;
        // Проверяем, что range покрывает все строки
        if (topLeft.coordinates.rowIndex === 0 && bottomRight.coordinates.rowIndex === rowsCount - 1) {
            for (let col = topLeft.coordinates.columnIndex; col <= bottomRight.coordinates.columnIndex; col++) {
                activeColumns.add(col);
            }
        }
    });

    return activeColumns;
};

export const isNil = (value: any): boolean => value === null || value === undefined;
