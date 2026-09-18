import { Cell, JoinedCell, Range } from '../../../AdapterSpreadSheet/models';
import { ICell } from '../../../AdapterSpreadSheet/types';
import {
    getJoinedCellBottom,
    getJoinedCellLeft,
    getJoinedCellRight,
    getJoinedCellTop,
    SparseMatrixHelper,
} from '../../../AdapterSpreadSheet/utils';

/**
 * Checks if a cell is within any of the existing selected ranges
 */
export const isCellInRanges = (cell: Cell, ranges: Range[]): boolean => ranges.some((range) => range.contains(cell));

/**
 * Проверяет, является ли ячейка пустой
 */
export function isCellEmpty(matrix: Map<number, Map<number, ICell>>, rowIndex: number, columnIndex: number): boolean {
    const cell = SparseMatrixHelper.getCell(matrix, rowIndex, columnIndex);
    if (!cell) return true;

    return cell.data === '' || cell.data === null || cell.data === undefined;
}

/**
 * Проверяет, является ли строка полностью пустой
 */
export function isRowCompletelyEmpty(
    matrix: Map<number, Map<number, ICell>>,
    columnsCount: number,
    rowIndex: number,
): boolean {
    for (let col = 0; col < columnsCount; col++) {
        if (!isCellEmpty(matrix, rowIndex, col)) {
            return false;
        }
    }
    return true;
}

/**
 * Проверяет, является ли столбец полностью пустым в заданном диапазоне строк
 */
export function isColumnCompletelyEmpty(
    matrix: Map<number, Map<number, ICell>>,
    columnIndex: number,
    startRow: number,
    endRow: number,
): boolean {
    for (let row = startRow; row <= endRow; row++) {
        if (!isCellEmpty(matrix, row, columnIndex)) {
            return false;
        }
    }
    return true;
}

/**
 * Получает крайнюю ячейку в строке
 */
export function getBoundaryColumn(
    matrix: Map<number, Map<number, ICell>>,
    rowIndex: number,
    startCol: number,
    direction: 'left' | 'right',
    columnsCount: number,
): number {
    const isRight = direction === 'right';
    const step = isRight ? 1 : -1;
    const boundary = isRight ? columnsCount - 1 : 0;

    // Начинаем с текущей ячейки
    let currentCol = startCol;
    let lastEmptyCol = currentCol;
    let lastDataCol = currentCol;

    if (isRight ? currentCol + step > boundary : currentCol + step < boundary) {
        return currentCol;
    }

    // Проверяем текущую ячейку
    const isCurrentEmpty = isCellEmpty(matrix, rowIndex, currentCol);
    const isNextEmpty = isCellEmpty(matrix, rowIndex, currentCol + step);

    if (!isCurrentEmpty && !isNextEmpty) {
        // Если текущая ячейка непустая, ищем последнюю непустую
        currentCol += step;
        lastDataCol = currentCol;

        while (isRight ? currentCol <= boundary : currentCol >= boundary) {
            const isEmpty = isCellEmpty(matrix, rowIndex, currentCol);

            if (isEmpty) {
                // Нашли пустую ячейку - это граница для непустых
                break;
            } else {
                lastDataCol = currentCol;
            }

            currentCol += step;
        }

        // Возвращаем последнюю непустую ячейку
        return lastDataCol;
    }
    if (!isCurrentEmpty && isNextEmpty) {
        currentCol += step;
    }

    // Если текущая ячейка пустая, ищем первую непустую
    lastEmptyCol = currentCol;

    while (isRight ? currentCol <= boundary : currentCol >= boundary) {
        const isEmpty = isCellEmpty(matrix, rowIndex, currentCol);

        lastEmptyCol = currentCol;
        if (!isEmpty) {
            // Нашли первую непустую ячейку
            return lastEmptyCol;
        }

        currentCol += step;
    }

    // Если не нашли непустых, возвращаем последнюю пустую (границу таблицы)
    return lastEmptyCol;
}

/**
 * Получает крайнюю ячейку в колонке
 */
export function getBoundaryRow(
    matrix: Map<number, Map<number, ICell>>,
    columnIndex: number,
    startRow: number,
    direction: 'up' | 'down',
    rowsCount: number,
): number {
    const isDown = direction === 'down';
    const step = isDown ? 1 : -1;
    const boundary = isDown ? rowsCount - 1 : 0;

    // Начинаем с текущей ячейки
    let currentRow = startRow;
    let lastEmptyRow = currentRow;
    let lastDataRow = currentRow;

    if (isDown ? currentRow + step > boundary : currentRow + step < boundary) {
        return currentRow;
    }

    // Проверяем текущую ячейку
    const isCurrentEmpty = isCellEmpty(matrix, currentRow, columnIndex);
    const isNextEmpty = isCellEmpty(matrix, currentRow + step, columnIndex);

    if (!isCurrentEmpty && !isNextEmpty) {
        // Если текущая ячейка непустая, ищем последнюю непустую
        currentRow += step;
        lastDataRow = currentRow;

        while (isDown ? currentRow <= boundary : currentRow >= boundary) {
            const isEmpty = isCellEmpty(matrix, currentRow, columnIndex);

            if (isEmpty) {
                // Нашли пустую ячейку - это граница для непустых
                break;
            } else {
                lastDataRow = currentRow;
            }

            currentRow += step;
        }

        // Возвращаем последнюю непустую ячейку
        return lastDataRow;
    }
    if (!isCurrentEmpty && isNextEmpty) {
        currentRow += step;
    }

    // Если текущая ячейка пустая, ищем первую непустую
    lastEmptyRow = currentRow;

    while (isDown ? currentRow <= boundary : currentRow >= boundary) {
        const isEmpty = isCellEmpty(matrix, currentRow, columnIndex);

        lastEmptyRow = currentRow;
        if (!isEmpty) {
            // Нашли первую непустую ячейку
            return lastEmptyRow;
        }

        currentRow += step;
    }

    // Если не нашли непустых, возвращаем последнюю пустую (границу таблицы)
    return lastEmptyRow;
}

/**
 * Находит область данных вокруг указанной ячейки
 * - Расширяется вправо вниз, пока не встретит полностью пустые строки/столбцы
 * - Останавливается на первом полностью пустом ряду во всех направлениях
 */
export function getNextNonEmptyRange(
    matrix: Map<number, Map<number, ICell>>,
    rowsCount: number,
    columnsCount: number,
    cell: Cell,
): Range | null {
    const { rowIndex, columnIndex } = cell.coordinates;

    // Проверяем, есть ли данные в самой ячейке или рядом
    let nonEmpty = null;
    // Проверяем вправо вниз 1 ячейку (включая диагонали)
    for (let r = Math.max(0, rowIndex); r <= Math.min(rowsCount - 1, rowIndex + 1); r++) {
        for (let c = Math.max(0, columnIndex); c <= Math.min(columnsCount - 1, columnIndex + 1); c++) {
            if (!isCellEmpty(matrix, r, c)) {
                nonEmpty = new Cell({ rowIndex: r, columnIndex: c });
                break;
            }
        }
        if (nonEmpty) break;
    }

    if (!nonEmpty) {
        return null;
    }

    // Ищем верхнюю границу
    let top = nonEmpty.coordinates.rowIndex;
    for (let r = top; r >= 0; r--) {
        if (isRowCompletelyEmpty(matrix, columnsCount, r)) {
            break;
        }
        top = r;
    }

    // Ищем нижнюю границу
    let bottom = nonEmpty.coordinates.rowIndex;
    for (let r = bottom; r < rowsCount; r++) {
        if (isRowCompletelyEmpty(matrix, columnsCount, r)) {
            break;
        }
        bottom = r;
    }

    // Ищем левую границу
    let left = nonEmpty.coordinates.columnIndex;
    for (let c = left; c >= 0; c--) {
        if (isColumnCompletelyEmpty(matrix, c, top, bottom)) {
            break;
        }
        left = c;
    }

    // Ищем правую границу
    let right = nonEmpty.coordinates.columnIndex;
    for (let c = right; c < columnsCount; c++) {
        if (isColumnCompletelyEmpty(matrix, c, top, bottom)) {
            break;
        }
        right = c;
    }

    return new Range(
        new Cell({ rowIndex: Math.min(rowIndex, top), columnIndex: Math.min(columnIndex, left) }),
        new Cell({ rowIndex: bottom, columnIndex: right }),
    );
}

export function getNextBoundaryCell(
    matrix: Map<number, Map<number, ICell>>,
    cursor: Cell,
    direction: 'left' | 'up' | 'right' | 'down',
    rowsCount: number,
    columnsCount: number,
) {
    let cell = cursor;

    // Определяем, какая ячейка является "конечной" в направлении стрелки
    const { rowIndex, columnIndex } = cursor.coordinates;

    if (direction === 'right' || direction === 'left') {
        // Горизонтальное перемещение
        const boundaryCol = getBoundaryColumn(matrix, rowIndex, columnIndex, direction, columnsCount);

        cell = new Cell({ rowIndex, columnIndex: boundaryCol });
    } else if (direction === 'down' || direction === 'up') {
        // Вертикальное перемещение
        const boundaryRow = getBoundaryRow(matrix, columnIndex, rowIndex, direction, rowsCount);

        cell = new Cell({ rowIndex: boundaryRow, columnIndex });
    }

    return cell;
}

export function getNextCell(
    cursor: Cell,
    direction: 'left' | 'up' | 'right' | 'down',
    joinedCells: JoinedCell[],
    rowsCount: number,
    columnsCount: number,
) {
    let cell = cursor;

    // eslint-disable-next-line default-case
    switch (direction) {
        case 'up': {
            const minIndex = 0;
            const newRowIndex = getJoinedCellTop(joinedCells, cursor.coordinates.rowIndex - 1, cursor.coordinates.columnIndex);
            cell = new Cell({
                columnIndex: cursor.coordinates.columnIndex,
                rowIndex: Math.max(minIndex, newRowIndex),
            });
            break;
        }
        case 'down': {
            const maxIndex = rowsCount - 1;
            const newRowIndex = getJoinedCellBottom(
                joinedCells,
                cursor.coordinates.rowIndex + 1,
                cursor.coordinates.columnIndex,
            );
            cell = new Cell({
                columnIndex: cursor.coordinates.columnIndex,
                rowIndex: Math.min(maxIndex, newRowIndex),
            });
            break;
        }
        case 'left': {
            const minIndex = 0;
            const newColumnIndex = getJoinedCellLeft(
                joinedCells,
                cursor.coordinates.rowIndex,
                cursor.coordinates.columnIndex - 1,
            );
            cell = new Cell({
                columnIndex: Math.max(minIndex, newColumnIndex),
                rowIndex: cursor.coordinates.rowIndex,
            });
            break;
        }
        case 'right': {
            const maxIndex = columnsCount - 1;
            const newColumnIndex = getJoinedCellRight(
                joinedCells,
                cursor.coordinates.rowIndex,
                cursor.coordinates.columnIndex + 1,
            );
            cell = new Cell({
                rowIndex: cursor.coordinates.rowIndex,
                columnIndex: Math.min(maxIndex, newColumnIndex),
            });
            break;
        }
    }

    return cell;
}

export * from './DraggingRange';
