import { IColumnData } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types";
import { getCellAt, tableNavigation } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/tableNavigation";
import { IActiveCell } from "components/MetadataForms/ElementsList/types";

describe('Table Navigation', () => {
    describe('getCellAt', () => {
        const mockData: any = [
            [{ value: 'A1' }, { value: 'B1' }],
            [{ value: 'A2' }, [{ value: 'B2-1' }, { value: 'B2-2' }]],
            [{ value: 'A3' }, { value: 'B3' }],
        ];

        test('should return cell for valid coordinates', () => {
            const result = getCellAt(0, 0, mockData);
            expect(result).toEqual({ value: 'A1' });
        });

        test('should return cell array for group cell', () => {
            const result = getCellAt(1, 1, mockData);
            expect(result).toEqual([{ value: 'B2-1' }, { value: 'B2-2' }]);
        });

        test('should return undefined for row index out of bounds', () => {
            const result = getCellAt(5, 0, mockData);
            expect(result).toBeUndefined();
        });

        test('should return undefined for column index out of bounds', () => {
            const result = getCellAt(0, 5, mockData);
            expect(result).toBeUndefined();
        });

        test('should return undefined for negative row index', () => {
            const result = getCellAt(-1, 0, mockData);
            expect(result).toBeUndefined();
        });

        test('should return undefined for negative column index', () => {
            const result = getCellAt(0, -1, mockData);
            expect(result).toBeUndefined();
        });
    });

    describe('tableNavigation.getNextCell', () => {
        const mockData: any = [
            [{ value: 'A1' }, [{ value: 'B1-1' }, { value: 'B1-2' }], { value: 'C1' }],
            [{ value: 'A2' }, { value: 'B2' }, { value: 'C2' }],
        ];

        const mockCols: any = [
            { id: 'col1' },
            [{ id: 'col2-1' }, { id: 'col2-2' }],
            { id: 'col3' },
        ];

        test('should move to next cell in same row for regular cell', () => {
            const currentCell: IActiveCell = { rowIndex: 0, columnIndex: 0 };
            const result = tableNavigation.getNextCell(currentCell, 2, 3, mockData, mockCols);

            expect(result).toEqual({
                rowIndex: 0,
                columnIndex: 1,
                groupIndex: 0,
                colInGroupIndex: 0,
            });
        });

        test('should move to next cell in group when in group cell', () => {
            const currentCell: IActiveCell = {
                rowIndex: 0,
                columnIndex: 1,
                groupIndex: 0,
                colInGroupIndex: 0
            };
            const result = tableNavigation.getNextCell(currentCell, 2, 3, mockData, mockCols);

            expect(result).toEqual({
                rowIndex: 0,
                columnIndex: 1,
                groupIndex: 0,
                colInGroupIndex: 1,
            });
        });

        test('should move to next column when at last cell in group', () => {
            const currentCell: IActiveCell = {
                rowIndex: 0,
                columnIndex: 1,
                groupIndex: 0,
                colInGroupIndex: 1
            };
            const result = tableNavigation.getNextCell(currentCell, 2, 3, mockData, mockCols);

            expect(result).toEqual({
                rowIndex: 0,
                columnIndex: 2,
                groupIndex: undefined,
                colInGroupIndex: undefined,
            });
        });

        test('should move to next row when at last column', () => {
            const currentCell: IActiveCell = { rowIndex: 0, columnIndex: 2 };
            const result = tableNavigation.getNextCell(currentCell, 2, 3, mockData, mockCols);

            expect(result).toEqual({
                rowIndex: 0,
                columnIndex: 2,
                groupIndex: undefined,
                colInGroupIndex: undefined,
            });
        });

        test('should wrap to first cell when at last cell of table', () => {
            const currentCell: IActiveCell = { rowIndex: 1, columnIndex: 2 };
            const result = tableNavigation.getNextCell(currentCell, 2, 3, mockData, mockCols);

            expect(result).toEqual({
                rowIndex: 0,
                columnIndex: 0,
                groupIndex: undefined,
                colInGroupIndex: undefined,
            });
        });

        test('should initialize group indices when moving to group column', () => {
            const currentCell: IActiveCell = { rowIndex: 1, columnIndex: 0 };
            const result = tableNavigation.getNextCell(currentCell, 2, 3, mockData, mockCols);

            expect(result).toEqual({
                rowIndex: 1,
                columnIndex: 1,
                groupIndex: 0,
                colInGroupIndex: 0,
            });
        });
    });

    describe('tableNavigation.getCellByDirection', () => {
        const mockData: any = [
            [{ value: 'A1' }, [{ value: 'B1-1' }, { value: 'B1-2' }], { value: 'C1' }],
            [{ value: 'A2' }, [{ value: 'B2-1' }, { value: 'B2-2' }], { value: 'C2' }],
            [{ value: 'A3' }, { value: 'B3' }, { value: 'C3' }],
        ];

        test('should move up from regular cell', () => {
            const currentCell: IActiveCell = { rowIndex: 1, columnIndex: 0 };
            const result = tableNavigation.getCellByDirection(currentCell, 'up', 3, 3, mockData);

            expect(result).toEqual({ rowIndex: 0, columnIndex: 0 });
        });

        test('should move up within group cell', () => {
            const currentCell: IActiveCell = {
                rowIndex: 1,
                columnIndex: 1,
                colInGroupIndex: 1
            };
            const result = tableNavigation.getCellByDirection(currentCell, 'up', 3, 3, mockData);

            expect(result).toEqual({
                rowIndex: 1,
                columnIndex: 1,
                colInGroupIndex: 0,
                // groupIndex: 0,
            });
        });

        test('should move up from first cell in group to previous row', () => {
            const currentCell: IActiveCell = {
                rowIndex: 1,
                columnIndex: 1,
                colInGroupIndex: 0
            };
            const result = tableNavigation.getCellByDirection(currentCell, 'up', 3, 3, mockData);

            expect(result).toEqual({
                rowIndex: 0,
                columnIndex: 1,
                colInGroupIndex: 1,
                groupIndex: 0,
            });
        });

        test('should move down from regular cell', () => {
            const currentCell: IActiveCell = { rowIndex: 0, columnIndex: 0 };
            const result = tableNavigation.getCellByDirection(currentCell, 'down', 3, 3, mockData);

            expect(result).toEqual({ rowIndex: 1, columnIndex: 0 });
        });

        test('should move down within group cell', () => {
            const currentCell: IActiveCell = {
                rowIndex: 0,
                columnIndex: 1,
                colInGroupIndex: 0
            };
            const result = tableNavigation.getCellByDirection(currentCell, 'down', 3, 3, mockData);

            expect(result).toEqual({
                rowIndex: 0,
                columnIndex: 1,
                colInGroupIndex: 1,
                // groupIndex: 0,
            });
        });

        test('should move down from last cell in group to next row', () => {
            const currentCell: IActiveCell = {
                rowIndex: 0,
                columnIndex: 1,
                colInGroupIndex: 1
            };
            const result = tableNavigation.getCellByDirection(currentCell, 'down', 3, 3, mockData);

            expect(result).toEqual({
                rowIndex: 1,
                columnIndex: 1,
                colInGroupIndex: 0,
                groupIndex: 0,
            });
        });

        test('should move left from regular cell', () => {
            const currentCell: IActiveCell = { rowIndex: 1, columnIndex: 2 };
            const result = tableNavigation.getCellByDirection(currentCell, 'left', 3, 3, mockData);

            expect(result).toEqual({
                rowIndex: 1,
                columnIndex: 1,
                colInGroupIndex: 1
            });
        });

        test('should move left from group cell and set colInGroupIndex', () => {
            const currentCell: IActiveCell = {
                rowIndex: 1,
                columnIndex: 1,
                colInGroupIndex: 1
            };
            const result = tableNavigation.getCellByDirection(currentCell, 'left', 3, 3, mockData);

            expect(result).toEqual({
                rowIndex: 1,
                columnIndex: 0,
                colInGroupIndex: undefined,
                groupIndex: undefined,
            });
        });

        test('should move right from regular cell', () => {
            const currentCell: IActiveCell = { rowIndex: 1, columnIndex: 0 };
            const result = tableNavigation.getCellByDirection(currentCell, 'right', 3, 3, mockData);

            expect(result).toEqual({
                rowIndex: 1,
                columnIndex: 1,
                colInGroupIndex: 0
            });
        });

        test('should move right from group cell and set colInGroupIndex', () => {
            const currentCell: IActiveCell = {
                rowIndex: 1,
                columnIndex: 1,
                colInGroupIndex: 0
            };
            const result = tableNavigation.getCellByDirection(currentCell, 'right', 3, 3, mockData);

            expect(result).toEqual({
                rowIndex: 1,
                columnIndex: 2,
                colInGroupIndex: undefined,
                groupIndex: undefined,
            });
        });

        test('should not move beyond table boundaries', () => {
            const currentCell: IActiveCell = { rowIndex: 0, columnIndex: 0 };

            const resultUp = tableNavigation.getCellByDirection(currentCell, 'up', 3, 3, mockData);
            expect(resultUp.rowIndex).toBe(0);

            const resultLeft = tableNavigation.getCellByDirection(currentCell, 'left', 3, 3, mockData);
            expect(resultLeft.columnIndex).toBe(0);
        });

        test('should handle moving to non-group cell from group cell', () => {
            const currentCell: IActiveCell = {
                rowIndex: 2,
                columnIndex: 1,
                colInGroupIndex: 0
            };
            const result = tableNavigation.getCellByDirection(currentCell, 'down', 3, 3, mockData);

            expect(result).toEqual({
                rowIndex: 2,
                columnIndex: 1,
                colInGroupIndex: 0,
                // groupIndex: undefined,
            });
        });
    });
});