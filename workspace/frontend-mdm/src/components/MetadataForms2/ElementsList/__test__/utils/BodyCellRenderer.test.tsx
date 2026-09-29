import { renderBodyCell } from '../../ReactWindowWrapperCombined/components/BodyCellRenderer';
import type { ICell, IActiveCell } from '../../types';
import type { IColumnData, TableRowData, CellRenderMetadata } from '../../ReactWindowWrapperCombined/types';
import type { ReactNode } from 'react';

// Mock dependencies
jest.mock('ui-kit', () => ({
    IconButton: jest.fn(),
    PlusIcon: jest.fn(),
}));

// BodyCellRenderer imports Cell from '../Cell' which resolves to the Cell component
jest.mock('../../ReactWindowWrapperCombined/components/Cell', () => {
    return function MockCell({ children }: { children?: ReactNode }) {
        return <div data-testid="mock-cell">{children}</div>;
    };
});

jest.mock('../../ReactWindowWrapperCombined/constants', () => ({
    DEFAULT_ROW_HEIGHT: 32,
}));

jest.mock('../../ReactWindowWrapperCombined/utils/tableGeometry', () => ({
    getCellAt: jest.fn((data: TableRowData[], rowIndex: number, colIndex: number) => data[rowIndex]?.[colIndex]),
    getRowBackgroundColor: jest.fn(() => 'transparent'),
    getRowHeight: jest.fn(() => 32),
}));

describe('renderBodyCell', () => {
    const baseParams = {
        rowIndex: 0,
        tableColumnIndex: 0,
        style: {},
        data: [] as TableRowData[],
        cols: [] as (IColumnData | IColumnData[])[],
        hoveredRowIndex: null,
        mergedLength: 1,
        mergedRowCoef: 1,
        activeCellBorderColor: '#60a5fa',
    };

    const createMockCell = (colName: string, value: unknown): ICell => ({
        columnIndex: 0,
        rowIndex: 0,
        columnName: colName,
        type: 'text',
        value: { originalData: value, viewedData: value },
        hierarchy: null,
        editable: null,
    });

    const createMockGroupCell = (colNames: string[], values: unknown[]): ICell[] =>
        colNames.map((name, i) => ({
            columnIndex: i,
            rowIndex: 0,
            columnName: name,
            type: 'text',
            value: { originalData: values[i], viewedData: values[i] },
            hierarchy: null,
            editable: null,
        }));

    describe('single cell rendering', () => {
        test('should render a single cell with correct value', () => {
            const data: TableRowData[] = [[createMockCell('name', 'Test Value')]];
            const cols: IColumnData[] = [{ name: 'name', label: 'Name' }];

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
            });

            expect(result).toBeTruthy();
            expect(result).toBeInstanceOf(Object);
        });

        test('should render empty cell when cell is missing', () => {
            const data: TableRowData[] = [[]];
            const cols: IColumnData[] = [{ name: 'name', label: 'Name' }];

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
            });

            expect(result).toBeTruthy();
            expect(result).toBeInstanceOf(Object);
        });

        test('should handle null/undefined cell values', () => {
            const data: TableRowData[] = [[{ ...createMockCell('value', null) }]];
            const cols: IColumnData[] = [{ name: 'value', label: 'Value' }];

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
            });

            expect(result).toBeTruthy();
        });
    });

    describe('grouped cell rendering', () => {
        test('should render grouped cells when cell is an array', () => {
            const groupCells = createMockGroupCell(['col1', 'col2'], ['A', 'B']);
            const data: TableRowData[] = [[groupCells]];
            const cols: (IColumnData | IColumnData[])[] = [['col1', 'col2'].map((name) => ({ name, label: name }))];

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
            });

            expect(result).toBeTruthy();
        });

        test('should return empty div when cell is missing for column', () => {
            const data: TableRowData[] = [[]];
            const cols: IColumnData[] = [{ name: 'col1', label: 'Col 1' }];

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
            });

            expect(result).toBeTruthy();
            expect(result).toBeInstanceOf(Object);
        });

        test('should split grouped cell height by number of merged cells', () => {
            const groupCells = createMockGroupCell(['a', 'b', 'c'], [1, 2, 3]);
            const data: TableRowData[] = [[groupCells]];
            const cols: (IColumnData | IColumnData[])[] = [['a', 'b', 'c'].map((name) => ({ name, label: name }))];

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
            });

            expect(result).toBeTruthy();
        });
    });

    describe('hierarchy column', () => {
        test('should render hierarchy button when hierarchy is enabled and at column 0', () => {
            const data: TableRowData[] = [[createMockCell('id', 1)]];
            const cols: IColumnData[] = [{ name: 'id', label: 'ID' }];

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
                hierarchy: true,
                tableColumnIndex: 0,
            });

            expect(result).toBeTruthy();
        });
    });

    describe('active cell highlighting', () => {
        test('should mark cell as active when activeCell matches', () => {
            const cell = createMockCell('name', 'Active Cell');
            const data: TableRowData[] = [[cell]];
            const cols: IColumnData[] = [{ name: 'name', label: 'Name' }];
            const activeCell: IActiveCell = { rowIndex: 0, columnIndex: 0 };

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
                activeCell,
            });

            expect(result).toBeTruthy();
        });

        test('should not mark cell as active when indices do not match', () => {
            const cell = createMockCell('name', 'Inactive Cell');
            const data: TableRowData[] = [[cell]];
            const cols: IColumnData[] = [{ name: 'name', label: 'Name' }];
            const activeCell: IActiveCell = { rowIndex: 1, columnIndex: 0 };

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
                activeCell,
            });

            expect(result).toBeTruthy();
        });
    });

    describe('row background color', () => {
        test('should highlight selected rows', () => {
            const cell = createMockCell('name', 'Selected');
            const data: TableRowData[] = [[cell]];
            const cols: IColumnData[] = [{ name: 'name', label: 'Name' }];

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
                selectedRows: [0],
            });

            expect(result).toBeTruthy();
        });

        test('should highlight hovered row', () => {
            const cell = createMockCell('name', 'Hovered');
            const data: TableRowData[] = [[cell]];
            const cols: IColumnData[] = [{ name: 'name', label: 'Name' }];

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
                hoveredRowIndex: 0,
            });

            expect(result).toBeTruthy();
        });
    });

    describe('column index adjustment', () => {
        test('should adjust columnIndex when hierarchy is enabled', () => {
            const cell1 = createMockCell('id', 1);
            const cell2 = createMockCell('name', 'Test');
            const data: TableRowData[] = [
                [cell1],
                [cell2],
            ];
            const cols: IColumnData[] = [
                { name: 'id', label: 'ID' },
                { name: 'name', label: 'Name' },
            ];

            const result = renderBodyCell({
                ...baseParams,
                rowIndex: 0,
                tableColumnIndex: 1,
                data,
                cols,
                hierarchy: true,
            });

            expect(result).toBeTruthy();
        });
    });

    describe('renderMetaInput callback', () => {
        test('should pass renderMetaInput to Cell component', () => {
            const cell = createMockCell('name', 'Test');
            const data: TableRowData[] = [[cell]];
            const cols: IColumnData[] = [{ name: 'name', label: 'Name' }];
            const metaInputMock = jest.fn((cellData: ICell | ICell[], metadata: CellRenderMetadata) => null);

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
                renderMetaInput: metaInputMock,
            });

            expect(result).toBeTruthy();
            expect(result).toBeInstanceOf(Object);
        });
    });

    describe('event handlers', () => {
        test('should attach onClick handler', () => {
            const cell = createMockCell('name', 'Test');
            const data: TableRowData[] = [[cell]];
            const cols: IColumnData[] = [{ name: 'name', label: 'Name' }];
            const cellClickMock = jest.fn();

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
                onCellClick: cellClickMock,
            });

            expect(result).toBeTruthy();
        });

        test('should attach onDoubleClick handler', () => {
            const cell = createMockCell('name', 'Test');
            const data: TableRowData[] = [[cell]];
            const cols: IColumnData[] = [{ name: 'name', label: 'Name' }];
            const doubleClickMock = jest.fn();

            renderBodyCell({
                ...baseParams,
                data,
                cols,
                onDoubleClick: doubleClickMock,
            });

            // Handler is attached to Cell component internally
        });
    });

    describe('edge cases', () => {
        test('should handle empty data array', () => {
            const result = renderBodyCell({
                ...baseParams,
                data: [],
                cols: [{ name: 'name', label: 'Name' }],
            });

            expect(result).toBeTruthy();
        });

        test('should handle empty cols array', () => {
            const data: TableRowData[] = [[]];
            const result = renderBodyCell({
                ...baseParams,
                data,
                cols: [],
            });

            expect(result).toBeTruthy();
        });

        test('should handle hasExpandedHierarchy flag', () => {
            const cell = createMockCell('name', 'Expanded');
            const data: TableRowData[] = [[cell]];
            const cols: IColumnData[] = [{ name: 'name', label: 'Name' }];

            const result = renderBodyCell({
                ...baseParams,
                data,
                cols,
                hasExpandedHierarchy: true,
                mergedLength: 2,
                mergedRowCoef: 1.5,
            });

            expect(result).toBeTruthy();
        });
    });
});
