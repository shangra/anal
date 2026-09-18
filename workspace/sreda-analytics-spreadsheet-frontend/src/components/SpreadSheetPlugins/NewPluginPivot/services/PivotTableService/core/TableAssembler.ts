import { ICellWithStyles } from '../../../../../AdapterSpreadSheet/types';
import {
    AggregationDataMap,
    IAssembleResult,
    IBodyRenderer,
    IBuildContext,
    IColumnGroupItem,
    IGeometryCalculator,
    IHeaderRenderer,
    IRowGroupItem,
    ITableAssembler,
    ITableDimensions,
    IVisibilityFilter,
} from '../types';

export default class TableAssembler implements ITableAssembler {
    constructor(
        private geometryCalculator: IGeometryCalculator,
        private visibilityFilter: IVisibilityFilter,
        private headerRenderer: IHeaderRenderer,
        private bodyRenderer: IBodyRenderer,
    ) {}

    assemble(
        rowGroups: IRowGroupItem[],
        colGroups: IColumnGroupItem[],
        dataMap: AggregationDataMap,
        ctx: IBuildContext,
    ): IAssembleResult {
        const table = this.buildFilterLegendSection(ctx);

        const visibleColGroups = this.visibilityFilter.filterVisibleColumns(colGroups);
        const visibleRowGroups = this.visibilityFilter.filterVisibleRows(rowGroups);

        const startRow = this.computeStartRowAfterFilters(table);
        const geometry = this.geometryCalculator.computeColumnHeaderGeometry(startRow, ctx);

        const rowHeaderCols = this.geometryCalculator.getRowHeaderColumnCount(ctx);

        this.headerRenderer.renderColumnHeaders(table, geometry, colGroups, visibleColGroups, rowHeaderCols, ctx);

        this.headerRenderer.renderCornerCells(table, geometry, rowHeaderCols, ctx);

        const hasColumnsTotal = ctx.currentData?.params.totals?.columns ?? false;
        const hasRowsTotal = ctx.currentData?.params.totals?.indexes ?? false;

        if (hasColumnsTotal) {
            this.headerRenderer.renderGrandTotalColumnHeaders(table, geometry, visibleColGroups, rowHeaderCols, ctx);
        }

        this.bodyRenderer.renderDataRows(
            table,
            geometry.dataRowOffset,
            visibleRowGroups,
            visibleColGroups,
            dataMap,
            hasColumnsTotal,
            rowHeaderCols,
            ctx,
        );

        if (hasRowsTotal) {
            this.bodyRenderer.renderGrandTotalRow(
                table,
                geometry.dataRowOffset + visibleRowGroups.length,
                visibleRowGroups,
                visibleColGroups,
                dataMap,
                hasColumnsTotal,
                rowHeaderCols,
                ctx,
            );
        }

        const tableDimensions = this.computeTableDimensions(
            geometry.dataRowOffset,
            visibleRowGroups,
            visibleColGroups,
            hasRowsTotal,
            hasColumnsTotal,
            rowHeaderCols,
        );

        return { table, tableDimensions };
    }

    // ────────────────────────────────────────────────────────────────

    private buildFilterLegendSection(ctx: IBuildContext): Map<number, Map<number, ICellWithStyles>> {
        const filters = ctx.filterLegendRenderer.build(ctx.currentData?.params.where);
        return new Map(filters);
    }

    private computeStartRowAfterFilters(table: Map<number, Map<number, ICellWithStyles>>): number {
        const existingKeys = Array.from(table.keys());
        const maxFilterRow = existingKeys.length > 0 ? Math.max(...existingKeys) : -1;
        return maxFilterRow + 2;
    }

    private computeTableDimensions(
        dataRowOffset: number,
        visibleRowGroups: IRowGroupItem[],
        visibleColGroups: IColumnGroupItem[],
        hasRowsTotal: boolean,
        hasColumnsTotal: boolean,
        rowHeaderCols: number,
    ): ITableDimensions {
        return {
            totalRows: dataRowOffset + visibleRowGroups.length + (hasRowsTotal ? 1 : 0),
            totalColumns: rowHeaderCols + visibleColGroups.length + (hasColumnsTotal ? 1 : 0),
            headerRows: dataRowOffset,
            headerColumns: rowHeaderCols,
            dataRows: visibleRowGroups.length,
            dataColumns: visibleColGroups.length,
        };
    }
}
