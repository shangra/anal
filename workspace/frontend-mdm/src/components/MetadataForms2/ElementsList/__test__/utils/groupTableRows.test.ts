import { groupTableRows, isTreeRow, normalizeCells } from '../../groupTableRows';
import type { ICell } from '../../types';
import type { ITreeRow } from '../../ReactWindowWrapperCombined/types';

const createMockCell = (colName: string, value: unknown): ICell => ({
    columnIndex: 0,
    rowIndex: 0,
    columnName: colName,
    type: 'text',
    value: { originalData: value, viewedData: value },
    hierarchy: null,
    editable: null,
});

describe('groupTableRows', () => {
    describe('no grouping', () => {
        test('should return rows as-is when groupByFields is empty', () => {
            const rows: ICell[][] = [
                [createMockCell('name', 'Item 1')],
                [createMockCell('name', 'Item 2')],
            ];

            const result = groupTableRows(rows, []);

            expect(result).toBe(rows);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('single field grouping', () => {
        test('should group rows by single field', () => {
            const rows: ICell[][] = [
                [
                    createMockCell('group', 'A'),
                    createMockCell('name', 'Item 1'),
                ],
                [
                    createMockCell('group', 'B'),
                    createMockCell('name', 'Item 2'),
                ],
                [
                    createMockCell('group', 'A'),
                    createMockCell('name', 'Item 3'),
                ],
            ];

            const result = groupTableRows(rows, ['group']);

            expect(Array.isArray(result)).toBe(true);
            const treeRows = result as ITreeRow[];

            const groupA = treeRows.find(
                (t) => t.isGroup && t.groupField === 'group' && t.groupValue === 'A',
            );
            const groupB = treeRows.find(
                (t) => t.isGroup && t.groupField === 'group' && t.groupValue === 'B',
            );

            expect(groupA).toBeDefined();
            expect(groupB).toBeDefined();
            expect(groupA?.children).toHaveLength(2);
            expect(groupB?.children).toHaveLength(1);
        });
    });

    describe('nested grouping', () => {
        test('should group rows by multiple fields', () => {
            const rows: ICell[][] = [
                [
                    createMockCell('region', 'East'),
                    createMockCell('category', 'Food'),
                    createMockCell('name', 'Rice'),
                ],
                [
                    createMockCell('region', 'East'),
                    createMockCell('category', 'Food'),
                    createMockCell('name', 'Noodles'),
                ],
                [
                    createMockCell('region', 'West'),
                    createMockCell('category', 'Food'),
                    createMockCell('name', 'Pizza'),
                ],
            ];

            const result = groupTableRows(rows, ['region', 'category']);

            expect(Array.isArray(result)).toBe(true);
            const treeRows = result as ITreeRow[];

            const eastGroup = treeRows.find(
                (t) => t.isGroup && t.groupField === 'region' && t.groupValue === 'East',
            );
            expect(eastGroup).toBeDefined();
            expect(eastGroup?.children).toHaveLength(1);
        });
    });

    describe('edge cases', () => {
        test('should handle empty rows', () => {
            const result = groupTableRows([], ['group']);
            expect(Array.isArray(result)).toBe(true);
        });

        test('should handle rows with null values', () => {
            const rows: ICell[][] = [
                [createMockCell('group', null)],
                [createMockCell('group', 'A')],
            ];

            const result = groupTableRows(rows, ['group']);
            expect(Array.isArray(result)).toBe(true);
        });
    });
});

describe('isTreeRow', () => {
    test('should return true for valid ITreeRow object', () => {
        const treeRow: ITreeRow = {
            cells: [],
            isGroup: true,
            groupField: 'test',
            groupValue: 'Value',
            groupKey: 'key',
            children: [],
        };

        expect(isTreeRow(treeRow)).toBe(true);
    });

    test('should return true for non-group tree row', () => {
        const treeRow: ITreeRow = {
            cells: [createMockCell('name', 'Test')],
            isGroup: false,
            groupField: null,
            groupValue: null,
            groupKey: null,
            children: [],
        };

        expect(isTreeRow(treeRow)).toBe(true);
    });

    test('should return false for ICell', () => {
        const cell = createMockCell('name', 'Test');
        expect(isTreeRow(cell)).toBe(false);
    });

    test('should return false for ICell[]', () => {
        const cells = [createMockCell('name', 'Test')];
        expect(isTreeRow(cells)).toBe(false);
    });

    test('should return false for plain object without cells property', () => {
        const obj = { foo: 'bar' };
        expect(isTreeRow(obj)).toBe(false);
    });

    test('should return false for null', () => {
        expect(isTreeRow(null)).toBe(false);
    });

    test('should return false for arrays', () => {
        expect(isTreeRow([1, 2, 3])).toBe(false);
    });
});

describe('normalizeCells', () => {
    test('should wrap single ICell in array', () => {
        const cell = createMockCell('name', 'Test');
        const result = normalizeCells(cell);

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(cell);
    });

    test('should pass through ICell[] unchanged', () => {
        const cells = [createMockCell('name', 'Test')];
        const result = normalizeCells(cells);

        expect(Array.isArray(result)).toBe(true);
        expect(result).toBe(cells);
    });

    test('should handle multiple cells', () => {
        const cells = [createMockCell('id', 1), createMockCell('name', 'Test')];
        const result = normalizeCells(cells);

        expect(result).toHaveLength(2);
        expect(result[0].columnName).toBe('id');
        expect(result[1].columnName).toBe('name');
    });
});
