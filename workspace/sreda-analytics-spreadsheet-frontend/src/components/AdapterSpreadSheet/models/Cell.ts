import { ObjectIndexes } from '../types';
import { generateExcelSpreadSheetCoordinate } from '../utils';

export class Cell {
    private readonly _rowIndex: number;

    private readonly _columnIndex: number;

    private readonly _coords: Readonly<ObjectIndexes>;

    constructor(coordinate: ObjectIndexes) {
        this._rowIndex = coordinate.rowIndex;
        this._columnIndex = coordinate.columnIndex;
        this._coords = Object.freeze({ rowIndex: this._rowIndex, columnIndex: this._columnIndex });
    }

    get coordinates(): Readonly<ObjectIndexes> {
        return this._coords;
    }

    get rowIndex(): number {
        return this._rowIndex;
    }

    get columnIndex(): number {
        return this._columnIndex;
    }

    get key(): string {
        return `${this.rowIndex}:${this.columnIndex}`;
    }

    toString(): string {
        return generateExcelSpreadSheetCoordinate(this.coordinates);
    }

    isEqual(cell: Cell): boolean {
        return this._rowIndex === cell._rowIndex && this._columnIndex === cell._columnIndex;
    }

    clone(): Cell {
        return new Cell({ rowIndex: this._rowIndex, columnIndex: this._columnIndex });
    }
}
