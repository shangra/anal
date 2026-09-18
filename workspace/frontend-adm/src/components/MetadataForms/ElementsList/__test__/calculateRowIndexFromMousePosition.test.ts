import { calculateRowIndexFromMousePosition, getRowTopPosition } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/calculateRowIndexFromMousePosition";

describe('Grid Row Calculation Functions', () => {
    const mockGetRowHeight = jest.fn();
    const mockGetRowsCount = jest.fn();

    beforeEach(() => {
        mockGetRowHeight.mockClear();
        mockGetRowsCount.mockClear();
    });

    describe('calculateRowIndexFromMousePosition', () => {
        it('should return null when mouseY is above header', () => {
            const result = calculateRowIndexFromMousePosition({
                mouseY: 50,
                headerHeight: 100,
                scrollTop: 0,
                getRowHeight: mockGetRowHeight,
                getRowsCount: mockGetRowsCount,
                totalHeight: 500,
            });

            expect(result).toBeNull();
        });

        it('should find correct row index with equal row heights', () => {
            mockGetRowsCount.mockReturnValue(10);
            mockGetRowHeight.mockReturnValue(50);

            const result = calculateRowIndexFromMousePosition({
                mouseY: 150,
                headerHeight: 100,
                scrollTop: 0,
                getRowHeight: mockGetRowHeight,
                getRowsCount: mockGetRowsCount,
                totalHeight: 500,
            });

            expect(result).toBe(1);
        });

        it('should handle scroll position correctly', () => {
            mockGetRowsCount.mockReturnValue(10);
            mockGetRowHeight.mockReturnValue(50);

            const result = calculateRowIndexFromMousePosition({
                mouseY: 100,
                headerHeight: 100,
                scrollTop: 100,
                getRowHeight: mockGetRowHeight,
                getRowsCount: mockGetRowsCount,
                totalHeight: 500,
            });

            expect(result).toBe(2);
        });

        it('should handle different row heights', () => {
            mockGetRowsCount.mockReturnValue(5);
            const rowHeights = [30, 80, 40, 60, 70];
            mockGetRowHeight.mockImplementation((index) => rowHeights[index - 1] || 50);

            const result = calculateRowIndexFromMousePosition({
                mouseY: 130,
                headerHeight: 100,
                scrollTop: 0,
                getRowHeight: mockGetRowHeight,
                getRowsCount: mockGetRowsCount,
                totalHeight: 500,
            });

            expect(result).toBe(1);
        });

        it('should handle hierarchy mode with offset', () => {
            mockGetRowsCount.mockReturnValue(5);
            mockGetRowHeight.mockReturnValue(50);

            const result = calculateRowIndexFromMousePosition({
                mouseY: 150,
                headerHeight: 100,
                scrollTop: 0,
                getRowHeight: mockGetRowHeight,
                getRowsCount: mockGetRowsCount,
                totalHeight: 500,
                hierarchy: true,
            });

            expect(result).toBe(1);
        });

        it('should return null when mouse is below all rows', () => {
            mockGetRowsCount.mockReturnValue(5);
            mockGetRowHeight.mockReturnValue(50);

            const result = calculateRowIndexFromMousePosition({
                mouseY: 400,
                headerHeight: 100,
                scrollTop: 0,
                getRowHeight: mockGetRowHeight,
                getRowsCount: mockGetRowsCount,
                totalHeight: 350,
            });

            expect(result).toBeNull();
        });

        it('should handle empty grid', () => {
            mockGetRowsCount.mockReturnValue(0);

            const result = calculateRowIndexFromMousePosition({
                mouseY: 150,
                headerHeight: 100,
                scrollTop: 0,
                getRowHeight: mockGetRowHeight,
                getRowsCount: mockGetRowsCount,
                totalHeight: 100,
            });

            expect(result).toBeNull();
        });

        it('should find row in large dataset efficiently', () => {
            const rowCount = 1000;
            mockGetRowsCount.mockReturnValue(rowCount);
            mockGetRowHeight.mockReturnValue(30);

            const result = calculateRowIndexFromMousePosition({
                mouseY: 250,
                headerHeight: 100,
                scrollTop: 0,
                getRowHeight: mockGetRowHeight,
                getRowsCount: mockGetRowsCount,
                totalHeight: rowCount * 30 + 100,
            });

            expect(result).toBe(5);
        });
    });

    describe('getRowTopPosition', () => {
        it('should calculate correct top position for equal row heights', () => {
            mockGetRowHeight.mockReturnValue(50);

            const result = getRowTopPosition(3, mockGetRowHeight, false);

            expect(result).toBe(150);
            expect(mockGetRowHeight).toHaveBeenCalledTimes(3);
        });

        it('should calculate correct top position for variable row heights', () => {
            const rowHeights = [30, 80, 40, 60];
            mockGetRowHeight.mockImplementation((index) => rowHeights[index - 1] || 50);

            const result = getRowTopPosition(3, mockGetRowHeight, false);

            expect(result).toBe(150);
        });

        it('should return 0 for rowIndex 0', () => {
            mockGetRowHeight.mockReturnValue(50);

            const result = getRowTopPosition(0, mockGetRowHeight, false);

            expect(result).toBe(0);
            expect(mockGetRowHeight).not.toHaveBeenCalled();
        });

        it('should calculate correct top position with hierarchy offset', () => {
            mockGetRowHeight.mockReturnValue(50);

            const result = getRowTopPosition(3, mockGetRowHeight, true);

            expect(result).toBe(150);
            expect(mockGetRowHeight).toHaveBeenCalledTimes(3);
        });

        it('should handle zero height rows', () => {
            mockGetRowHeight.mockReturnValue(0);

            const result = getRowTopPosition(5, mockGetRowHeight, false);

            expect(result).toBe(0);
        });

        it('should work correctly with calculateRowIndexFromMousePosition', () => {
            const rowHeights = [30, 80, 40, 60, 70];
            mockGetRowHeight.mockImplementation((index) => rowHeights[index - 1] || 50);
            mockGetRowsCount.mockReturnValue(5);

            const result = calculateRowIndexFromMousePosition({
                mouseY: 210,
                headerHeight: 100,
                scrollTop: 0,
                getRowHeight: mockGetRowHeight,
                getRowsCount: mockGetRowsCount,
                totalHeight: 300,
                hierarchy: false,
            });

            expect(result).toBe(2);
        });
    });
});