import { ICellWithStyles } from '../../../../../AdapterSpreadSheet/types';
import {
    AggregationDataMap,
    IAggregationResult,
    IBodyRenderer,
    IBuildContext,
    IColumnGroupItem,
    IFlatDimension,
    IGeometryCalculator,
    IMeasure,
    IRowGroupItem,
} from '../types';

export default class BodyRenderer implements IBodyRenderer {
    constructor(private geometryCalculator: IGeometryCalculator) {}

    // ════════════════════════════════════════════════════════════════════
    //  Data rows
    // ════════════════════════════════════════════════════════════════════

    renderDataRows(
        table: Map<number, Map<number, ICellWithStyles>>,
        dataRowOffset: number,
        visibleRowGroups: IRowGroupItem[],
        visibleColGroups: IColumnGroupItem[],
        dataMap: AggregationDataMap,
        hasColumnsTotal: boolean,
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void {
        visibleRowGroups.forEach((rowGroup, idx) => {
            const rowMap = new Map<number, ICellWithStyles>();

            if (ctx.classicLayout) {
                const headerCells = this.createRowHeaderCellsClassic(rowGroup, ctx);
                for (const [colIdx, cell] of headerCells) {
                    rowMap.set(colIdx, cell);
                }
            } else {
                rowMap.set(0, this.createRowHeaderCell(rowGroup, ctx));
            }

            visibleColGroups.forEach((colGroup, colIdx) => {
                rowMap.set(rowHeaderCols + colIdx, this.createDataCell(rowGroup, colGroup, dataMap, ctx));
            });

            if (hasColumnsTotal) {
                rowMap.set(
                    rowHeaderCols + visibleColGroups.length,
                    this.createRowTotalCell(rowGroup, visibleColGroups, dataMap, ctx),
                );
            }

            table.set(dataRowOffset + idx, rowMap);
        });
    }

    // ════════════════════════════════════════════════════════════════════
    //  Grand-total row
    // ════════════════════════════════════════════════════════════════════

    renderGrandTotalRow(
        table: Map<number, Map<number, ICellWithStyles>>,
        grandTotalRowIdx: number,
        visibleRowGroups: IRowGroupItem[],
        visibleColGroups: IColumnGroupItem[],
        dataMap: AggregationDataMap,
        hasColumnsTotal: boolean,
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void {
        const rowMap = new Map<number, ICellWithStyles>();

        rowMap.set(0, ctx.cellFactory.buildGrandTotalHeaderCell());
        for (let col = 1; col < rowHeaderCols; col++) {
            rowMap.set(col, ctx.cellFactory.buildEmptyHeaderCell());
        }

        visibleColGroups.forEach((colGroup, colIdx) => {
            rowMap.set(rowHeaderCols + colIdx, this.createColumnTotalCell(colGroup, visibleRowGroups, dataMap, ctx));
        });

        if (hasColumnsTotal) {
            rowMap.set(
                rowHeaderCols + visibleColGroups.length,
                this.createGrandGrandTotalCell(visibleRowGroups, visibleColGroups, dataMap, ctx),
            );
        }

        table.set(grandTotalRowIdx, rowMap);
    }

    // ════════════════════════════════════════════════════════════════════
    //  Row header — compact
    // ════════════════════════════════════════════════════════════════════

    private createRowHeaderCell(rowGroup: IRowGroupItem, ctx: IBuildContext): ICellWithStyles {
        const allDimensions = ctx.parsedData.rowDimensions;
        const flatDim = allDimensions[rowGroup.dimIndex];

        if (!flatDim) return ctx.cellFactory.buildEmptyCell();

        const { dimension } = flatDim;
        const dimValue = rowGroup.values.get(dimension.name);
        const node = ctx.hierarchyTreeManager.getNode(dimension.name, dimValue);
        const refData = ctx.parsedData.refFields[dimension.name]?.[dimValue];
        const isLoading = ctx.loadingStateManager.isLoading(dimension.name, dimValue);

        return ctx.cellFactory.buildDimensionCell(
            dimension.name,
            dimension.label,
            flatDim.index,
            dimValue,
            ctx.viewResolver.resolveView(dimension.name, dimValue),
            rowGroup.level,
            rowGroup.dimIndex,
            'row',
            rowGroup.subtotalHidden,
            rowGroup.isSubtotal,
            node?.hasChildren ?? false,
            node?.isExpanded ?? false,
            isLoading,
            node?.parent,
            refData,
            rowGroup.prevDimensionDepths,
        );
    }

    // ════════════════════════════════════════════════════════════════════
    //  Row header — classic
    // ════════════════════════════════════════════════════════════════════

    private createRowHeaderCellsClassic(rowGroup: IRowGroupItem, ctx: IBuildContext): Map<number, ICellWithStyles> {
        const cells = new Map<number, ICellWithStyles>();
        const allDimensions = ctx.parsedData.rowDimensions;
        const rowGeometry = this.geometryCalculator.getRowHeaderGeometry(ctx);
        const { cumulativeDepths, totalColumns } = rowGeometry;

        // ── Empty cells follow the same principle as compact layout ────
        // Background only on the top-level first-dimension subtotal row.
        // All other rows: empty cells have no background.
        const rowHasBackground = rowGroup.isSubtotal && rowGroup.dimIndex === 0 && rowGroup.level === 0;

        for (let col = 0; col < totalColumns; col++) {
            cells.set(
                col,
                rowHasBackground
                    ? ctx.cellFactory.buildEmptyHeaderCell() // with background
                    : ctx.cellFactory.buildEmptyCell(), // without background
            );
        }

        // ── Dimension cells: CellFactory already applies compact rules ──
        // We only override paddingLeft=0 (classic uses columns, not indent).
        for (let dimIdx = 0; dimIdx <= rowGroup.dimIndex && dimIdx < allDimensions.length; dimIdx++) {
            const flatDim = allDimensions[dimIdx];
            const { dimension } = flatDim;
            const dimValue = rowGroup.values.get(dimension.name);

            if (dimValue === undefined) continue;

            const dimName = dimension.name;
            const isTargetDim = dimIdx === rowGroup.dimIndex;

            if (ctx.dimensionAnalyzer.isSpecialDimension(dimName)) {
                const colOffset = cumulativeDepths[dimIdx];
                const cell = this.buildClassicDimensionCell(flatDim, dimValue, 0, dimIdx, rowGroup, isTargetDim, ctx);
                cells.set(colOffset, cell);
                continue;
            }

            const path = ctx.hierarchyTreeManager.buildPath(dimName, String(dimValue));
            const effectivePath = path.length > 0 ? path : [String(dimValue)];

            for (let pathIdx = 0; pathIdx < effectivePath.length; pathIdx++) {
                const colOffset = cumulativeDepths[dimIdx] + pathIdx;
                if (colOffset >= totalColumns) break;

                const pathValue = effectivePath[pathIdx];
                const node = ctx.hierarchyTreeManager.getNode(dimName, pathValue);
                const isLastInPath = pathIdx === effectivePath.length - 1;
                const showDrillButton = isTargetDim && isLastInPath;
                const nodeLevel = node?.level ?? pathIdx;

                const isSubtotalCell = rowGroup.isSubtotal && isTargetDim && isLastInPath;
                const resolvedView = ctx.viewResolver.resolveView(dimName, pathValue);
                const displayValue = isSubtotalCell ? `${resolvedView} Итого` : resolvedView;

                const cell = ctx.cellFactory.buildDimensionCell(
                    dimName,
                    dimension.description || dimension.label,
                    flatDim.index,
                    pathValue,
                    displayValue,
                    nodeLevel,
                    dimIdx,
                    'row',
                    rowGroup.subtotalHidden,
                    isSubtotalCell,
                    showDrillButton ? node?.hasChildren ?? false : false,
                    node?.isExpanded ?? false,
                    ctx.loadingStateManager.isLoading(dimName, pathValue),
                    node?.parent,
                    ctx.parsedData.refFields[dimName]?.[pathValue],
                    [],
                );

                if (cell.styles) {
                    cell.styles = { ...cell.styles, paddingLeft: 0 };
                }

                cells.set(colOffset, cell);
            }
        }

        return cells;
    }

    private buildClassicDimensionCell(
        flatDim: IFlatDimension,
        value: any,
        level: number,
        dimIdx: number,
        rowGroup: IRowGroupItem,
        isTargetDim: boolean,
        ctx: IBuildContext,
    ): ICellWithStyles {
        const { dimension } = flatDim;
        const node = ctx.hierarchyTreeManager.getNode(dimension.name, value);
        const refData = ctx.parsedData.refFields[dimension.name]?.[value];
        const isLoading = ctx.loadingStateManager.isLoading(dimension.name, value);

        const isSubtotalCell = rowGroup.isSubtotal && isTargetDim;
        const resolvedView = ctx.viewResolver.resolveView(dimension.name, value);
        const displayValue = isSubtotalCell ? `${resolvedView} Итого` : resolvedView;

        const cell = ctx.cellFactory.buildDimensionCell(
            dimension.name,
            dimension.description || dimension.label,
            flatDim.index,
            value,
            displayValue,
            level,
            dimIdx,
            'row',
            rowGroup.subtotalHidden,
            isSubtotalCell,
            isTargetDim ? node?.hasChildren ?? false : false,
            node?.isExpanded ?? false,
            isLoading,
            node?.parent,
            refData,
            [],
        );

        // Classic layout: only override paddingLeft.
        // Background and bold are handled by CellFactory using compact rules.
        if (cell.styles) {
            cell.styles = { ...cell.styles, paddingLeft: 0 };
        }

        return cell;
    }

    // ════════════════════════════════════════════════════════════════════
    //  Data / total cells
    // ════════════════════════════════════════════════════════════════════

    private createDataCell(
        rowGroup: IRowGroupItem,
        colGroup: IColumnGroupItem,
        dataMap: AggregationDataMap,
        ctx: IBuildContext,
    ): ICellWithStyles {
        const measureKey = this.buildMeasureKey(ctx, rowGroup, colGroup);
        if (!measureKey) return ctx.cellFactory.buildEmptyCell();

        const rowLookupKey = rowGroup.key.replace(/:->:subtotal$/, '');
        const colLookupKey = colGroup.key.replace(/:->:subtotal$/, '');

        const aggregationResult = dataMap.get(rowLookupKey)?.get(colLookupKey)?.get(measureKey);
        const [, aggregateFunction] = measureKey.split(':->:');

        const value =
            aggregationResult !== undefined
                ? ctx.aggregationEngine.finalizeAggregation(aggregationResult, aggregateFunction)
                : undefined;

        return this.buildMeasureCellFromKey(measureKey, value, rowGroup, colGroup, false, ctx);
    }

    private createRowTotalCell(
        rowGroup: IRowGroupItem,
        visibleColGroups: IColumnGroupItem[],
        dataMap: AggregationDataMap,
        ctx: IBuildContext,
    ): ICellWithStyles {
        const measureKey = this.buildMeasureKey(ctx, rowGroup);
        if (!measureKey) return ctx.cellFactory.buildEmptyCell();

        const [, aggregateFunction] = measureKey.split(':->:');
        const rowLookupKey = rowGroup.key.replace(/:->:subtotal$/, '');

        const result = this.aggregateAcrossColumns(
            rowLookupKey,
            visibleColGroups,
            measureKey,
            aggregateFunction,
            dataMap,
            ctx,
        );
        const total = result ? ctx.aggregationEngine.finalizeAggregation(result, aggregateFunction) : 0;

        return this.buildMeasureCellFromKey(measureKey, total, rowGroup, { values: new Map() } as IColumnGroupItem, true, ctx);
    }

    private createColumnTotalCell(
        colGroup: IColumnGroupItem,
        visibleRowGroups: IRowGroupItem[],
        dataMap: AggregationDataMap,
        ctx: IBuildContext,
    ): ICellWithStyles {
        const measureKey = this.buildMeasureKey(ctx, undefined, colGroup);
        if (!measureKey) return ctx.cellFactory.buildEmptyCell();

        const [, aggregateFunction] = measureKey.split(':->:');
        const colLookupKey = colGroup.key.replace(/:->:subtotal$/, '');

        const result = this.aggregateAcrossRows(colLookupKey, visibleRowGroups, measureKey, aggregateFunction, dataMap, ctx);
        const total = result ? ctx.aggregationEngine.finalizeAggregation(result, aggregateFunction) : 0;

        return this.buildMeasureCellFromKey(
            measureKey,
            total,
            { values: new Map(), isSubtotal: false } as IRowGroupItem,
            colGroup,
            true,
            ctx,
        );
    }

    private createGrandGrandTotalCell(
        rowGroups: IRowGroupItem[],
        columnGroups: IColumnGroupItem[],
        dataMap: AggregationDataMap,
        ctx: IBuildContext,
    ): ICellWithStyles {
        const measureKey = this.buildMeasureKey(ctx);
        if (!measureKey) return ctx.cellFactory.buildEmptyCell();

        const [, aggregateFunction] = measureKey.split(':->:');

        const result = this.aggregateAllCells(rowGroups, columnGroups, measureKey, aggregateFunction, dataMap, ctx);
        const total = result ? ctx.aggregationEngine.finalizeAggregation(result, aggregateFunction) : 0;

        return this.buildMeasureCellFromKey(
            measureKey,
            total,
            { values: new Map(), isSubtotal: false } as IRowGroupItem,
            { values: new Map(), isSubtotal: false } as IColumnGroupItem,
            true,
            ctx,
        );
    }

    // ════════════════════════════════════════════════════════════════════
    //  Aggregation helpers
    // ════════════════════════════════════════════════════════════════════

    private aggregateAcrossColumns(
        rowLookupKey: string,
        columns: IColumnGroupItem[],
        measureKey: string,
        aggregateFunction: string,
        dataMap: AggregationDataMap,
        ctx: IBuildContext,
    ): IAggregationResult | undefined {
        let result: IAggregationResult | undefined;
        for (const colGroup of columns) {
            if (colGroup.isSubtotal) continue;
            const colLookupKey = colGroup.key.replace(/:->:subtotal$/, '');
            const cellResult = dataMap.get(rowLookupKey)?.get(colLookupKey)?.get(measureKey);
            if (cellResult !== undefined) {
                result = ctx.aggregationEngine.mergeResults(result, cellResult, aggregateFunction);
            }
        }
        return result;
    }

    private aggregateAcrossRows(
        colLookupKey: string,
        rows: IRowGroupItem[],
        measureKey: string,
        aggregateFunction: string,
        dataMap: AggregationDataMap,
        ctx: IBuildContext,
    ): IAggregationResult | undefined {
        let result: IAggregationResult | undefined;
        for (const rowGroup of rows) {
            if (rowGroup.isSubtotal) continue;
            const rowLookupKey = rowGroup.key.replace(/:->:subtotal$/, '');
            const cellResult = dataMap.get(rowLookupKey)?.get(colLookupKey)?.get(measureKey);
            if (cellResult !== undefined) {
                result = ctx.aggregationEngine.mergeResults(result, cellResult, aggregateFunction);
            }
        }
        return result;
    }

    private aggregateAllCells(
        rows: IRowGroupItem[],
        columns: IColumnGroupItem[],
        measureKey: string,
        aggregateFunction: string,
        dataMap: AggregationDataMap,
        ctx: IBuildContext,
    ): IAggregationResult | undefined {
        let result: IAggregationResult | undefined;
        for (const rowGroup of rows) {
            if (rowGroup.isSubtotal) continue;
            const rowLookupKey = rowGroup.key.replace(/:->:subtotal$/, '');
            for (const colGroup of columns) {
                if (colGroup.isSubtotal) continue;
                const colLookupKey = colGroup.key.replace(/:->:subtotal$/, '');
                const cellResult = dataMap.get(rowLookupKey)?.get(colLookupKey)?.get(measureKey);
                if (cellResult !== undefined) {
                    result = ctx.aggregationEngine.mergeResults(result, cellResult, aggregateFunction);
                }
            }
        }
        return result;
    }

    // ════════════════════════════════════════════════════════════════════
    //  Measure resolution
    // ════════════════════════════════════════════════════════════════════

    private buildMeasureKey(ctx: IBuildContext, rowGroup?: IRowGroupItem, colGroup?: IColumnGroupItem): string | null {
        let compoundKey: string | undefined;

        if (rowGroup?.values.has('__values__')) {
            compoundKey = rowGroup.values.get('__values__');
        } else if (colGroup?.values.has('__values__')) {
            compoundKey = colGroup.values.get('__values__');
        }

        if (compoundKey) {
            if (compoundKey.includes(':->:')) {
                return compoundKey;
            }

            const measure = ctx.parsedData.measures.find((m) => m.name === compoundKey);
            if (!measure || measure.child.length === 0) return null;

            const aggregate = measure.child[0];
            return `${compoundKey}:->:${aggregate.sqlName || aggregate.name}`;
        }

        const measure = ctx.parsedData.measures[0];
        if (!measure || measure.child.length === 0) return null;

        const aggregate = measure.child[0];
        return `${measure.name}:->:${aggregate.sqlName || aggregate.name}`;
    }

    private resolveLayerName(ctx: IBuildContext, rowGroup?: IRowGroupItem, colGroup?: IColumnGroupItem): string {
        if (rowGroup?.values.has('__layers__')) return rowGroup.values.get('__layers__') || '';
        if (colGroup?.values.has('__layers__')) return colGroup.values.get('__layers__') || '';
        return ctx.parsedData.layers[0]?.name ?? '';
    }

    private buildMeasureCellFromKey(
        measureKey: string,
        value: any,
        rowGroup: IRowGroupItem,
        colGroup: IColumnGroupItem,
        isGrandTotal: boolean,
        ctx: IBuildContext,
    ): ICellWithStyles {
        const [measureName, aggregateFunction] = measureKey.split(':->:');

        const measure = ctx.parsedData.measures.find((m) => m.name === measureName);
        const aggregate = measure?.child.find((a) => (a.sqlName || a.name) === aggregateFunction);
        const layerName = this.resolveLayerName(ctx, rowGroup, colGroup);

        const format = (aggregate as IMeasure | undefined)?.format || measure?.format;

        return ctx.cellFactory.buildMeasureCell(
            value,
            measureName,
            ctx.viewResolver.resolveView('__values__', measureKey),
            layerName,
            ctx.viewResolver.resolveView('__layers__', layerName),
            aggregateFunction,
            aggregate?.description || aggregate?.label || aggregateFunction,
            rowGroup,
            colGroup,
            isGrandTotal,
            format,
        );
    }
}
