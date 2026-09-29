import { transformStateForRender, getCellAt } from '../../utils/transformStateForRender';
import type { IData, ICell, DataRow, IMergedColumns } from '../../types';
import type { IColumnData } from '../../ReactWindowWrapperCombined/types';
import type { IDataColumn } from '../../types';

describe('transformStateForRender', () => {
    const createMockData = (
        rows: DataRow[],
        cols?: Partial<IDataColumn>[],
    ): IData => {
        return {
            rows,
            cols: (cols ?? [
                { field: 'id', type: 'number', name: 'id', description: 'ID', len: 10, show: true },
                { field: 'name', type: 'string', name: 'name', description: 'Name', len: 100, show: true },
            ]) as IDataColumn[],
            refs: {},
            count: rows.length,
        };
    };

    const getFieldTypeMock = (data: IData) =>
        (fieldName: string): string =>
            data.cols?.find((c) => c.field === fieldName)?.type ?? 'string';

    describe('basic transformation', () => {
        test('should transform rows and columns correctly', () => {
            const data = createMockData([
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
            ]);

            const result = transformStateForRender({
                data,
                getFieldType: getFieldTypeMock(data),
            });

            expect(result.data).toHaveLength(2);
            expect(result.cols).toHaveLength(2);

            const firstRow = result.data[0];
            expect(firstRow).toHaveLength(2);
            expect((firstRow[0] as ICell).columnName).toBe('id');
            expect((firstRow[1] as ICell).columnName).toBe('name');
        });

        test('should handle empty rows', () => {
            const data = createMockData([]);

            const result = transformStateForRender({
                data,
                getFieldType: () => 'string',
            });

            expect(result.data).toHaveLength(0);
            expect(result.cols).toHaveLength(2);
        });

        test('should handle missing column values', () => {
            const data = createMockData([{ id: 1 }]);

            const result = transformStateForRender({
                data,
                getFieldType: getFieldTypeMock(data),
            });

            expect(result.data).toHaveLength(1);
            expect((result.data[0][0] as ICell).value.originalData).toBe(1);
            // Missing column values are converted to empty string by formatCellValue
            expect((result.data[0][1] as ICell).value.originalData).toBe('');
        });
    });

    describe('refs mapping', () => {
        test('should apply refs to cell values', () => {
            const data = createMockData(
                [{ id: 1, status: 1 }],
                [
                    { field: 'id', type: 'number', name: 'id', description: 'ID', len: 10, show: true },
                    { field: 'status', type: 'number', name: 'status', description: 'Status', len: 10, show: true },
                ],
            );

            data.refs = {
                status: {
                    '1': 'Active',
                    '2': 'Inactive',
                },
            };

            const result = transformStateForRender({
                data,
                getFieldType: getFieldTypeMock(data),
            });

            const statusCell = result.data[0][1] as ICell;
            expect(statusCell.value.viewedData).toBe('Active');
        });
    });

    describe('visible columns filtering', () => {
        test('should filter columns by visibleColumnNames', () => {
            const data = createMockData(
                [{ id: 1, name: 'Item 1', extra: 'data' }],
                [
                    { field: 'id', type: 'number', name: 'id', description: 'ID', len: 10, show: true },
                    { field: 'name', type: 'string', name: 'name', description: 'Name', len: 100, show: true },
                    { field: 'extra', type: 'string', name: 'extra', description: 'Extra', len: 50, show: true },
                ],
            );

            const result = transformStateForRender({
                data,
                visibleColumnNames: ['id', 'extra'],
                getFieldType: () => 'string',
            });

            expect(result.cols).toHaveLength(2);
            expect((result.cols[0] as IColumnData).name).toBe('id');
            expect((result.cols[1] as IColumnData).name).toBe('extra');
            expect(result.data[0]).toHaveLength(2);
        });

        test('should hide columns with show=false', () => {
            const data = createMockData(
                [{ id: 1, name: 'Item 1' }],
                [
                    { field: 'id', type: 'number', name: 'id', description: 'ID', len: 10, show: true },
                    { field: 'name', type: 'string', name: 'name', description: 'Name', len: 100, show: false },
                ],
            );

            const result = transformStateForRender({
                data,
                getFieldType: getFieldTypeMock(data),
            });

            expect(result.cols).toHaveLength(1);
            expect((result.cols[0] as IColumnData).name).toBe('id');
            expect(result.data[0]).toHaveLength(1);
        });

        test('should hide columns without show and keep show:true fields from list payload', () => {
            const data = createMockData(
                [
                    { id: 'a', period: 'p1', source: 's1', target: 't1', weight: 1, source_type: 'x' },
                    { id: 'b', period: 'p2', source: 's2', target: 't2', weight: 2, source_type: 'y' },
                    { id: 'c', period: 'p3', source: 's3', target: 't3', weight: 3, source_type: 'z' },
                ],
                [
                    { field: 'id', type: 'uuid', name: 'id', description: 'id' },
                    { field: 'period', type: 'string', name: 'period', description: 'Период', show: true },
                    { field: 'source', type: 'string', name: 'source', description: 'Источник', show: true },
                    { field: 'target', type: 'string', name: 'target', description: 'Приёмник', show: true },
                    { field: 'weight', type: 'number', name: 'weight', description: 'Вес', show: true },
                    { field: 'source_type', type: 'string', name: 'source_type', description: 'Тип', show: true },
                    { field: 'createdAt', type: 'datetime', name: 'createdAt', description: 'createdAt' },
                ],
            );

            const result = transformStateForRender({
                data,
                getFieldType: getFieldTypeMock(data),
            });

            expect(result.cols.map((col) => (col as IColumnData).name)).toEqual([
                'period',
                'source',
                'target',
                'weight',
                'source_type',
            ]);
            expect(result.data).toHaveLength(3);
            expect(result.data[0]).toHaveLength(5);
            expect((result.data[0][0] as ICell).value.originalData).toBe('p1');
        });
    });

    describe('indexToId mapping', () => {
        test('should create indexToId mapping from ROW_ID_FIELD_NAME', () => {
            const data = createMockData([
                { id: 1, name: 'Item 1', uuid: 'uuid-1' },
                { id: 2, name: 'Item 2', uuid: 'uuid-2' },
            ]);

            const result = transformStateForRender({
                data,
                getFieldType: () => 'string',
            });

            expect(result.indexToId).toBeDefined();
        });
    });

    describe('grouped columns', () => {
        test('should handle merged columns from IMergedColumns', () => {
            const data = createMockData([{ id: 1, name: 'Item 1' }]);

            // IMergedColumns — это мапа groupName → { sourceFields: string[] }
            const mockMergedColumns: IMergedColumns = {
                'id-group': {
                    sourceFields: ['id', 'name'],
                },
            };

            const result = transformStateForRender({
                data,
                mergedColumns: mockMergedColumns,
                getFieldType: () => 'string',
            });

            expect(result).toBeDefined();
            expect(result.cols).toBeDefined();
        });
    });
test('should preserve the parent group title on grouped columns', () => {
        const nameCol: IDataColumn = { field: 'name', type: 'string', name: 'name', description: 'Name', len: 100, show: true };
        const dateCol: IDataColumn = { field: 'date', type: 'string', name: 'date', description: 'Date', len: 100, show: true };
        const group = [nameCol, dateCol] as IDataColumn[] & { title?: string };
        group.title = 'Основные';

        const data = createMockData([{ name: 'x', date: 'y' }], []);
        data.cols = [group] as unknown as IDataColumn[];
        data.rows = [{ name: 'x', date: 'y' }];

        const result = transformStateForRender({
            data,
            getFieldType: () => 'string',
        });

        expect(Array.isArray(result.cols[0])).toBe(true);
        expect((result.cols[0] as IColumnData[] & { title?: string }).title).toBe('Основные');
        expect((result.cols[0] as IColumnData[]).map((c) => c.name)).toEqual(['name', 'date']);
    });
});

describe('getCellAt', () => {
    test('should return cell at valid index', () => {
        const mockData: ICell[][] = [
            [
                {
                    columnIndex: 0,
                    rowIndex: 0,
                    columnName: 'col1',
                    type: 'text',
                    value: { viewedData: 'a', originalData: 'a' },
                    hierarchy: null,
                    editable: null,
                },
                {
                    columnIndex: 1,
                    rowIndex: 0,
                    columnName: 'col2',
                    type: 'text',
                    value: { viewedData: 'b', originalData: 'b' },
                    hierarchy: null,
                    editable: null,
                },
            ],
        ];

        const result = getCellAt(0, 0, mockData);
        expect(result).toBeDefined();
        expect(result?.columnName).toBe('col1');

        const result2 = getCellAt(0, 1, mockData);
        expect(result2?.columnName).toBe('col2');
    });

    test('should return undefined for invalid index', () => {
        const mockData: ICell[][] = [];

        expect(getCellAt(0, 0, mockData)).toBeUndefined();
        expect(getCellAt(-1, 0, mockData)).toBeUndefined();
        expect(getCellAt(0, -1, mockData)).toBeUndefined();
    });

    test('should handle nested data correctly', () => {
        const mockData: ICell[][] = [
            [
                {
                    columnIndex: 0,
                    rowIndex: 0,
                    columnName: 'a',
                    type: 'text',
                    value: { viewedData: 'row0', originalData: 'row0' },
                    hierarchy: null,
                    editable: null,
                },
            ],
            [
                {
                    columnIndex: 0,
                    rowIndex: 1,
                    columnName: 'a',
                    type: 'text',
                    value: { viewedData: 'row1', originalData: 'row1' },
                    hierarchy: null,
                    editable: null,
                },
            ],
        ];

        expect(getCellAt(1, 0, mockData)?.value.viewedData).toBe('row1');
    });
});
