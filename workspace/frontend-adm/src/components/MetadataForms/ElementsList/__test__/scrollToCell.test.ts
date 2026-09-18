
import { DEFAULT_ROW_HEIGHT } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/constants";
import { scrollToCellUtils } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/scrollToCell.utils";

const createMockCell = (columnIndex: number, value: string = 'test') => ({
    columnIndex,
    value: { originalData: value, viewedData: value },
    hierarchy: null,
    rowIndex: 0,
    editable: null,
    columnName: `column${columnIndex}`
});

const createMockColumnMetadata = (x: number, width: number) => ({ x, width });

describe('scrollToCellUtils', () => {
    describe('calculateScrollPosition', () => {
        const mockData = [
            [createMockCell(0), createMockCell(1), createMockCell(2)],
            [createMockCell(0), createMockCell(1), createMockCell(2)],
            [createMockCell(0), createMockCell(1), createMockCell(2)],
            [createMockCell(0), createMockCell(1), createMockCell(2)],
        ];

        const mockColumnsMetadata = [
            createMockColumnMetadata(0, 100),
            createMockColumnMetadata(100, 150),
            createMockColumnMetadata(250, 200),
        ];

        const baseParams = {
            scrollTop: 0,
            scrollLeft: 0,
            rowIndex: 0,
            columnIndex: 0,
            columnsMetadata: mockColumnsMetadata,
            data: mockData,
            hasExpendedHierarchy: false,
            tableWidth: 200,
            tableHeight: 200,
            mergedLength: 1
        };

        test('should calculate both vertical and horizontal scroll when needed', () => {
            const params = {
                ...baseParams,
                rowIndex: 3,
                columnIndex: 2
            };

            const result = scrollToCellUtils.calculateScrollPosition(params);

            expect(result.shouldScroll).toBe(true);
        });

        test('should return shouldScroll=false when no scroll needed', () => {
            const params = {
                ...baseParams,
                tableWidth: 500,
                tableHeight: 500
            };

            const result = scrollToCellUtils.calculateScrollPosition(params);

            expect(result.shouldScroll).toBe(false);
            expect(result.scrollTop).toBe(0);
            expect(result.scrollLeft).toBe(0);
        });

        test('should handle only vertical scroll when row is out of view', () => {
            const params = {
                ...baseParams,
                scrollTop: 0,
                rowIndex: 3,
                tableHeight: 100
            };

            const result = scrollToCellUtils.calculateScrollPosition(params);

            expect(result.shouldScroll).toBe(true);
        });

        test('should handle only horizontal scroll when column is out of view', () => {
            const params = {
                ...baseParams,
                scrollLeft: 0,
                columnIndex: 2,
                tableWidth: 100
            };

            const result = scrollToCellUtils.calculateScrollPosition(params);

            expect(result.shouldScroll).toBe(true);
            expect(result.scrollLeft).not.toBe(0);
        });

        test('should account for hierarchy header', () => {
            const paramsWithoutHierarchy = {
                ...baseParams,
                rowIndex: 2,
                tableHeight: 100
            };

            const paramsWithHierarchy = {
                ...paramsWithoutHierarchy,
                hasExpendedHierarchy: true
            };

            const resultWithout = scrollToCellUtils.calculateScrollPosition(paramsWithoutHierarchy);
            const resultWith = scrollToCellUtils.calculateScrollPosition(paramsWithHierarchy);

            expect(resultWith.scrollTop).not.toBe(resultWithout.scrollTop);
        });

        test('should account for merged rows height', () => {
            const paramsNormal = {
                ...baseParams,
                rowIndex: 1,
                tableHeight: 100
            };

            const paramsMerged = {
                ...paramsNormal,
                mergedLength: 3
            };

            const resultNormal = scrollToCellUtils.calculateScrollPosition(paramsNormal);
            const resultMerged = scrollToCellUtils.calculateScrollPosition(paramsMerged);

            expect(resultMerged.scrollTop).not.toBe(resultNormal.scrollTop);
        });

        test('should handle edge case with empty data', () => {
            const params = {
                ...baseParams,
                data: [],
                columnsMetadata: []
            };

            const result = scrollToCellUtils.calculateScrollPosition(params);

            expect(result.scrollTop).toBe(0);
            expect(result.scrollLeft).toBe(0);
            expect(result.shouldScroll).toBe(false);
        });

        test('should handle group columns mapping correctly', () => {
            const groupData = [
                [
                    createMockCell(0),
                    [createMockCell(1), createMockCell(2)]
                ]
            ];

            const groupColumnsMetadata = [
                createMockColumnMetadata(0, 100),
                createMockColumnMetadata(100, 200),
            ];

            const params = {
                ...baseParams,
                data: groupData,
                columnsMetadata: groupColumnsMetadata,
                columnIndex: 2,
                tableWidth: 150,
                scrollLeft: 0
            };

            const result = scrollToCellUtils.calculateScrollPosition(params);

            expect(result.shouldScroll).toBe(true);
        });

        test('should not scroll to non-existent column', () => {
            const params = {
                ...baseParams,
                columnIndex: 999
            };

            const result = scrollToCellUtils.calculateScrollPosition(params);

            expect(result.scrollLeft).toBe(0);
            expect(result.shouldScroll).toBe(false);
        });

        test('should handle scroll to visible cell without changes', () => {
            const params = {
                ...baseParams,
                rowIndex: 0,
                columnIndex: 0,
                scrollTop: 0,
                scrollLeft: 0
            };

            const result = scrollToCellUtils.calculateScrollPosition(params);

            expect(result.scrollTop).toBe(0);
            expect(result.scrollLeft).toBe(0);
            expect(result.shouldScroll).toBe(false);
        });

        test('should calculate scroll for bottom row with delta', () => {
            const params = {
                ...baseParams,
                scrollTop: 0,
                rowIndex: 3,
                tableHeight: DEFAULT_ROW_HEIGHT + 50
            };

            const result = scrollToCellUtils.calculateScrollPosition(params);

            expect(result.shouldScroll).toBe(true);
        });

        test('should calculate scroll for right column', () => {
            const params = {
                ...baseParams,
                scrollLeft: 0,
                columnIndex: 2,
                tableWidth: 200
            };

            const result = scrollToCellUtils.calculateScrollPosition(params);

            expect(result.shouldScroll).toBe(true);
            expect(result.scrollLeft).toBeGreaterThan(0);
        });
    });
});