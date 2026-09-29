import { updateCellValueInTableData } from '../../utils/cellEdit';
import type { ICell } from '../../types';

const createCell = (columnName: string, value: unknown, rowIndex = 0): ICell => ({
    columnIndex: 0,
    rowIndex,
    columnName,
    type: 'text',
    value: { originalData: value, viewedData: value },
    hierarchy: null,
    editable: null,
});

describe('updateCellValueInTableData', () => {
    test('updates both originalData and viewedData of the target cell', () => {
        const rows: (ICell | ICell[])[][] = [[createCell('code', 'A-1'), createCell('name', 'First')]];

        const next = updateCellValueInTableData(rows, { rowIndex: 0, field: 'name', value: 'Rewritten' });

        const target = (next[0][1] as ICell).value;
        expect(target.originalData).toBe('Rewritten');
        expect(target.viewedData).toBe('Rewritten');
    });

    test('keeps untouched rows and cells by reference', () => {
        const rows: (ICell | ICell[])[][] = [
            [createCell('code', 'A-1'), createCell('name', 'First')],
            [createCell('code', 'A-2'), createCell('name', 'Second')],
        ];

        const next = updateCellValueInTableData(rows, { rowIndex: 0, field: 'name', value: 'Rewritten' });

        expect(next).not.toBe(rows);
        expect(next[1]).toBe(rows[1]);
        expect(next[0][0]).toBe(rows[0][0]);
        expect(rows[0][1]).toEqual(expect.objectContaining({ value: { originalData: 'First', viewedData: 'First' } }));
    });

    test('updates a cell inside a column group', () => {
        const rows: (ICell | ICell[])[][] = [
            [createCell('code', 'A-1'), [createCell('width', 10), createCell('height', 20)]],
        ];

        const next = updateCellValueInTableData(rows, { rowIndex: 0, field: 'height', value: 99 });

        const group = next[0][1] as ICell[];
        expect(group[0].value.viewedData).toBe(10);
        expect(group[1].value.viewedData).toBe(99);
    });

    test('returns the same array when field is missing in the row', () => {
        const rows: (ICell | ICell[])[][] = [[createCell('code', 'A-1')]];

        const next = updateCellValueInTableData(rows, { rowIndex: 0, field: 'unknown', value: 'x' });

        expect(next).toBe(rows);
    });

    test('returns the same array for out of range row index', () => {
        const rows: (ICell | ICell[])[][] = [[createCell('code', 'A-1')]];

        expect(updateCellValueInTableData(rows, { rowIndex: 5, field: 'code', value: 'x' })).toBe(rows);
        expect(updateCellValueInTableData(rows, { rowIndex: -1, field: 'code', value: 'x' })).toBe(rows);
    });
});
