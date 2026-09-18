import { ICell } from '../../types';

export class SparseMatrixHelper {
    static setCell(matrix: Map<number, Map<number, ICell>>, rowIndex: number, columnIndex: number, value: ICell): void {
        if (rowIndex < 0 || columnIndex < 0) return;
        if (!matrix.has(rowIndex)) matrix.set(rowIndex, new Map<number, ICell>());
        matrix.get(rowIndex)!.set(columnIndex, value);
    }

    static deleteCell(matrix: Map<number, Map<number, ICell>>, rowIndex: number, columnIndex: number): void {
        if (rowIndex < 0 || columnIndex < 0) return;
        matrix.get(rowIndex)?.delete(columnIndex);
        if (!matrix.get(rowIndex)?.size) matrix.delete(rowIndex);
    }

    static insertColumn(
        matrix: Map<number, Map<number, ICell>>,
        columnIndex: number,
        position: 'before' | 'after',
        count = 1,
    ): void {
        const insertIdx = position === 'before' ? columnIndex : columnIndex + 1;
        matrix.forEach((rowMap, rowIndex) => {
            const newRowMap = new Map<number, ICell>();
            rowMap.forEach((value, colIndex) => {
                newRowMap.set(colIndex >= insertIdx ? colIndex + count : colIndex, value);
            });
            matrix.set(rowIndex, newRowMap);
        });
    }

    static insertRow(
        matrix: Map<number, Map<number, ICell>>,
        rowIndex: number,
        position: 'before' | 'after',
        count = 1,
    ): void {
        const insertIdx = position === 'before' ? rowIndex : rowIndex + 1;
        const toShift = [...matrix.entries()].filter(([r]) => r >= insertIdx).sort((a, b) => b[0] - a[0]);
        for (const [r, rowMap] of toShift) {
            matrix.delete(r);
            matrix.set(r + count, rowMap);
        }
        matrix.set(insertIdx, new Map<number, ICell>());
    }

    /** @deprecated Мутирующая версия: используйте deleteColumnInPlace */
    static deleteColumn(
        matrix: Map<number, Map<number, ICell>>,
        deleteColumnIndex: number,
        count = 1,
    ): Map<number, Map<number, ICell>> {
        // ... оригинальный код
        if (deleteColumnIndex < 0) return matrix;
        const dist = new Map<number, Map<number, ICell>>();
        matrix.forEach((rowMap, rowIndex) => {
            const newRowMap = new Map<number, ICell>();
            rowMap.forEach((value, columnIndex) => {
                if (columnIndex < deleteColumnIndex) newRowMap.set(columnIndex, value);
                else if (columnIndex > deleteColumnIndex + count - 1) newRowMap.set(columnIndex - count, value);
            });
            dist.set(rowIndex, newRowMap);
        });
        return dist;
    }

    /** @deprecated Мутирующая версия: используйте deleteRowInPlace */
    static deleteRow(
        matrix: Map<number, Map<number, ICell>>,
        deleteRowIndex: number,
        count = 1,
    ): Map<number, Map<number, ICell>> {
        if (deleteRowIndex < 0) return matrix;
        const dist = new Map<number, Map<number, ICell>>();
        matrix.forEach((rowMap, rowIndex) => {
            if (rowIndex < deleteRowIndex) dist.set(rowIndex, rowMap);
            else if (rowIndex > deleteRowIndex + count - 1) dist.set(rowIndex - count, rowMap);
        });
        return dist;
    }

    static getCell(matrix: Map<number, Map<number, ICell>>, rowIndex: number, columnIndex: number): ICell | null {
        return matrix.has(rowIndex) && matrix.get(rowIndex)!.has(columnIndex) ? matrix.get(rowIndex)!.get(columnIndex)! : null;
    }

    static getRowCells(matrix: Map<number, Map<number, ICell>>, rowIndex: number): Map<number, ICell> {
        return matrix.has(rowIndex) ? matrix.get(rowIndex)! : new Map<number, ICell>();
    }

    static getMatrixSize(matrix: Map<number, Map<number, ICell>>) {
        let maxRowIndex = 0;
        let maxColumnIndex = 0;
        for (const [rowIndex, rowMap] of matrix) {
            if (maxRowIndex < rowIndex) maxRowIndex = rowIndex;
            for (const [columnIndex] of rowMap) {
                if (maxColumnIndex < columnIndex) maxColumnIndex = columnIndex;
            }
        }
        return { rowsAmount: maxRowIndex + 1, columnsAmount: maxColumnIndex + 1 };
    }

    static insertRange() {
        throw new Error('SparseMatrixHelper.insertRange: не реализован.');
    }

    static deleteRange() {
        throw new Error('SparseMatrixHelper.deleteRange: не реализован.');
    }
}
