import { processMergedColumns } from '../../utils/mergedColumns';
import type { DataRow, IDataColumn, IMergedColumns } from '../../types';

describe('processMergedColumns', () => {
    const createMockCols = (
        columns: Partial<IDataColumn>[] = [],
    ): IDataColumn[] => [
        {
            field: 'id',
            type: 'number',
            name: 'id',
            description: 'ID',
            len: 10,
            show: true,
            ...columns[0],
        },
        {
            field: 'name',
            type: 'string',
            name: 'name',
            description: 'Name',
            len: 100,
            show: true,
            ...columns[1],
        },
        {
            field: 'status',
            type: 'string',
            name: 'status',
            description: 'Status',
            len: 50,
            show: true,
            ...columns[2],
        },
    ] as IDataColumn[];

    const createMockRows = (count: number): DataRow[] =>
        Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            name: `Item ${i + 1}`,
        }));

    describe('no merged columns', () => {
        test('should return columns as-is when mergedColumns is undefined', () => {
            const cols = createMockCols();
            const rows = createMockRows(2);

            const result = processMergedColumns(undefined, cols, rows);

            expect(result.cols).toHaveLength(3);
            expect(result.rows).toHaveLength(2);
            expect(result.cols).not.toBe(cols); // Should be a copy
            expect(result.rows).not.toBe(rows); // Should be a copy
        });

        test('should return columns as-is when mergedColumns is null', () => {
            const cols = createMockCols();
            const rows = createMockRows(2);

            const result = processMergedColumns(null as unknown as IMergedColumns, cols, rows);

            expect(result.cols).toHaveLength(3);
            expect(result.rows).toHaveLength(2);
        });

        test('should return columns as-is when mergedColumns is not an object', () => {
            const cols = createMockCols();
            const rows = createMockRows(2);

            const result = processMergedColumns(
                'invalid' as unknown as IMergedColumns,
                cols,
                rows,
            );

            expect(result.cols).toHaveLength(3);
        });
    });

    describe('single group merging', () => {
        test('should merge two columns into a group', () => {
            const cols = createMockCols();
            const rows = createMockRows(2);

            const mergedColumns: IMergedColumns = {
                'id-name-group': {
                    sourceFields: ['id', 'name'],
                    positionIndex: 0,
                },
            };

            const result = processMergedColumns(mergedColumns, cols, rows);

            expect(result.cols).toHaveLength(2); // 1 group + 1 remaining column
            expect(result.rows).toHaveLength(2);

            const groupColumn = result.cols[0];
            expect(Array.isArray(groupColumn)).toBe(true);
            if (Array.isArray(groupColumn)) {
                expect(groupColumn).toHaveLength(2);
                expect(groupColumn[0].name).toBe('id');
                expect(groupColumn[1].name).toBe('name');
            }
        });

        test('should remove merged columns from flat list', () => {
            const cols = createMockCols();
            const rows = createMockRows(1);

            const mergedColumns: IMergedColumns = {
                'id-name-group': {
                    sourceFields: ['id', 'name'],
                },
            };

            const result = processMergedColumns(mergedColumns, cols, rows);

            const flatNames = result.cols
                .filter((col): col is IDataColumn => !Array.isArray(col))
                .map((col) => col.name);

            expect(flatNames).not.toContain('id');
            expect(flatNames).not.toContain('name');
            expect(flatNames).toContain('status');
        });
    });

    describe('multiple groups', () => {
        test('should create multiple merged groups', () => {
            const cols = [
                { field: 'a', type: 'string' as const, name: 'a', description: 'A', len: 10, show: true },
                { field: 'b', type: 'string' as const, name: 'b', description: 'B', len: 10, show: true },
                { field: 'c', type: 'string' as const, name: 'c', description: 'C', len: 10, show: true },
                { field: 'd', type: 'string' as const, name: 'd', description: 'D', len: 10, show: true },
            ];

            const mergedColumns: IMergedColumns = {
                'group-ab': {
                    sourceFields: ['a', 'b'],
                    positionIndex: 0,
                },
                'group-cd': {
                    sourceFields: ['c', 'd'],
                    positionIndex: 2,
                },
            };

            const result = processMergedColumns(mergedColumns, cols, []);

            expect(result.cols).toHaveLength(2);
            expect(Array.isArray(result.cols[0])).toBe(true);
            expect(Array.isArray(result.cols[1])).toBe(true);
        });
    });

    describe('positionIndex', () => {
        test('should respect custom positionIndex', () => {
            const cols = createMockCols();
            const rows = createMockRows(1);

            const mergedColumns: IMergedColumns = {
                'id-name-group': {
                    sourceFields: ['id', 'name'],
                    positionIndex: 1,
                },
            };

            const result = processMergedColumns(mergedColumns, cols, rows);

            expect(result.cols).toHaveLength(2);
            // Group should be at position 1
            expect(Array.isArray(result.cols[1])).toBe(true);
        });

        test('should use default position when positionIndex is not provided', () => {
            const cols = createMockCols();
            const rows = createMockRows(1);

            const mergedColumns: IMergedColumns = {
                'id-name-group': {
                    sourceFields: ['id', 'name'],
                },
            };

            const result = processMergedColumns(mergedColumns, cols, rows);

            expect(result.cols).toHaveLength(2);
            // Group should be at position 0 (first columns)
            expect(Array.isArray(result.cols[0])).toBe(true);
        });
    });

    describe('invalid groups', () => {
        test('should skip group with missing columns', () => {
            const cols = createMockCols();
            const rows = createMockRows(1);

            const mergedColumns: IMergedColumns = {
                'missing-group': {
                    sourceFields: ['id', 'nonexistent'],
                },
            };

            const result = processMergedColumns(mergedColumns, cols, rows);

            // Should return columns as-is because the group is invalid
            expect(result.cols).toHaveLength(3);
            expect(Array.isArray(result.cols[0])).toBe(false);
        });

        test('should handle empty sourceFields', () => {
            const cols = createMockCols();
            const rows = createMockRows(1);

            const mergedColumns: IMergedColumns = {
                'empty-group': {
                    sourceFields: [],
                },
            };

            const result = processMergedColumns(mergedColumns, cols, rows);

            expect(result.cols).toHaveLength(3);
        });

        test('should handle null config', () => {
            const cols = createMockCols();
            const rows = createMockRows(1);

            const mergedColumns: IMergedColumns = {
                'null-group': null as unknown as { sourceFields: string[]; positionIndex?: number },
            };

            const result = processMergedColumns(mergedColumns, cols, rows);

            expect(result.cols).toHaveLength(3);
        });
    });

    describe('rows handling', () => {
        test('should return shallow copies of rows', () => {
            const cols = createMockCols();
            const rows = createMockRows(2);
            const originalRow = rows[0];

            const result = processMergedColumns(undefined, cols, rows);

            expect(result.rows).toHaveLength(2);
            expect(result.rows[0]).not.toBe(originalRow);
        });

        test('should handle empty rows array', () => {
            const cols = createMockCols();

            const result = processMergedColumns(undefined, cols, []);

            expect(result.rows).toHaveLength(0);
        });

        test('should handle null rows', () => {
            const cols = createMockCols();

            const result = processMergedColumns(
                undefined,
                cols,
                null as unknown as DataRow[],
            );

            expect(result.rows).toHaveLength(0);
        });
    });

    describe('empty/undefined inputs', () => {
        test('should handle empty cols array', () => {
            const result = processMergedColumns(undefined, [], []);

            expect(result.cols).toHaveLength(0);
            expect(result.rows).toHaveLength(0);
        });

        test('should handle undefined cols', () => {
            const result = processMergedColumns(
                undefined,
                undefined as unknown as IDataColumn[],
                [],
            );

            expect(result.cols).toHaveLength(0);
        });
    });
});
