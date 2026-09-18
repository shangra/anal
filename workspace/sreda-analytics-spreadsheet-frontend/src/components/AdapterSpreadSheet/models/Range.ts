import { ObjectIndexes } from '../types';
import { generateExcelSpreadSheetCoordinate } from '../utils';
import { Cell } from './Cell';
import { JoinedCell } from './JoinedCell';

export class Range {
    private _start: ObjectIndexes;

    private _end: ObjectIndexes;

    private _cursor: ObjectIndexes | null;

    private _topLeft: Cell | null = null;

    private _bottomRight: Cell | null = null;

    private _size: number | null = null;

    constructor(start: Cell | ObjectIndexes, end?: Cell | ObjectIndexes, cursor?: Cell | ObjectIndexes | null) {
        const startCoords = start instanceof Cell ? start.coordinates : start;
        const endCoords = end instanceof Cell ? (end as Cell).coordinates : end ?? startCoords;

        // FIX(3.1): Заменяем structuredClone на прямое копирование полей
        this._start = { rowIndex: startCoords.rowIndex, columnIndex: startCoords.columnIndex };
        this._end = { rowIndex: endCoords.rowIndex, columnIndex: endCoords.columnIndex };

        if (cursor == null) {
            this._cursor = null;
        } else {
            const cursorCell = cursor instanceof Cell ? cursor : new Cell(cursor);
            this._cursor = this.contains(cursorCell)
                ? { rowIndex: cursorCell.coordinates.rowIndex, columnIndex: cursorCell.coordinates.columnIndex }
                : null;
        }
    }

    // ─── cursor ──────────────────────────────────────────────────────────────

    get cursor(): Cell {
        return this._cursor ? new Cell(this._cursor) : this.topLeft;
    }

    get text(): string {
        return this.size > 1
            ? `${generateExcelSpreadSheetCoordinate(this.topLeft.coordinates)}:${generateExcelSpreadSheetCoordinate(
                  this.bottomRight.coordinates,
              )}`
            : generateExcelSpreadSheetCoordinate(this.topLeft.coordinates);
    }

    withCursor(cursor: Cell | ObjectIndexes): Range {
        const coords = cursor instanceof Cell ? cursor : new Cell(cursor);
        return new Range(this._start, this._end, this.contains(coords) ? coords.coordinates : this._start);
    }

    // ─── Геттеры с кэшированием ──────────────────────────────────────────────

    get start(): ObjectIndexes {
        return { rowIndex: this._start.rowIndex, columnIndex: this._start.columnIndex };
    }

    get end(): ObjectIndexes {
        return { rowIndex: this._end.rowIndex, columnIndex: this._end.columnIndex };
    }

    get topLeft(): Cell {
        if (!this._topLeft) {
            this._topLeft = new Cell({
                rowIndex: Math.min(this._start.rowIndex, this._end.rowIndex),
                columnIndex: Math.min(this._start.columnIndex, this._end.columnIndex),
            });
        }
        return this._topLeft;
    }

    get bottomRight(): Cell {
        if (!this._bottomRight) {
            this._bottomRight = new Cell({
                rowIndex: Math.max(this._start.rowIndex, this._end.rowIndex),
                columnIndex: Math.max(this._start.columnIndex, this._end.columnIndex),
            });
        }
        return this._bottomRight;
    }

    get size(): number {
        if (this._size === null) {
            const tl = this.topLeft.coordinates;
            const br = this.bottomRight.coordinates;
            this._size = (br.rowIndex - tl.rowIndex + 1) * (br.columnIndex - tl.columnIndex + 1);
        }
        return this._size;
    }

    // ─── Фабричные методы ────────────────────────────────────────────────────

    clone(): Range {
        return new Range(
            { rowIndex: this._start.rowIndex, columnIndex: this._start.columnIndex },
            { rowIndex: this._end.rowIndex, columnIndex: this._end.columnIndex },
            this._cursor ? { rowIndex: this._cursor.rowIndex, columnIndex: this._cursor.columnIndex } : null,
        );
    }

    static fromJoinedCell(joinedCell: JoinedCell): Range {
        return joinedCell.range.clone();
    }

    static from(value: string): Range {
        const regex = /^Range\(R(\d+)C(\d+):R(\d+)C(\d+)\)$/;
        const match = value.match(regex);
        if (!match) {
            throw new Error(`Некорректный формат строки диапазона: "${value}"`);
        }
        const [_, startRow, startColumn, endRow, endColumn] = match.map(Number);
        return new this(
            new Cell({ rowIndex: startRow, columnIndex: startColumn }),
            new Cell({ rowIndex: endRow, columnIndex: endColumn }),
        );
    }

    get(index: number): Cell {
        const originalIndex = index;
        if (index < 0) {
            index = this.size + index;
        }
        if (index < 0 || index >= this.size) {
            throw new RangeError(`Index ${originalIndex} is out of bounds for range of size ${this.size}`);
        }
        const tl = this.topLeft.coordinates;
        const br = this.bottomRight.coordinates;
        const columnsInRow = br.columnIndex - tl.columnIndex + 1;
        const rowIndex = tl.rowIndex + Math.floor(index / columnsInRow);
        const columnIndex = tl.columnIndex + (index % columnsInRow);
        return new Cell({ rowIndex, columnIndex });
    }

    toJoinedCell(mainCell?: Cell): JoinedCell {
        if (mainCell) {
            if (!this.contains(mainCell)) {
                throw new Error('Основная ячейка должна быть в пределах диапазона');
            }
            return new JoinedCell(this, mainCell);
        }
        return JoinedCell.fromRange(this);
    }

    toArray(): Cell[] {
        return Array.from(this);
    }

    toString(): string {
        const tl = this.topLeft.coordinates;
        const br = this.bottomRight.coordinates;
        return `Range(R${tl.rowIndex}C${tl.columnIndex}:R${br.rowIndex}C${br.columnIndex})`;
    }

    add(target: Cell | Range | JoinedCell): Range {
        const tl = this.topLeft.coordinates;
        const br = this.bottomRight.coordinates;

        let targetStartRow: number;
        let targetEndRow: number;
        let targetStartCol: number;
        let targetEndCol: number;

        if (target instanceof JoinedCell) {
            const tr = target.range;
            targetStartRow = tr.topLeft.coordinates.rowIndex;
            targetStartCol = tr.topLeft.coordinates.columnIndex;
            targetEndRow = tr.bottomRight.coordinates.rowIndex;
            targetEndCol = tr.bottomRight.coordinates.columnIndex;
        } else if (target instanceof Range) {
            targetStartRow = target.topLeft.coordinates.rowIndex;
            targetStartCol = target.topLeft.coordinates.columnIndex;
            targetEndRow = target.bottomRight.coordinates.rowIndex;
            targetEndCol = target.bottomRight.coordinates.columnIndex;
        } else {
            targetStartRow = target.coordinates.rowIndex;
            targetEndRow = target.coordinates.rowIndex;
            targetStartCol = target.coordinates.columnIndex;
            targetEndCol = target.coordinates.columnIndex;
        }

        return new Range(
            new Cell({
                rowIndex: Math.min(tl.rowIndex, targetStartRow),
                columnIndex: Math.min(tl.columnIndex, targetStartCol),
            }),
            new Cell({
                rowIndex: Math.max(br.rowIndex, targetEndRow),
                columnIndex: Math.max(br.columnIndex, targetEndCol),
            }),
        );
    }

    remove(target: Cell | Range | JoinedCell): Range[] {
        let targetRange: Range;
        if (target instanceof JoinedCell) targetRange = target.range;
        else if (target instanceof Range) targetRange = target;
        else targetRange = new Range(target);

        const intersection = this.intersection(targetRange);
        if (!intersection) return [this];

        const cr = {
            startRow: this.topLeft.coordinates.rowIndex,
            endRow: this.bottomRight.coordinates.rowIndex,
            startCol: this.topLeft.coordinates.columnIndex,
            endCol: this.bottomRight.coordinates.columnIndex,
        };
        const rr = {
            startRow: targetRange.topLeft.coordinates.rowIndex,
            endRow: targetRange.bottomRight.coordinates.rowIndex,
            startCol: targetRange.topLeft.coordinates.columnIndex,
            endCol: targetRange.bottomRight.coordinates.columnIndex,
        };

        const result: Range[] = [];

        if (cr.startRow < rr.startRow) {
            result.push(
                new Range(
                    new Cell({ rowIndex: cr.startRow, columnIndex: cr.startCol }),
                    new Cell({ rowIndex: rr.startRow - 1, columnIndex: cr.endCol }),
                ),
            );
        }
        if (cr.endRow > rr.endRow) {
            result.push(
                new Range(
                    new Cell({ rowIndex: rr.endRow + 1, columnIndex: cr.startCol }),
                    new Cell({ rowIndex: cr.endRow, columnIndex: cr.endCol }),
                ),
            );
        }
        if (cr.startCol < rr.startCol) {
            result.push(
                new Range(
                    new Cell({ rowIndex: Math.max(cr.startRow, rr.startRow), columnIndex: cr.startCol }),
                    new Cell({ rowIndex: Math.min(cr.endRow, rr.endRow), columnIndex: rr.startCol - 1 }),
                ),
            );
        }
        if (cr.endCol > rr.endCol) {
            result.push(
                new Range(
                    new Cell({ rowIndex: Math.max(cr.startRow, rr.startRow), columnIndex: rr.endCol + 1 }),
                    new Cell({ rowIndex: Math.min(cr.endRow, rr.endRow), columnIndex: cr.endCol }),
                ),
            );
        }

        return result.filter((range) => range.size > 0);
    }

    isEmpty(): boolean {
        return this.size === 0;
    }

    isEqual(other: Range): boolean {
        const a = this.topLeft.coordinates;
        const b = this.bottomRight.coordinates;
        const c = other.topLeft.coordinates;
        const d = other.bottomRight.coordinates;
        return (
            a.rowIndex === c.rowIndex &&
            b.rowIndex === d.rowIndex &&
            a.columnIndex === c.columnIndex &&
            b.columnIndex === d.columnIndex
        );
    }

    contains(target: Cell | JoinedCell): boolean {
        if (target instanceof JoinedCell) {
            return this.contains(target.mainCell) && this.contains(new Cell(target.range.end));
        }
        const tl = this.topLeft.coordinates;
        const br = this.bottomRight.coordinates;
        const tc = target.coordinates;
        return (
            tl.rowIndex <= tc.rowIndex &&
            br.rowIndex >= tc.rowIndex &&
            tl.columnIndex <= tc.columnIndex &&
            br.columnIndex >= tc.columnIndex
        );
    }

    intersection(target: Range | JoinedCell): Range | null {
        const targetRange = target instanceof JoinedCell ? target.range : target;
        const intersectStartRow = Math.max(
            Math.min(this._start.rowIndex, this._end.rowIndex),
            Math.min(targetRange.start.rowIndex, targetRange.end.rowIndex),
        );
        const intersectEndRow = Math.min(
            Math.max(this._start.rowIndex, this._end.rowIndex),
            Math.max(targetRange.start.rowIndex, targetRange.end.rowIndex),
        );
        const intersectStartCol = Math.max(
            Math.min(this._start.columnIndex, this._end.columnIndex),
            Math.min(targetRange.start.columnIndex, targetRange.end.columnIndex),
        );
        const intersectEndCol = Math.min(
            Math.max(this._start.columnIndex, this._end.columnIndex),
            Math.max(targetRange.start.columnIndex, targetRange.end.columnIndex),
        );
        if (intersectStartRow > intersectEndRow || intersectStartCol > intersectEndCol) return null;
        return new Range(
            new Cell({ rowIndex: intersectStartRow, columnIndex: intersectStartCol }),
            new Cell({ rowIndex: intersectEndRow, columnIndex: intersectEndCol }),
        );
    }

    *[Symbol.iterator](): Generator<Cell> {
        const tl = this.topLeft.coordinates;
        const br = this.bottomRight.coordinates;
        for (let { rowIndex } = tl; rowIndex <= br.rowIndex; rowIndex++) {
            for (let { columnIndex } = tl; columnIndex <= br.columnIndex; columnIndex++) {
                yield new Cell({ rowIndex, columnIndex });
            }
        }
    }

    cells() {
        return this[Symbol.iterator]();
    }

    forEach(callback: (cell: Cell, index: number, range: Range) => void, thisArg?: any): void {
        let index = 0;
        for (const cell of this) {
            thisArg ? callback.call(thisArg, cell, index, this) : callback(cell, index, this);
            index++;
        }
    }

    map<T>(callback: (cell: Cell, index: number, range: Range) => T, thisArg?: any): T[] {
        const result: T[] = [];
        let index = 0;
        for (const cell of this) {
            result.push(thisArg ? callback.call(thisArg, cell, index, this) : callback(cell, index, this));
            index++;
        }
        return result;
    }

    reduce<T>(callback: (acc: T, cell: Cell, index: number, range: Range) => T, initialValue: T): T {
        let accumulator = initialValue;
        let index = 0;
        for (const cell of this) {
            accumulator = callback(accumulator, cell, index, this);
            index++;
        }
        return accumulator;
    }

    some(callback: (cell: Cell, index: number, range: Range) => boolean, thisArg?: any): boolean {
        let index = 0;
        for (const cell of this) {
            if (thisArg ? callback.call(thisArg, cell, index, this) : callback(cell, index, this)) return true;
            index++;
        }
        return false;
    }

    intersects(target: Range | JoinedCell): boolean {
        return this.intersection(target) !== null;
    }

    isAdjacentTo(target: Range | JoinedCell): boolean {
        const targetRange = target instanceof JoinedCell ? target.range : target;
        const a = this.topLeft.coordinates;
        const b = this.bottomRight.coordinates;
        const c = targetRange.topLeft.coordinates;
        const d = targetRange.bottomRight.coordinates;

        return (
            (b.columnIndex + 1 === c.columnIndex && a.rowIndex <= d.rowIndex && b.rowIndex >= c.rowIndex) ||
            (a.columnIndex - 1 === d.columnIndex && a.rowIndex <= d.rowIndex && b.rowIndex >= c.rowIndex) ||
            (b.rowIndex + 1 === c.rowIndex && a.columnIndex <= d.columnIndex && b.columnIndex >= c.columnIndex) ||
            (a.rowIndex - 1 === d.rowIndex && a.columnIndex <= d.columnIndex && b.columnIndex >= c.columnIndex)
        );
    }
}
