import { Cell } from './Cell';
import { Range } from './Range';

export class JoinedCell {
    private _range: Range;

    private _mainCell: Cell;

    /**
     * Создает соединение из диапазона и основной ячейки в этом диапазоне
     * @param range Диапазон, который описывает объединяемые ячейки
     * @param mainCell Главная ячейка (обычно верхняя-левая) внутри диапазона
     * @throws `Error`, если главная ячейка вне диапазона
     */
    constructor(range: Range, mainCell: Cell) {
        if (!range.contains(mainCell)) {
            throw new Error('Главная ячейка должна быть внутри диапазона');
        }
        if (range.size < 2) {
            throw new Error('Для объединения должно быть 2 и более ячейки');
        }
        this._range = range;
        this._mainCell = mainCell;
    }

    /**
     * Создает `JoinedCell` из диапазона, используя верхнюю-левую ячейку, как главную
     * @param range Диапазон из которого создается объединенная ячейка
     */
    static fromRange(range: Range): JoinedCell {
        const startRow = Math.min(range.start.rowIndex, range.end.rowIndex);
        const startColumn = Math.min(range.start.columnIndex, range.end.columnIndex);
        const mainCell = new Cell({ rowIndex: startRow, columnIndex: startColumn });
        return new JoinedCell(range, mainCell);
    }

    /**
     * Диапазон объединенной ячейки
     */
    get range(): Range {
        return this._range;
    }

    /**
     * Глявная ячейка объединенной ячейки
     */
    get mainCell(): Cell {
        return this._mainCell;
    }

    /**
     * Массив всех ячеек объединенной ячейки
     */
    get cells(): Cell[] {
        return this._range.toArray();
    }

    /**
     * Количество ячеек в объединенной ячейке
     */
    get size(): number {
        return this._range.size;
    }

    /**
     * Получает верхнюю-левую ячейку объединенной ячейки
     */
    get topLeft(): Cell {
        const startRow = Math.min(this._range.start.rowIndex, this._range.end.rowIndex);
        const startColumn = Math.min(this._range.start.columnIndex, this._range.end.columnIndex);
        return new Cell({ rowIndex: startRow, columnIndex: startColumn });
    }

    /**
     * Получает нижнюю-правую ячейку объединенной ячейки
     */
    get bottomRight(): Cell {
        const endRow = Math.max(this._range.start.rowIndex, this._range.end.rowIndex);
        const endColumn = Math.max(this._range.start.columnIndex, this._range.end.columnIndex);
        return new Cell({ rowIndex: endRow, columnIndex: endColumn });
    }

    /**
     * Проверяет содержится ли ячейка или объединая ячейка в объединенной ячейке
     */
    contains(target: Cell | JoinedCell): boolean {
        if (target instanceof Cell) {
            return this._range.contains(target);
        }
        return this._range.contains(target.mainCell) && this._range.contains(new Cell(target.range.end));
    }

    /**
     * Проверяет пересекается ли диапазон или объединенная ячейка с объединенной ячейкой
     */
    intersects(target: Range | JoinedCell): boolean {
        const targetRange = target instanceof JoinedCell ? target.range : target;
        return this._range.intersection(targetRange) !== null;
    }

    /**
     * Получает пересечение с другим диапазоном или объединенной ячейкой
     */
    intersection(target: Range | JoinedCell): JoinedCell | null {
        const targetRange = target instanceof JoinedCell ? target.range : target;
        const intersectionRange = this._range.intersection(targetRange);

        if (!intersectionRange) {
            return null;
        }

        let mainCell: Cell;
        if (intersectionRange.contains(this._mainCell)) {
            mainCell = this._mainCell;
        } else {
            const startRow = Math.min(intersectionRange.start.rowIndex, intersectionRange.end.rowIndex);
            const startColumn = Math.min(intersectionRange.start.columnIndex, intersectionRange.end.columnIndex);
            mainCell = new Cell({ rowIndex: startRow, columnIndex: startColumn });
        }

        return new JoinedCell(intersectionRange, mainCell);
    }

    /**
     * Проверяет что объединенная ячейка равна другой объединенной ячейке
     */
    isEqual(other: JoinedCell): boolean {
        const thisIntersection = this._range.intersection(other.range);
        return thisIntersection !== null && thisIntersection.size === this.size && this._mainCell.isEqual(other.mainCell);
    }

    /**
     * Итерирует все ячейки в объединенной ячейке
     */
    *[Symbol.iterator](): Generator<Cell> {
        for (const cell of this._range) {
            yield cell;
        }
    }

    /**
     * Выполняет переданную функцию единожды на каждую ячейку объединенной ячейки
     * @param callback Функция, для выполнения на каждой ячейке, принимает аргументы:
     *   - `cell`: Текущая обрабатываемая ячейка
     *   - `index`: Zero-based индекс обрабатываемой ячейки в объединенной ячейке
     *   - `range`: Обрабатываемый объект `JoinedCell`
     * @param thisArg Необязательный аргумент `this` используемый при вызове `callback`
     */
    forEach(callback: (cell: Cell, index: number, joinedCell: JoinedCell) => void, thisArg?: any): void {
        this._range.forEach((cell, index) => {
            if (thisArg) {
                callback.call(thisArg, cell, index, this);
            } else {
                callback(cell, index, this);
            }
        });
    }

    /**
     * Создает новый массив с результатами вызова предоставленной функции на каждой ячейке в объединенной ячейке
     * @param callback Функция, которая создает элемент нового массива, принимая три аргумента:
     *   - `cell`: Текущая обрабатываемая ячейка
     *   - `index`: Zero-based индекс обрабатываемой ячейки в диапазоне
     *   - `range`: Обрабатываемый объект `JoinedCell`
     * @param thisArg Необязательное значение для использования в качестве `this` при выполнении `callback`
     * @returns Новый массив с результатами вызова `callback` на каждой ячейке
     */
    map<T>(callback: (cell: Cell, index: number, joinedCell: JoinedCell) => T, thisArg?: any): T[] {
        return this._range.map(
            (cell, index) => (thisArg ? callback.call(thisArg, cell, index, this) : callback(cell, index, this)),
            thisArg,
        );
    }

    /**
     * Executes a reducer function on each cell of the joined range, resulting in a single output value
     * @param callback Reducer function that takes four arguments:
     *   - accumulator: The accumulated value previously returned in the last invocation
     *   - cell: The current cell being processed
     *   - index: The zero-based index of the current cell in the iteration
     *   - joinedCell: The JoinedCell object being traversed
     * @param initialValue Value to use as the first argument to the first call of the callback
     * @returns The value that results from running the reducer across all cells
     */
    reduce<T>(callback: (accumulator: T, cell: Cell, index: number, joinedCell: JoinedCell) => T, initialValue: T): T {
        return this._range.reduce((acc, cell, index) => callback(acc, cell, index, this), initialValue);
    }

    /**
     * Конвертирует объединенную ячейку в массив `Cells`
     */
    toArray(): Cell[] {
        return this._range.toArray();
    }

    /**
     * Возвращает строковое представление объединенной ячейки
     */
    toString(): string {
        const startRow = Math.min(this._range.start.rowIndex, this._range.end.rowIndex);
        const endRow = Math.max(this._range.start.rowIndex, this._range.end.rowIndex);
        const startColumn = Math.min(this._range.start.columnIndex, this._range.end.columnIndex);
        const endColumn = Math.max(this._range.start.columnIndex, this._range.end.columnIndex);

        const mainInfo = `Cell(R${this._mainCell.coordinates.rowIndex}C${this._mainCell.coordinates.columnIndex})`;

        return `JoinedCell(${mainInfo}, Range(R${startRow}C${startColumn}:R${endRow}C${endColumn}))`;
    }

    /**
     * Создает копию объединенной ячейки
     */
    clone(): JoinedCell {
        return new JoinedCell(this._range.clone(), new Cell(this._mainCell.coordinates));
    }

    /**
     * Проверяет, находится ли эта соединенная ячейка рядом с другой ячейкой или диапазоном
     */
    isAdjacentTo(target: Cell | Range | JoinedCell): boolean {
        let targetRange: Range;

        if (target instanceof Cell) {
            targetRange = new Range(target);
        } else if (target instanceof JoinedCell) {
            targetRange = target.range;
        } else {
            targetRange = target;
        }

        return this._range.isAdjacentTo(targetRange);
    }
}
