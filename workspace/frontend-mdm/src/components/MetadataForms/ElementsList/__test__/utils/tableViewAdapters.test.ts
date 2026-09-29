import { toReactWindowTableData, toDataTableViewModel } from '../../utils/tableViewAdapters';
import type { ICell } from '../../types';
import type { IColumnData, ITreeRow } from '../../ReactWindowWrapperCombined/types';

jest.mock('../../../../../helpers/listSettings/pipeline/getActiveListView', () => {
    return {
        getActiveListView: () => ({
            activeSelectionNodes: [],
            activeSelectionConditions: [],
            activeGroupFields: ['group'],
            activeSortRules: [],
        }),
    };
});

const createMockCell = (colName: string, value: unknown): ICell => ({
    columnIndex: 0,
    rowIndex: 0,
    columnName: colName,
    type: 'text',
    value: { originalData: value, viewedData: value },
    hierarchy: null,
    editable: null,
});

describe('toReactWindowTableData', () => {
    test('should return rows as-is', () => {
        const rows: (ICell | ICell[])[][] = [
            [createMockCell('name', 'Item 1')],
            [createMockCell('name', 'Item 2')],
        ];

        const result = toReactWindowTableData(rows);

        expect(result).toBe(rows);
    });

    test('should handle empty rows', () => {
        const rows: (ICell | ICell[])[][] = [];
        const result = toReactWindowTableData(rows);

        expect(result).toEqual([]);
    });

    test('should handle rows with cell groups', () => {
        const rows: (ICell | ICell[])[][] = [
            [
                [createMockCell('id', 1), createMockCell('name', 'Item 1')],
            ],
        ];

        const result = toReactWindowTableData(rows);

        expect(result).toBe(rows);
        expect(result).toHaveLength(1);
    });
});

describe('toDataTableViewModel', () => {
    const createMockCols = (): (IColumnData | IColumnData[])[] => [
        { name: 'id', label: 'ID' },
        { name: 'name', label: 'Name' },
    ];

    const createMockRows = (): (ICell | ICell[])[][] => [
        [
            createMockCell('id', 1),
            createMockCell('name', 'Item 1'),
        ],
        [
            createMockCell('id', 2),
            createMockCell('name', 'Item 2'),
        ],
    ];

    test('should return data and columns', () => {
        const result = toDataTableViewModel({
            rows: createMockRows(),
            cols: createMockCols(),
        });

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('columns');
    });

    test('should map columns correctly without grouping', () => {
        const result = toDataTableViewModel({
            rows: createMockRows(),
            cols: createMockCols(),
        });

        expect(result.columns).toHaveLength(2);
        expect(result.columns[0].id).toBe('id');
        expect(result.columns[0].label).toBe('ID');
        expect(result.columns[0].value).toBe('id');
    });

    test('should return flat rows when no grouping fields', () => {
        const result = toDataTableViewModel({
            rows: createMockRows(),
            cols: createMockCols(),
        });

        const data = result.data as Array<ICell[][] | ITreeRow>;
        expect(Array.isArray(data)).toBe(true);
        expect(data[0]).toHaveProperty('isGroup');
    });

    test('should group rows when grouping fields provided', () => {
        const rows = [
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

        const result = toDataTableViewModel({
            rows,
            cols: createMockCols(),
        });

        const data = result.data as Array<ICell[][] | ITreeRow>;

        expect(Array.isArray(data)).toBe(true);
        // Should contain tree rows (groups)
        const treeRows = data.filter((item): item is ITreeRow =>
            typeof item === 'object' && item !== null && 'isGroup' in item
        );
        expect(treeRows.length).toBeGreaterThan(0);
    });

    test('should flatten cell groups before processing', () => {
        const rows = [
            [
                [createMockCell('id', 1), createMockCell('name', 'Item 1')],
            ],
        ];

        const result = toDataTableViewModel({
            rows,
            cols: createMockCols(),
        });

        expect(result.data).toHaveLength(1);
        const treeRow = result.data[0] as ITreeRow;
        expect(treeRow.isGroup).toBe(true);
        expect(treeRow.children).toHaveLength(1);
    });

    test('should handle empty rows', () => {
        const result = toDataTableViewModel({
            rows: [],
            cols: createMockCols(),
        });

        expect(result.data).toHaveLength(0);
        expect(result.columns).toHaveLength(2);
    });

    test('should handle empty columns', () => {
        const result = toDataTableViewModel({
            rows: createMockRows(),
            cols: [],
        });

        expect(result.columns).toHaveLength(0);
        expect(result.data).toHaveLength(1);
        expect((result.data as ITreeRow[])[0].isGroup).toBe(true);
    });

    test('should handle grouped columns', () => {
        const cols = [
            ['id', 'name'].map((name) => ({ name, label: name })),
        ];

        const result = toDataTableViewModel({
            rows: createMockRows(),
            cols,
        });

        expect(result.columns).toHaveLength(2);
    });
});
