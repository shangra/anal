import { COLLAPSED_INDICATOR_TOLERANCE } from '../const';
import { ICamera } from '../types';
import { worldToScreen } from './coordinates';

interface RowMetadata {
    y: number;
    height: number;
}

interface ColumnMetadata {
    x: number;
    width: number;
}

interface MetadataAccessor<T> {
    at(index: number): T | undefined;
}

/**
 * Проверяет, свернута ли строка (высота равна 0)
 */
function isRowCollapsed(rowIndex: number, rowsMetadata: MetadataAccessor<RowMetadata>): boolean {
    const meta = rowsMetadata.at(rowIndex);
    return meta ? meta.height === 0 : false;
}

/**
 * Проверяет, свернута ли колонка (ширина равна 0)
 */
function isColumnCollapsed(columnIndex: number, columnsMetadata: MetadataAccessor<ColumnMetadata>): boolean {
    const meta = columnsMetadata.at(columnIndex);
    return meta ? meta.width === 0 : false;
}

/**
 * Находит предыдущий видимый индекс относительно заданного индекса,
 * пропуская свёрнутые индексы на основе метаданных.
 * Возвращает найденный индекс или null, если предыдущего видимого нет.
 */
function findPreviousVisibleIndexByMetadata(
    index: number,
    rowsMetadata: MetadataAccessor<RowMetadata>,
    isRow: boolean,
    columnsMetadata?: MetadataAccessor<ColumnMetadata>,
): number | null {
    let prev = index - 1;
    while (prev >= 0) {
        const collapsed = isRow ? isRowCollapsed(prev, rowsMetadata) : isColumnCollapsed(prev, columnsMetadata!);
        if (!collapsed) {
            return prev;
        }
        prev--;
    }
    return null;
}

/**
 * Находит предыдущий видимый индекс относительно заданного индекса,
 * пропуская свёрнутые индексы из collapsedSet.
 * Возвращает найденный индекс или null, если предыдущего видимого нет.
 */
export function findPreviousVisibleIndex(index: number, collapsedSet: Set<number>): number | null {
    let prev = index - 1;
    while (prev >= 0 && collapsedSet.has(prev)) {
        prev--;
    }
    return prev >= 0 ? prev : null;
}

/**
 * Находит следующий видимый индекс относительно заданного индекса,
 * пропуская свёрнутые индексы из collapsedSet.
 * Возвращает найденный индекс или null, если следующего видимого нет.
 */
export function findNextVisibleIndex(index: number, collapsedSet: Set<number>): number | null {
    let next = index + 1;
    while (collapsedSet.has(next)) {
        next++;
    }
    return next;
}

/**
 * Находит последний видимый индекс в диапазоне.
 * Возвращает индекс или null, если видимых нет.
 */
export function findLastVisibleIndex(maxIndex: number, collapsedSet: Set<number>): number | null {
    for (let i = maxIndex; i >= 0; i--) {
        if (!collapsedSet.has(i)) {
            return i;
        }
    }
    return null;
}

/**
 * Возвращает мировую Y-координату индикатора свёрнутой строки.
 * Индикатор рисуется на нижней границе предыдущей видимой строки.
 * Если предыдущей видимой строки нет (свернута строка 0),
 * возвращает Y верхней границы свёрнутой строки (её начало).
 */
export function getCollapsedRowIndicatorPosition(
    rowIndex: number,
    rowsMetadata: MetadataAccessor<RowMetadata>,
): number | null {
    // Проверяем свернутость по высоте строки
    if (!isRowCollapsed(rowIndex, rowsMetadata)) {
        return null;
    }
    // Ищем предыдущую видимую строку (высота > 0)
    let prevVisible = rowIndex - 1;
    while (prevVisible >= 0 && isRowCollapsed(prevVisible, rowsMetadata)) {
        prevVisible--;
    }
    if (prevVisible >= 0) {
        // Есть предыдущая видимая строка - индикатор на её границе
        const prevMeta = rowsMetadata.at(prevVisible);
        if (!prevMeta) {
            return null;
        }
        return prevMeta.y + prevMeta.height;
    }

    // Нет предыдущей видимой строки (свернута строка 0)
    // Индикатор рисуется на верхней границе строки 0 (её начало)
    const rowMeta = rowsMetadata.at(rowIndex);
    if (!rowMeta) {
        return null;
    }
    return rowMeta.y;
}

/**
 * Возвращает мировую X-координату индикатора свёрнутой колонки.
 * Индикатор рисуется на правой границе предыдущей видимой колонки.
 * Если предыдущей видимой колонки нет (свернута колонка 0),
 * возвращает X правой границы свёрнутой колонки (её конец).
 */
export function getCollapsedColumnIndicatorPosition(
    columnIndex: number,
    columnsMetadata: MetadataAccessor<ColumnMetadata>,
): number | null {
    // Проверяем свернутость по ширине колонки
    if (!isColumnCollapsed(columnIndex, columnsMetadata)) {
        return null;
    }
    // Ищем предыдущую видимую колонку (ширина > 0)
    let prevVisible = columnIndex - 1;
    while (prevVisible >= 0 && isColumnCollapsed(prevVisible, columnsMetadata)) {
        prevVisible--;
    }
    if (prevVisible >= 0) {
        // Есть предыдущая видимая колонка - индикатор на её границе
        const prevMeta = columnsMetadata.at(prevVisible);
        if (!prevMeta) {
            return null;
        }
        return prevMeta.x + prevMeta.width;
    }

    // Нет предыдущей видимой колонки (свернута колонка 0)
    // Индикатор рисуется на правой границе колонки 0 (её конец)
    const colMeta = columnsMetadata.at(columnIndex);

    if (!colMeta) {
        return null;
    }
    return colMeta.x + colMeta.width;
}
/**
 * Ищет свёрнутую строку, индикатор которой находится рядом с заданной экранной координатой Y.
 * Возвращает индекс свёрнутой строки или null.
 */
export function findCollapsedRowIndicatorByScreenY(
    screenY: number,
    rowsMetadata: MetadataAccessor<RowMetadata>,
    camera: ICamera,
    hasColumnsHeader: boolean,
    COLUMNS_HEADER_HEIGHT: number,
    tolerance: number = COLLAPSED_INDICATOR_TOLERANCE,
    height: number = 1000,
): number | null {
    const scaledTolerance = tolerance * camera.z;
    const coordCtx = {
        camera,
        hasRowsHeader: false,
        hasColumnsHeader,
        frozenRows: 0,
        frozenColumns: 0,
    };

    // Итерируем по всем строкам в пределах height, проверяем свернутость по высоте
    for (let rowIndex = 0; rowIndex < height; rowIndex++) {
        if (!isRowCollapsed(rowIndex, rowsMetadata)) continue;

        const indicatorWorldY = getCollapsedRowIndicatorPosition(rowIndex, rowsMetadata);
        if (indicatorWorldY === null) continue;

        const { y: indicatorScreenY } = worldToScreen(0, indicatorWorldY, 'scrollable', coordCtx);
        if (Math.abs(screenY - indicatorScreenY) <= scaledTolerance) {
            return rowIndex;
        }
    }
    return null;
}

/**
 * Ищет свёрнутую колонку, индикатор которой находится рядом с заданной экранной координатой X.
 * Возвращает индекс свёрнутой колонки или null.
 */
export function findCollapsedColumnIndicatorByScreenX(
    screenX: number,
    columnsMetadata: MetadataAccessor<ColumnMetadata>,
    camera: ICamera,
    hasRowsHeader: boolean,
    ROWS_HEADER_WIDTH: number,
    tolerance: number = COLLAPSED_INDICATOR_TOLERANCE,
    width: number = 1000,
): number | null {
    const scaledTolerance = tolerance * camera.z;
    const coordCtx = {
        camera,
        hasRowsHeader,
        hasColumnsHeader: false,
        frozenRows: 0,
        frozenColumns: 0,
    };

    // Итерируем по всем колонкам в пределах width, проверяем свернутость по ширине
    for (let colIndex = 0; colIndex < width; colIndex++) {
        if (!isColumnCollapsed(colIndex, columnsMetadata)) continue;

        const indicatorWorldX = getCollapsedColumnIndicatorPosition(colIndex, columnsMetadata);

        if (indicatorWorldX == null) continue;

        const { x: indicatorScreenX } = worldToScreen(indicatorWorldX, 0, 'scrollable', coordCtx);
        if (Math.abs(screenX - indicatorScreenX) <= scaledTolerance) {
            return colIndex;
        }
    }
    return null;
}
