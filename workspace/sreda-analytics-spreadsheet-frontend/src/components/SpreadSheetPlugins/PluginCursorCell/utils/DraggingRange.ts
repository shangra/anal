import { Cell, JoinedCell, Range } from '../../../AdapterSpreadSheet/models';

export class DraggingRange {
    private startCell: Cell;

    private totalRows: number;

    private totalColumns: number;

    private _currentRange: Range;

    private joinedCells: JoinedCell[];

    private isSubtractionMode: boolean;

    constructor(startCell: Cell, totalRows: number, totalColumns: number, joinedCells: JoinedCell[] = []) {
        this.startCell = startCell;
        this.totalRows = totalRows;
        this.totalColumns = totalColumns;
        this.joinedCells = joinedCells;
        this.isSubtractionMode = false;

        const isColumnHeader = startCell.coordinates.rowIndex === -1;
        const isRowHeader = startCell.coordinates.columnIndex === -1;

        if (isColumnHeader) {
            this._currentRange = new Range(
                new Cell({ rowIndex: 0, columnIndex: startCell.coordinates.columnIndex }),
                new Cell({ rowIndex: totalRows - 1, columnIndex: startCell.coordinates.columnIndex }),
            );
        } else if (isRowHeader) {
            this._currentRange = new Range(
                new Cell({ rowIndex: startCell.coordinates.rowIndex, columnIndex: 0 }),
                new Cell({ rowIndex: startCell.coordinates.rowIndex, columnIndex: totalColumns - 1 }),
            );
        } else {
            let currentRange = new Range(this.startCell);
            for (const joinedCell of joinedCells) {
                if (currentRange.intersects(joinedCell.range)) {
                    currentRange = currentRange.add(joinedCell.range);
                }
            }
            this._currentRange = currentRange;
        }
    }

    getCurrentRange(): Range {
        return this._currentRange;
    }

    setSubtractionMode(enabled: boolean) {
        this.isSubtractionMode = enabled;
    }

    isSubtraction(): boolean {
        return this.isSubtractionMode;
    }

    drag(cell: Cell): { isChanged: boolean; range: Range } {
        const isColumnHeader = this.startCell.coordinates.rowIndex === -1;
        const isRowHeader = this.startCell.coordinates.columnIndex === -1;

        let newRange: Range;

        if (isColumnHeader) {
            const startCol = Math.min(this.startCell.coordinates.columnIndex, Math.max(0, cell.coordinates.columnIndex));
            const endCol = Math.max(this.startCell.coordinates.columnIndex, cell.coordinates.columnIndex);
            newRange = new Range(
                new Cell({ rowIndex: 0, columnIndex: startCol }),
                new Cell({ rowIndex: this.totalRows - 1, columnIndex: endCol }),
            );
        } else if (isRowHeader) {
            const startRow = Math.min(this.startCell.coordinates.rowIndex, Math.max(0, cell.coordinates.rowIndex));
            const endRow = Math.max(this.startCell.coordinates.rowIndex, cell.coordinates.rowIndex);
            newRange = new Range(
                new Cell({ rowIndex: startRow, columnIndex: 0 }),
                new Cell({ rowIndex: endRow, columnIndex: this.totalColumns - 1 }),
            );
        } else {
            newRange = new Range(
                this.startCell,
                new Cell({
                    rowIndex: Math.max(0, cell.coordinates.rowIndex),
                    columnIndex: Math.max(0, cell.coordinates.columnIndex),
                }),
            );
            for (const joinedCell of this.joinedCells) {
                if (newRange.intersects(joinedCell.range)) {
                    newRange = newRange.add(joinedCell.range);
                }
            }
        }

        const isChanged = !this._currentRange.isEqual(newRange);
        this._currentRange = newRange;

        return { isChanged, range: newRange };
    }

    dragEnd(): Range {
        return this._currentRange;
    }
}
