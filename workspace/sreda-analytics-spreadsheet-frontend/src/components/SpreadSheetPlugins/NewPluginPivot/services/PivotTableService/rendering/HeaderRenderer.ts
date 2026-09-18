import { ICellWithStyles } from '../../../../../AdapterSpreadSheet/types';
import {
    IBuildContext,
    IColumnGroupItem,
    IColumnHeaderGeometry,
    IFlatDimension,
    IGeometryCalculator,
    IHeaderRenderer,
} from '../types';
import { ensureTableRow } from './utils';

interface IColumnSlice {
    value: string | null;
    dimIdx: number;
    dimName: string;
    nodeLevel: number;
    isSubtotal: boolean;
    subtotalHidden: boolean;
}

export default class HeaderRenderer implements IHeaderRenderer {
    constructor(private geometryCalculator: IGeometryCalculator) {}

    // ════════════════════════════════════════════════════════════════════
    //  Column headers — single-pass approach
    // ════════════════════════════════════════════════════════════════════

    renderColumnHeaders(
        table: Map<number, Map<number, ICellWithStyles>>,
        geometry: IColumnHeaderGeometry,
        allColGroups: IColumnGroupItem[],
        visibleColGroups: IColumnGroupItem[],
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void {
        const { totalColHeaderRows, colHeaderRowsOffset } = geometry;

        for (let r = 0; r < totalColHeaderRows; r++) {
            ensureTableRow(table, colHeaderRowsOffset + r);
        }

        // key → физический индекс колонки в таблице (только для видимых)
        const visibleKeyToTableIndex = new Map<string, number>();
        visibleColGroups.forEach((g, idx) => visibleKeyToTableIndex.set(g.key, idx));

        // Кешируем dimName → позиция в colDimensions один раз на весь проход
        const dimNameToColIdx = new Map(ctx.parsedData.columnDimensions.map((d, i) => [d.dimension.name, i]));

        let prevSlice: IColumnSlice[] = this.createEmptySlice(totalColHeaderRows);

        for (const colGroup of allColGroups) {
            // 1. Строим срез для текущей колонки (всегда, включая скрытые)
            const currSlice = this.buildColumnSlice(colGroup, geometry, dimNameToColIdx, ctx);

            // 2. Первая строка, с которой нужно рендерить
            const firstChangedRow = this.findFirstChange(currSlice, prevSlice, colGroup);

            // 3. Рендерим только если колонка видима
            const tableColIndex = visibleKeyToTableIndex.get(colGroup.key);
            if (tableColIndex !== undefined) {
                for (let r = 0; r < totalColHeaderRows; r++) {
                    const rowIdx = colHeaderRowsOffset + r;
                    const rowMap = table.get(rowIdx)!;
                    const info = currSlice[r];

                    if (r >= firstChangedRow && info.value !== null) {
                        rowMap.set(rowHeaderCols + tableColIndex, this.buildColumnHeaderCellFromSlice(info, ctx));
                    } else {
                        rowMap.set(rowHeaderCols + tableColIndex, ctx.cellFactory.buildEmptyHeaderCell());
                    }
                }
            }

            if (!colGroup.subtotalHidden) {
                prevSlice = currSlice;
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  Column slice — строится из colGroup.values напрямую
    // ════════════════════════════════════════════════════════════════════

    /**
     * Рефакторинг: итерация по colGroup.values вместо цикла по columnDimensions.
     * dimNameToColIdx передаётся снаружи — вычисляется один раз на весь проход.
     */
    private buildColumnSlice(
        colGroup: IColumnGroupItem,
        geometry: IColumnHeaderGeometry,
        dimNameToColIdx: Map<string, number>,
        ctx: IBuildContext,
    ): IColumnSlice[] {
        const { totalColHeaderRows, cumulativeDepths } = geometry;
        const slice = this.createEmptySlice(totalColHeaderRows);

        for (const [dimName, dimValue] of colGroup.values) {
            const dimIdx = dimNameToColIdx.get(dimName);

            // Пропускаем измерения, выходящие за visibleDimensionIndex
            if (dimIdx === undefined || dimIdx > colGroup.dimIndex) continue;

            const stringValue = String(dimValue);
            const isTargetDim = dimIdx === colGroup.dimIndex;

            // Флаги субтотала применяются только к целевому измерению
            const isSubtotalForThisDim = colGroup.isSubtotal && isTargetDim;
            const subtotalHiddenForThisDim = colGroup.subtotalHidden && isTargetDim;

            const path = ctx.hierarchyTreeManager.buildPath(dimName, stringValue);
            const effectivePath = path.length > 0 ? path : [stringValue];

            for (const pathValue of effectivePath) {
                const node = ctx.hierarchyTreeManager.getNode(dimName, pathValue);
                const nodeLevel = node?.level ?? 0;
                const rowInHeader = cumulativeDepths[dimIdx] + nodeLevel;

                if (rowInHeader < totalColHeaderRows) {
                    const isLeafOfPath = pathValue === effectivePath[effectivePath.length - 1];

                    slice[rowInHeader] = {
                        value: pathValue,
                        dimIdx,
                        dimName,
                        nodeLevel,
                        isSubtotal: isSubtotalForThisDim && isLeafOfPath,
                        subtotalHidden: subtotalHiddenForThisDim && isLeafOfPath,
                    };
                }
            }
        }

        return slice;
    }

    // ════════════════════════════════════════════════════════════════════
    //  Staircase deduplication — O(R) per column
    // ════════════════════════════════════════════════════════════════════

    private findFirstChange(currSlice: IColumnSlice[], prevSlice: IColumnSlice[], colGroup: IColumnGroupItem): number {
        if (colGroup.isSubtotal) {
            for (let r = 0; r < currSlice.length; r++) {
                if (currSlice[r].value !== null && currSlice[r].isSubtotal) {
                    return r;
                }
            }
        }

        for (let r = 0; r < currSlice.length; r++) {
            if (currSlice[r].value !== prevSlice[r].value) {
                return r;
            }
        }

        return currSlice.length;
    }

    // ════════════════════════════════════════════════════════════════════
    //  Cell building
    // ════════════════════════════════════════════════════════════════════

    private buildColumnHeaderCellFromSlice(info: IColumnSlice, ctx: IBuildContext): ICellWithStyles {
        const colDimensions = ctx.parsedData.columnDimensions;
        const dim = colDimensions[info.dimIdx];
        const node = ctx.hierarchyTreeManager.getNode(info.dimName, info.value!);
        const refData = ctx.parsedData.refFields[info.dimName]?.[info.value!];
        const isLoading = ctx.loadingStateManager.isLoading(info.dimName, info.value!);

        return ctx.cellFactory.buildDimensionCell(
            info.dimName,
            dim.dimension.description || dim.dimension.label,
            dim.index,
            info.value!,
            ctx.viewResolver.resolveView(info.dimName, info.value!),
            info.nodeLevel,
            info.dimIdx,
            'column',
            info.subtotalHidden,
            info.isSubtotal,
            node?.hasChildren ?? false,
            node?.isExpanded ?? false,
            isLoading,
            node?.parent,
            refData,
            [],
        );
    }

    private createEmptySlice(length: number): IColumnSlice[] {
        return Array.from({ length }, () => ({
            value: null,
            dimIdx: -1,
            dimName: '',
            nodeLevel: 0,
            isSubtotal: false,
            subtotalHidden: false,
        }));
    }

    // ════════════════════════════════════════════════════════════════════
    //  Corner cells
    // ════════════════════════════════════════════════════════════════════

    renderCornerCells(
        table: Map<number, Map<number, ICellWithStyles>>,
        geometry: IColumnHeaderGeometry,
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void {
        if (ctx.classicLayout) {
            this.renderCornerCellsClassic(table, geometry, rowHeaderCols, ctx);
        } else {
            this.renderCornerCellsCompact(table, geometry, ctx);
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  Grand-total column headers
    // ════════════════════════════════════════════════════════════════════

    renderGrandTotalColumnHeaders(
        table: Map<number, Map<number, ICellWithStyles>>,
        geometry: IColumnHeaderGeometry,
        visibleColGroups: IColumnGroupItem[],
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void {
        const grandTotalColIdx = rowHeaderCols + visibleColGroups.length;

        for (let r = 0; r < geometry.totalColHeaderRows; r++) {
            const rowIdx = geometry.colHeaderRowsOffset + r;
            ensureTableRow(table, rowIdx);
            table
                .get(rowIdx)!
                .set(
                    grandTotalColIdx,
                    r === 0 ? ctx.cellFactory.buildGrandTotalHeaderCell() : ctx.cellFactory.buildEmptyHeaderCell(),
                );
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  Private — corner cells compact
    // ════════════════════════════════════════════════════════════════════

    private renderCornerCellsCompact(
        table: Map<number, Map<number, ICellWithStyles>>,
        geometry: IColumnHeaderGeometry,
        ctx: IBuildContext,
    ): void {
        const rowDimLabels = ctx.parsedData.rowDimensions.map(
            (d) => d.dimension.description || d.dimension.label || d.dimension.name,
        );

        for (let r = 0; r < geometry.totalColHeaderRows; r++) {
            const rowIdx = geometry.colHeaderRowsOffset + r;
            ensureTableRow(table, rowIdx);
            const rowMap = table.get(rowIdx)!;

            if (r === geometry.totalColHeaderRows - 1) {
                rowMap.set(0, ctx.cellFactory.buildCornerCell(rowDimLabels));
            } else if (!rowMap.has(0)) {
                rowMap.set(0, ctx.cellFactory.buildEmptyHeaderCell());
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════
    //  Private — corner cells classic
    // ════════════════════════════════════════════════════════════════════

    private renderCornerCellsClassic(
        table: Map<number, Map<number, ICellWithStyles>>,
        geometry: IColumnHeaderGeometry,
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void {
        const rowDims = ctx.parsedData.rowDimensions;
        const rowGeometry = this.geometryCalculator.getRowHeaderGeometry(ctx);
        const { dimensionDepths, cumulativeDepths } = rowGeometry;

        for (let r = 0; r < geometry.totalColHeaderRows; r++) {
            const rowIdx = geometry.colHeaderRowsOffset + r;
            ensureTableRow(table, rowIdx);
            const rowMap = table.get(rowIdx)!;

            const isLastRow = r === geometry.totalColHeaderRows - 1;

            for (let col = 0; col < rowHeaderCols; col++) {
                if (isLastRow) {
                    const { dimIdx, levelInDim } = this.geometryCalculator.columnToDimensionLevel(
                        col,
                        cumulativeDepths,
                        dimensionDepths,
                    );

                    if (dimIdx >= 0 && dimIdx < rowDims.length) {
                        const dim = rowDims[dimIdx];
                        const label = this.getHierarchyLevelLabel(dim, levelInDim);
                        rowMap.set(col, ctx.cellFactory.buildCornerCell([label]));
                    } else {
                        rowMap.set(col, ctx.cellFactory.buildEmptyHeaderCell());
                    }
                } else {
                    rowMap.set(col, ctx.cellFactory.buildEmptyHeaderCell());
                }
            }
        }
    }

    private getHierarchyLevelLabel(flatDim: IFlatDimension, level: number): string {
        const dim = flatDim.dimension;
        const children = dim.child;

        if (children && children.length > level) {
            return children[level].description || children[level].label || children[level].name;
        }

        return dim.description || dim.label || dim.name;
    }
}
