import {
    handleTableSelection,
    selectAllRows,
    clearSelection,
    isRowSelected,
    SelectionState
} from "../ReactWindowWrapperCombined/utils/tableSelectionHelper";

describe('Table Selection Functions', () => {
    describe('handleTableSelection', () => {
        const baseState: SelectionState = {
            selectedRows: [1, 2],
            lastSelectedRow: 2
        };

        test('should select single row on regular click', () => {
            const result = handleTableSelection(5, baseState, {
                ctrlKey: false,
                metaKey: false,
                shiftKey: false
            });

            expect(result.selectedRows).toEqual([5]);
            expect(result.lastSelectedRow).toBe(5);
        });

        test('should add row to selection on ctrl+click when not selected', () => {
            const result = handleTableSelection(5, baseState, {
                ctrlKey: true,
                metaKey: false,
                shiftKey: false
            });

            expect(result.selectedRows).toEqual([1, 2, 5]);
            expect(result.lastSelectedRow).toBe(5);
        });

        test('should remove row from selection on ctrl+click when already selected', () => {
            const result = handleTableSelection(1, baseState, {
                ctrlKey: true,
                metaKey: false,
                shiftKey: false
            });

            expect(result.selectedRows).toEqual([2]);
            expect(result.lastSelectedRow).toBe(1);
        });

        test('should add row to selection on meta+click when not selected', () => {
            const result = handleTableSelection(5, baseState, {
                ctrlKey: false,
                metaKey: true,
                shiftKey: false
            });

            expect(result.selectedRows).toEqual([1, 2, 5]);
            expect(result.lastSelectedRow).toBe(5);
        });

        test('should select range on shift+click when lastSelectedRow exists', () => {
            const result = handleTableSelection(5, baseState, {
                ctrlKey: false,
                metaKey: false,
                shiftKey: true
            });

            expect(result.selectedRows).toEqual([1, 2, 3, 4, 5]);
            expect(result.lastSelectedRow).toBe(5);
        });

        test('should select range in reverse order on shift+click', () => {
            const state: SelectionState = {
                selectedRows: [5],
                lastSelectedRow: 5
            };

            const result = handleTableSelection(1, state, {
                ctrlKey: false,
                metaKey: false,
                shiftKey: true
            });

            expect(result.selectedRows).toEqual([1, 2, 3, 4, 5]);
            expect(result.lastSelectedRow).toBe(1);
        });

        test('should handle shift+click when no previous selection exists', () => {
            const emptyState: SelectionState = {
                selectedRows: [],
                lastSelectedRow: null
            };

            const result = handleTableSelection(5, emptyState, {
                ctrlKey: false,
                metaKey: false,
                shiftKey: true
            });

            expect(result.selectedRows).toEqual([5]);
            expect(result.lastSelectedRow).toBe(5);
        });

        test('should handle edge case with single selected row and shift+click', () => {
            const singleRowState: SelectionState = {
                selectedRows: [3],
                lastSelectedRow: 3
            };

            const result = handleTableSelection(6, singleRowState, {
                ctrlKey: false,
                metaKey: false,
                shiftKey: true
            });

            expect(result.selectedRows).toEqual([3, 4, 5, 6]);
            expect(result.lastSelectedRow).toBe(6);
        });
    });

    describe('selectAllRows', () => {
        test('should select all rows', () => {
            const allIndexes = [0, 1, 2, 3, 4];
            const result = selectAllRows(allIndexes);

            expect(result.selectedRows).toEqual(allIndexes);
            expect(result.lastSelectedRow).toBe(4);
        });

        test('should handle empty array', () => {
            const result = selectAllRows([]);

            expect(result.selectedRows).toEqual([]);
            expect(result.lastSelectedRow).toBeNull();
        });

        test('should handle single row', () => {
            const result = selectAllRows([5]);

            expect(result.selectedRows).toEqual([5]);
            expect(result.lastSelectedRow).toBe(5);
        });
    });

    describe('clearSelection', () => {
        test('should clear selection', () => {
            const result = clearSelection();

            expect(result.selectedRows).toEqual([]);
            expect(result.lastSelectedRow).toBeNull();
        });
    });

    describe('isRowSelected', () => {
        test('should return true when row is selected', () => {
            const selectedRows = [1, 3, 5];
            expect(isRowSelected(3, selectedRows)).toBe(true);
        });

        test('should return false when row is not selected', () => {
            const selectedRows = [1, 3, 5];
            expect(isRowSelected(2, selectedRows)).toBe(false);
        });

        test('should handle empty selection', () => {
            expect(isRowSelected(1, [])).toBe(false);
        });

        test('should handle single selection', () => {
            expect(isRowSelected(1, [1])).toBe(true);
            expect(isRowSelected(2, [1])).toBe(false);
        });
    });
});