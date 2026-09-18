import { getMoveRowAvailability } from "components/MetadataForms/TabularPart/utils/getMoveRowAvailability";

describe('getMoveRowState', () => {
    test('should return correct state when no rows selected', () => {
        const result = getMoveRowAvailability([], 5);

        expect(result).toEqual({
            selectedRows: [],
            totalRows: 5,
            canMoveUp: false,
            canMoveDown: false
        });
    });

    test('should allow moving up and down when selection is in the middle', () => {
        const result = getMoveRowAvailability([1, 2], 5);

        expect(result).toEqual({
            selectedRows: [1, 2],
            totalRows: 5,
            canMoveUp: true,
            canMoveDown: true
        });
    });

    test('should not allow moving up when first row is selected', () => {
        const result = getMoveRowAvailability([0, 2], 5);

        expect(result).toEqual({
            selectedRows: [0, 2],
            totalRows: 5,
            canMoveUp: false,
            canMoveDown: true
        });
    });

    test('should not allow moving down when last row is selected', () => {
        const result = getMoveRowAvailability([3, 4], 5);

        expect(result).toEqual({
            selectedRows: [3, 4],
            totalRows: 5,
            canMoveUp: true,
            canMoveDown: false
        });
    });

    test('should not allow moving in any direction when all rows are selected at boundaries', () => {
        const result = getMoveRowAvailability([0, 4], 5);

        expect(result).toEqual({
            selectedRows: [0, 4],
            totalRows: 5,
            canMoveUp: false,
            canMoveDown: false
        });
    });

    test('should handle single row selection in the middle', () => {
        const result = getMoveRowAvailability([2], 5);

        expect(result).toEqual({
            selectedRows: [2],
            totalRows: 5,
            canMoveUp: true,
            canMoveDown: true
        });
    });

    test('should handle single row selection at the beginning', () => {
        const result = getMoveRowAvailability([0], 5);

        expect(result).toEqual({
            selectedRows: [0],
            totalRows: 5,
            canMoveUp: false,
            canMoveDown: true
        });
    });

    test('should handle single row selection at the end', () => {
        const result = getMoveRowAvailability([4], 5);

        expect(result).toEqual({
            selectedRows: [4],
            totalRows: 5,
            canMoveUp: true,
            canMoveDown: false
        });
    });

    test('should work with only one row total', () => {
        const result = getMoveRowAvailability([0], 1);

        expect(result).toEqual({
            selectedRows: [0],
            totalRows: 1,
            canMoveUp: false,
            canMoveDown: false
        });
    });

    test('should work with empty table', () => {
        const result = getMoveRowAvailability([], 0);

        expect(result).toEqual({
            selectedRows: [],
            totalRows: 0,
            canMoveUp: false,
            canMoveDown: false
        });
    });

    test('should handle consecutive rows selection', () => {
        const result = getMoveRowAvailability([1, 2, 3], 5);

        expect(result).toEqual({
            selectedRows: [1, 2, 3],
            totalRows: 5,
            canMoveUp: true,
            canMoveDown: true
        });
    });
});