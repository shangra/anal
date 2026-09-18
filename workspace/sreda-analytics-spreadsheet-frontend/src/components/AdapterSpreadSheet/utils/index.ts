import { REG_EXP_EXCEL_CELL_COORDINATE } from '../../SpreadSheetPlugins/PluginFormulas/constants';
import { Y_REGEX } from '../constants';
import { Cell, JoinedCell, Range } from '../models';
import { ColumnCoordinate, ExcelColumnIndexType, ExcelSpreadSheetCoordinate, IButton, ObjectIndexes } from '../types';

/**
 * Перевод индекса колонки в число используемое в координатах ячейки
 * @param columnIndex индекс колонки
 */
export const convertColumnIndexToColumnCoordinate = (columnIndex: number): ExcelColumnIndexType => {
    if (typeof columnIndex !== 'number' || Math.floor(columnIndex) !== columnIndex || columnIndex < 0) {
        throw new Error('convertColumnIndexToColumnCoordinate: columnIndex is not valid index');
    }

    let result = '';
    let raws = columnIndex + 1;

    while (raws !== 0) {
        const remainder = raws % 26;
        raws -= remainder;
        raws = remainder === 0 ? raws / 26 - 1 : raws / 26;

        const code = 64 + (remainder === 0 ? 26 : remainder);

        result += String.fromCodePoint(code);
    }

    return result.split('').reverse().join('') as ExcelColumnIndexType;
};

/**
 * Перевод координатного представление индекса в индекс колонки
 * @param columnCoordinate индекс колонки
 */
export const convertColumnCoordinateToColumnIndex = (columnCoordinate: ColumnCoordinate): number => {
    if (typeof columnCoordinate !== 'string' || !Y_REGEX.test(columnCoordinate)) {
        throw new Error('convertColumnCoordinateToColumnIndex: columnCoordinate is not valid coordinate');
    }

    const computedColumnCoordinate = columnCoordinate.split('').reverse().join('');
    let raws = 0;

    for (let charIndex = 0; charIndex <= computedColumnCoordinate.length - 1; charIndex++) {
        const char = computedColumnCoordinate[charIndex];
        const code = (char.codePointAt(0) || 0) - 64;
        const rawsOfPosition = code * 26 ** charIndex;
        raws += rawsOfPosition;
    }

    return raws - 1;
};

export const generateExcelSpreadSheetCoordinate = (indexes: ObjectIndexes): ExcelSpreadSheetCoordinate => {
    const column = convertColumnIndexToColumnCoordinate(indexes.columnIndex);

    return `${column}${indexes.rowIndex + 1}`;
};

export const parseExcelSpreadSheetCoordinate = (coordinate: ExcelSpreadSheetCoordinate): ObjectIndexes | null => {
    let result: ObjectIndexes | null = null;
    const res = coordinate.match(REG_EXP_EXCEL_CELL_COORDINATE);
    if (res) {
        const matchesCell = [res];
        for (const key in matchesCell) {
            const match = matchesCell[key];
            const { col, row } = match.groups as {
                col: ExcelColumnIndexType;
                row: string;
            };
            result = {
                rowIndex: parseInt(row, 10) - 1,
                columnIndex: convertColumnCoordinateToColumnIndex(col),
            };
        }
    }
    return result;
};

export const getJoinedCellBottom = (joinedCells: JoinedCell[], rowIndex: number, columnIndex: number) => {
    const joinedCell = joinedCells.find((jc) => jc.contains(new Cell({ rowIndex, columnIndex })));

    if (
        joinedCell &&
        (rowIndex !== joinedCell.topLeft.coordinates.rowIndex || columnIndex !== joinedCell.topLeft.coordinates.columnIndex)
    ) {
        return joinedCell.range.bottomRight.coordinates.rowIndex + 1;
    }
    return rowIndex;
};

export const getJoinedCellTop = (joinedCells: JoinedCell[], rowIndex: number, columnIndex: number) => {
    const joinedCell = joinedCells.find((jc) => jc.contains(new Cell({ rowIndex, columnIndex })));

    if (joinedCell && rowIndex !== joinedCell.topLeft.coordinates.rowIndex) {
        if (columnIndex !== joinedCell.topLeft.coordinates.columnIndex) {
            return joinedCell.topLeft.coordinates.rowIndex - 1;
        }
        return joinedCell.topLeft.coordinates.rowIndex;
    }
    return rowIndex;
};

export const getJoinedCellLeft = (joinedCells: JoinedCell[], rowIndex: number, columnIndex: number) => {
    const joinedCell = joinedCells.find((jc) => jc.contains(new Cell({ rowIndex, columnIndex })));

    if (joinedCell && columnIndex !== joinedCell.topLeft.coordinates.columnIndex) {
        if (rowIndex !== joinedCell.topLeft.coordinates.rowIndex) {
            return joinedCell.range.topLeft.coordinates.columnIndex - 1;
        }
        return joinedCell.range.topLeft.coordinates.columnIndex;
    }
    return columnIndex;
};

export const getJoinedCellRight = (joinedCells: JoinedCell[], rowIndex: number, columnIndex: number) => {
    const joinedCell = joinedCells.find((jc) => jc.contains(new Cell({ rowIndex, columnIndex })));

    if (
        joinedCell &&
        (rowIndex !== joinedCell.topLeft.coordinates.rowIndex || columnIndex !== joinedCell.topLeft.coordinates.columnIndex)
    ) {
        return joinedCell.bottomRight.coordinates.columnIndex + 1;
    }
    return columnIndex;
};

/**
 * Debounced function type
 */
export type DebouncedFunction<T extends (...args: any[]) => any> = {
    (...args: Parameters<T>): Promise<ReturnType<T>>;
    cancel: () => void;
    flush: () => Promise<ReturnType<T> | undefined>;
};

/**
 * Debounce utility function
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): DebouncedFunction<T> {
    let timeoutId: NodeJS.Timeout | null = null;
    let resolveQueue: ((value: ReturnType<T>) => void)[] = [];
    let lastResult: ReturnType<T> | undefined;
    let inProgress = false;

    const debounced = function (...args: Parameters<T>): Promise<ReturnType<T>> {
        return new Promise((resolve) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Store the resolve function for later call
            resolveQueue.push(resolve);

            timeoutId = setTimeout(async () => {
                inProgress = true;
                try {
                    lastResult = await func.apply(debounced, args);
                    // Resolve all pending promises with the same result
                    resolveQueue.forEach((r) => r(lastResult!));
                } catch (error) {
                    // If there's an error, reject all pending promises
                    resolveQueue.forEach((r) => {
                        // Cast to any to use reject
                        (r as any)(Promise.reject(error));
                    });
                } finally {
                    resolveQueue = [];
                    inProgress = false;
                }
            }, wait);
        });
    };

    debounced.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        resolveQueue = [];
    };

    debounced.flush = async (): Promise<ReturnType<T> | undefined> => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        if (inProgress) {
            // If function is currently executing, wait for it to complete
            return new Promise((resolve) => {
                const checkCompletion = () => {
                    if (!inProgress) {
                        resolve(lastResult);
                    } else {
                        setTimeout(checkCompletion, 10);
                    }
                };
                checkCompletion();
            });
        }

        return lastResult;
    };

    return debounced as DebouncedFunction<T>;
}

export function toReadonlyMap<K, V>(map: Map<K, V>): ReadonlyMap<K, V> {
    return new Proxy(map, {
        get(target, prop) {
            if (prop === 'set' || prop === 'delete' || prop === 'clear') {
                return () => {
                    throw new Error('Map is readonly');
                };
            }
            const value = (target as any)[prop];
            return typeof value === 'function' ? value.bind(target) : value;
        },
    });
}

export function toReadonlyMatrix(matrix: Map<number, Map<number, any>>): ReadonlyMap<number, ReadonlyMap<number, any>> {
    // Кэш уже обёрнутых строк, чтобы не создавать прокси повторно
    const cache = new Map<number, ReadonlyMap<number, any>>();

    return new Proxy(matrix, {
        get(target, prop) {
            // Блокируем мутирующие методы внешнего Map
            if (prop === 'set' || prop === 'delete' || prop === 'clear') {
                return () => {
                    throw new Error('Map is readonly');
                };
            }

            // Перехватываем .get(), чтобы оборачивать строки на лету
            if (prop === 'get') {
                return (key: number) => {
                    const row = target.get(key);
                    if (row === undefined) return undefined;

                    if (!cache.has(key)) {
                        cache.set(key, toReadonlyMap(row));
                    }
                    return cache.get(key);
                };
            }

            // Перехватываем итераторы, чтобы они тоже возвращали обёрнутые строки
            if (prop === Symbol.iterator || prop === 'entries') {
                return function* () {
                    for (const [key, row] of target) {
                        if (!cache.has(key)) {
                            cache.set(key, toReadonlyMap(row));
                        }
                        yield [key, cache.get(key)] as [number, ReadonlyMap<number, any>];
                    }
                };
            }

            if (prop === 'values') {
                return function* () {
                    for (const [key, row] of target) {
                        if (!cache.has(key)) {
                            cache.set(key, toReadonlyMap(row));
                        }
                        yield cache.get(key) as ReadonlyMap<number, any>;
                    }
                };
            }

            const value = (target as any)[prop];
            return typeof value === 'function' ? value.bind(target) : value;
        },
    }) as ReadonlyMap<number, ReadonlyMap<number, any>>;
}

export * from './StyleManager';
export * from './SparseMatrixHelper/SparseMatrixHelper';
