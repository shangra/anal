import { IBuildContext, IColumnHeaderGeometry, IGeometryCalculator, IRowHeaderGeometry } from '../types';

const ROW_HEADER_COLUMNS_COMPACT = 1;

export default class GeometryCalculator implements IGeometryCalculator {
    private cachedRowHeaderGeometry: IRowHeaderGeometry | null = null;

    invalidateCache(): void {
        this.cachedRowHeaderGeometry = null;
    }

    getRowHeaderColumnCount(ctx: IBuildContext): number {
        if (!ctx.classicLayout) return ROW_HEADER_COLUMNS_COMPACT;
        return Math.max(this.getRowHeaderGeometry(ctx).totalColumns, 1);
    }

    getRowHeaderGeometry(ctx: IBuildContext): IRowHeaderGeometry {
        if (this.cachedRowHeaderGeometry) return this.cachedRowHeaderGeometry;

        const rowDims = ctx.parsedData.rowDimensions;

        const dimensionDepths = rowDims.map(
            (d) => ctx.hierarchyTreeManager.getDimensionTree(d.dimension.name)?.metadata?.depth ?? 1,
        );

        const cumulativeDepths: number[] = [];
        let cumSum = 0;
        for (const depth of dimensionDepths) {
            cumulativeDepths.push(cumSum);
            cumSum += depth;
        }

        this.cachedRowHeaderGeometry = {
            dimensionDepths,
            cumulativeDepths,
            totalColumns: Math.max(cumSum, 1),
        };

        return this.cachedRowHeaderGeometry;
    }

    computeColumnHeaderGeometry(colHeaderRowsOffset: number, ctx: IBuildContext): IColumnHeaderGeometry {
        const colDimensions = ctx.parsedData.columnDimensions;

        const dimensionDepths = colDimensions.map(
            (d) => ctx.hierarchyTreeManager.getDimensionTree(d.dimension.name)?.metadata?.depth ?? 1,
        );

        const cumulativeDepths: number[] = [];
        let cumSum = 0;
        for (const depth of dimensionDepths) {
            cumulativeDepths.push(cumSum);
            cumSum += depth;
        }

        const totalColHeaderRows = Math.max(cumSum, 1);

        return {
            colHeaderRowsOffset,
            totalColHeaderRows,
            dimensionDepths,
            cumulativeDepths,
            dataRowOffset: colHeaderRowsOffset + totalColHeaderRows,
        };
    }

    columnToDimensionLevel(
        col: number,
        cumulativeDepths: number[],
        dimensionDepths: number[],
    ): { dimIdx: number; levelInDim: number } {
        for (let i = cumulativeDepths.length - 1; i >= 0; i--) {
            if (col >= cumulativeDepths[i] && col < cumulativeDepths[i] + dimensionDepths[i]) {
                return { dimIdx: i, levelInDim: col - cumulativeDepths[i] };
            }
        }
        return { dimIdx: -1, levelInDim: 0 };
    }
}
