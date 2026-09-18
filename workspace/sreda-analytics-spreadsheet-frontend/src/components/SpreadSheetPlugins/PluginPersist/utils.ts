import { ObjectIndexes } from '../../AdapterSpreadSheet/types';

/** Проверяет, является ли plain object сериализованным Range (по полям _start, _end, _cursor). */
export function isPlainRangeLike(value: Record<string, unknown>): boolean {
    return (
        typeof value._start === 'object' &&
        value._start !== null &&
        typeof value._end === 'object' &&
        value._end !== null &&
        '_cursor' in value
    );
}

/** Проверяет, является ли plain object сериализованным Cell (по полям _rowIndex, _columnIndex, _coords). */
export function isPlainCellLike(value: Record<string, unknown>): boolean {
    return typeof value._rowIndex === 'number' && typeof value._columnIndex === 'number' && typeof value._coords === 'object';
}

/** Проверяет, является ли plain object сериализованным JoinedCell (по полям _range, _mainCell). */
export function isPlainJoinedCellLike(value: Record<string, unknown>): boolean {
    return (
        typeof value._range === 'object' &&
        value._range !== null &&
        typeof value._mainCell === 'object' &&
        value._mainCell !== null
    );
}

/** Пытается извлечь ObjectIndexes из объекта, который может быть как { _rowIndex, _columnIndex }, так и { _coords: { rowIndex, columnIndex } }. */
export function extractCellCoords(cell: Record<string, unknown>): ObjectIndexes {
    return {
        rowIndex: (cell._rowIndex ?? (cell._coords as any)?.rowIndex) as number,
        columnIndex: (cell._columnIndex ?? (cell._coords as any)?.columnIndex) as number,
    };
}
