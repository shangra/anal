import { DEFAULT_COLUMN_WIDTH } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/constants";
import { IInnerColumnMetadata } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types";
import { isGroup, scrollToAlgo, ColumnResizeHelper } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils";
import { IColumn } from "components/MetadataForms/ElementsList/types";

const mockColumn: IColumn = {
    name: "test",
    type: "string",
    description: "",
    order: null
};

const mockColumnGroup: IColumn[] = [
    {
        name: "test1",
        type: "string",
        description: "",
        order: null
    },
    {
        name: "test2",
        type: "number",
        description: "",
        order: null
    }
];

describe("isGroup", () => {
    it("should return true for array of columns", () => {
        expect(isGroup(mockColumnGroup)).toBe(true);
    });

    it("should return false for single column", () => {
        expect(isGroup(mockColumn)).toBe(false);
    });

    it("should return true for empty array", () => {
        expect(isGroup([])).toBe(true);
    });
});

describe("scrollToAlgo", () => {
    const baseParams = {
        table: { width: 500, height: 300 },
        content: { width: 1000, height: 800 },
        cell: { x: 200, y: 150, width: 100, height: 50 },
        currentPosition: { x: 0, y: 0 }
    };

    describe("left direction", () => {
        it("should scroll to cell x position when cell is to the right", () => {
            const result = scrollToAlgo({
                ...baseParams,
                direction: "left",
                currentPosition: { x: 0, y: 0 }
            });

            expect(result.x).toBe(200);
            expect(result.y).toBe(0);
        });

        it("should not scroll beyond minX", () => {
            const result = scrollToAlgo({
                ...baseParams,
                direction: "left",
                cell: { ...baseParams.cell, x: -100 },
                currentPosition: { x: 50, y: 0 }
            });

            expect(result.x).toBe(0);
            expect(result.y).toBe(0);
        });
    });

    describe("right direction", () => {
        it("should scroll to show right edge of cell", () => {
            const result = scrollToAlgo({
                ...baseParams,
                direction: "right",
                currentPosition: { x: 0, y: 0 }
            });

            expect(result.x).toBe(-200);
            expect(result.y).toBe(0);
        });

        it("should calculate correct right edge position", () => {
            const result = scrollToAlgo({
                ...baseParams,
                table: { width: 200, height: 300 },
                direction: "right",
                currentPosition: { x: 0, y: 0 }
            });

            expect(result.x).toBe(100);
        });

        it("should not scroll beyond maxX", () => {
            const result = scrollToAlgo({
                ...baseParams,
                content: { width: 600, height: 800 },
                table: { width: 200, height: 300 },
                direction: "right",
                cell: { x: 500, y: 150, width: 100, height: 50 },
                currentPosition: { x: 0, y: 0 }
            });

            expect(result.x).toBe(400);
        });
    });

    describe("top direction", () => {
        it("should scroll to show bottom edge of cell", () => {
            const result = scrollToAlgo({
                ...baseParams,
                direction: "top",
                currentPosition: { x: 0, y: 0 }
            });

            expect(result.y).toBe(-100);
            expect(result.x).toBe(0);
        });

        it("should calculate correct bottom edge position", () => {
            const result = scrollToAlgo({
                ...baseParams,
                table: { width: 500, height: 100 },
                direction: "top",
                currentPosition: { x: 0, y: 0 }
            });

            expect(result.y).toBe(100);
        });
    });

    describe("bottom direction", () => {
        it("should scroll to cell y position", () => {
            const result = scrollToAlgo({
                ...baseParams,
                direction: "bottom",
                currentPosition: { x: 0, y: 0 }
            });

            expect(result.y).toBe(150);
            expect(result.x).toBe(0);
        });

        it("should not scroll beyond minY", () => {
            const result = scrollToAlgo({
                ...baseParams,
                direction: "bottom",
                cell: { ...baseParams.cell, y: -50 },
                currentPosition: { x: 0, y: 20 }
            });

            expect(result.y).toBe(0);
        });
    });

    describe("edge cases", () => {
        it("should handle content smaller than table width", () => {
            const result = scrollToAlgo({
                table: { width: 500, height: 300 },
                content: { width: 400, height: 800 },
                cell: { x: 200, y: 150, width: 100, height: 50 },
                direction: "right",
                currentPosition: { x: 100, y: 50 }
            });

            expect(result.x).toBe(0);
        });

        it("should handle content smaller than table height", () => {
            const result = scrollToAlgo({
                table: { width: 500, height: 300 },
                content: { width: 1000, height: 200 },
                cell: { x: 200, y: 150, width: 100, height: 50 },
                direction: "bottom",
                currentPosition: { x: 100, y: 50 }
            });

            expect(result.y).toBe(150);
        });
    });
});

describe("ColumnResizeHelper", () => {
    describe("generateColumnsMetadata", () => {
        it("should generate metadata for specified number of columns", () => {
            const result = ColumnResizeHelper.generateColumnsMetadata(3,[DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH], 600);

            expect(result).toHaveLength(3);

            const expectedWidth = DEFAULT_COLUMN_WIDTH;
            expect(result[0]).toEqual({ x: 0, width: expectedWidth });
            expect(result[1]).toEqual({ x: expectedWidth, width: expectedWidth });
            expect(result[2]).toEqual({ x: expectedWidth * 2, width: expectedWidth });
        });

        it("should use tableWidth/columnsCount when possible", () => {
            const result = ColumnResizeHelper.generateColumnsMetadata(4,[DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH], 800);

            const expectedWidth = DEFAULT_COLUMN_WIDTH;
            expect(result[0].width).toBe(expectedWidth);
            expect(result[3].x).toBe(expectedWidth * 3);
        });

        it("should use tableWidth/columnsCount when total columns width is less than table width", () => {
            const result = ColumnResizeHelper.generateColumnsMetadata(4,[DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH], 1000);

            const expectedWidth = 1000 / 4;
            expect(result[0].width).toBe(expectedWidth);
            expect(result[3].x).toBe(expectedWidth * 3);
        });

        it("should use DEFAULT_COLUMN_WIDTH when total columns width exceeds table width", () => {
            const result = ColumnResizeHelper.generateColumnsMetadata(10,[DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH],500);

            const expectedWidth = DEFAULT_COLUMN_WIDTH;
            expect(result[0].width).toBe(expectedWidth);
            expect(result[9].x).toBe(expectedWidth * 9);
        });

        it("should handle zero columns", () => {
            const result = ColumnResizeHelper.generateColumnsMetadata(0,[DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH], 500);
            expect(result).toHaveLength(0);
        });

        it("should handle edge case where columns exactly fit table width", () => {
            const exactFitWidth = DEFAULT_COLUMN_WIDTH * 2;
            const result = ColumnResizeHelper.generateColumnsMetadata(2,[DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH], exactFitWidth);

            expect(result[0].width).toBe(DEFAULT_COLUMN_WIDTH);
            expect(result[1].width).toBe(DEFAULT_COLUMN_WIDTH);
            expect(result[1].x).toBe(DEFAULT_COLUMN_WIDTH);
        });
    });

    describe("resizeColumnWidth", () => {
        const initialMetadata: IInnerColumnMetadata[] = [
            { x: 0, width: 100 },
            { x: 100, width: 100 },
            { x: 200, width: 100 }
        ];

        it("should resize specified column and update subsequent positions", () => {
            const result = ColumnResizeHelper.resizeColumnWidth(initialMetadata, 1, 150, 350);

            expect(result[1].width).toBe(150);
            expect(result[2].x).toBe(250);
        });

        it("should distribute excess width to right columns when total < table width", () => {
            const result = ColumnResizeHelper.resizeColumnWidth(initialMetadata, 1, 120, 350);

            expect(result[1].width).toBe(120);
            expect(result[2].width).toBe(130);
            expect(result[2].x).toBe(220);
        });

        it("should handle invalid column index", () => {
            const result = ColumnResizeHelper.resizeColumnWidth(initialMetadata, -1, 150, 350);
            expect(result).toEqual(initialMetadata);

            const result2 = ColumnResizeHelper.resizeColumnWidth(initialMetadata, 5, 150, 350);
            expect(result2).toEqual(initialMetadata);
        });

        it("should return same array when width doesn't change", () => {
            const result = ColumnResizeHelper.resizeColumnWidth(initialMetadata, 1, 100, 350);
            expect(result).toEqual(initialMetadata);
        });

        it("should handle minimum width constraints", () => {
            const result = ColumnResizeHelper.resizeColumnWidth(initialMetadata, 1, 50, 350);
            expect(result[1].width).toBe(50);
        });
    });

    describe("resizeTableWidth", () => {
        const initialMetadata: IInnerColumnMetadata[] = [
            { x: 0, width: 100 },
            { x: 100, width: 100 },
            { x: 200, width: 100 }
        ];

        it("should return same metadata when new width is smaller", () => {
            const result = ColumnResizeHelper.resizeTableWidth(initialMetadata, 400, 300);
            expect(result).toEqual(initialMetadata);
        });

        it("should distribute extra width evenly among all columns", () => {
            const result = ColumnResizeHelper.resizeTableWidth(initialMetadata, 300, 600);

            expect(result[0]).toEqual({ x: 0, width: 200 });
            expect(result[1]).toEqual({ x: 200, width: 200 });
            expect(result[2]).toEqual({ x: 400, width: 200 });
        });

        it("should handle empty columns array", () => {
            const result = ColumnResizeHelper.resizeTableWidth([], 300, 600);
            expect(result).toEqual([]);
        });

        it("should maintain correct x positions after resize", () => {
            const result = ColumnResizeHelper.resizeTableWidth(initialMetadata, 300, 450);

            expect(result[0].x).toBe(0);
            expect(result[1].x).toBe(150);
            expect(result[2].x).toBe(300);
        });
    });
});