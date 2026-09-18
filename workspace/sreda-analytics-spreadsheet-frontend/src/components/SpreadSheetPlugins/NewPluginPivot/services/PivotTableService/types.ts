import { IButton, ICellStyles, ICellWithStyles, ObjectIndexes } from '../../../../AdapterSpreadSheet/types';
import { CellFormattingType } from '../../../PluginCellFormatting/types';

export type TPivotSort = [string, 'ASC' | 'DESC'];

export interface IPivotEqualFilter {
    $eq: string | number;
}

export interface IPivotBetweenFilter {
    $lte?: string | number;
    $gte?: string | number;
}

export interface IPivotLevelFilter {
    __level__: number | string;
}
export interface IPivotParentFilter {
    __parent__: number | string;
}

export interface IPivotFilter {
    [key: string]:
        | number
        | string
        | boolean
        | IPivotEqualFilter
        | IPivotBetweenFilter
        | IPivotLevelFilter
        | IPivotParentFilter;
}

export interface IPivotFilterGroup {
    $and?: (IPivotFilterGroup | IPivotFilter)[];
    $or?: (IPivotFilterGroup | IPivotFilter)[];
}

export interface ICornerMetadata {
    rowDimensionLabels: string[];
}

export interface IAggregateMetadata {
    aggregateFunction: string;
    aggregateLabel: string;
}

export interface IDimensionMetadata {
    name: string;
    label: string;
    level: number;
    dimensionIndex: number;
    hasChildren: boolean;
    isExpanded: boolean;
    parent?: string;
    refData?: any;
    axis: 'row' | 'column';
    isSubtotal: boolean;
    subtotalHidden: boolean;
}

export interface IMeasureMetadata {
    measureName: string;
    measureLabel: string;
    layerName: string;
    layerLabel: string;
    aggregateFunction: string;
    aggregateLabel: string;
    fullKey: string;
    rowDimensions: Record<string, any>;
    columnDimensions: Record<string, any>;
    isSubtotal?: boolean;
    isGrandTotal?: boolean;
}

export interface IPivotCellMetadata {
    type: 'dimension' | 'measure' | 'corner' | 'aggregate' | 'empty' | 'grand_total' | 'layer_header' | 'measure_header';
    dimension?: IDimensionMetadata;
    measure?: IMeasureMetadata;
    aggregate?: IAggregateMetadata;
    corner?: ICornerMetadata;
    isEmpty?: boolean;
    isGrandTotal?: boolean;
    layerHeader?: {
        layerName: string;
        layerLabel: string;
    };
    measureHeader?: {
        measureName: string;
        measureLabel: string;
    };
}

export interface IDimension {
    id: string;
    name: string;
    label: string;
    description: string;
    type: string;
    ref?: {
        link: string;
        value: string;
    };
    child?: IDimension[];
}

export interface IAggregate {
    id: string;
    name: string;
    sqlName?: string;
    label: string;
    description?: string;
    type: string;
    format?: CellFormattingType;
}

export interface IMeasure {
    id: string;
    name: string;
    label: string;
    description: string;
    type: string;
    child: IAggregate[];
    format?: CellFormattingType;
}

export interface ILayer {
    id: string;
    name: string;
    label: string;
    description: string;
    ref: string;
    type: string;
}

export interface IHierarchyField {
    field: string;
    name: string;
    description: string;
    hierarchy: boolean;
    subtotal: boolean;
    subtotalPosition?: 'top' | 'bottom';
    ref?: {
        link: string;
        value: string;
    };
    refOrderField?: {
        link: string;
        value: string;
    };
    refOrderDirection?: 'ASC' | 'DESC';
}

export interface IOrderConfig {
    orderDirection: 'ASC' | 'DESC';
    type: 'integer' | 'float' | 'uuid' | 'ref' | 'string' | 'varchar' | 'text' | 'date' | string;
    infoserviceField: string;
    fieldName?: string;
}

export interface IDataRow {
    __no_ref__: number;
    __type__: 'main' | 'columns' | 'indices' | 'totals';
    __drill_parent__?: string;
    __drill_dimension__?: string;
    __drill_level__?: number;
    [key: string]: any;
}

export interface IPivotParamsHeader {
    id?: string;
    name?: string;
    sqlName?: string;
    label?: string;
    description?: string;
    ref?: any;
    manifest?: any;
    type?: string;
    child?: IPivotParamsHeader[];
    format?: CellFormattingType;
}

export interface IPivotParams {
    columns: IPivotParamsHeader[];
    rows: IPivotParamsHeader[];
    values: IPivotParamsHeader[];
    where: IPivotFilterGroup | IPivotFilter;
    systemWhere?: IPivotFilter[] | IPivotFilter;
    order: {
        columns?: TPivotSort[];
        rows?: TPivotSort[];
        values?: TPivotSort[];
        filter?: TPivotSort[];
    };
    layers: IPivotParamsHeader[];
    totals: {
        indexes?: boolean;
        columns?: boolean;
        totals?: boolean;
    };
    isMask: boolean;
}

export interface IPivotTable {
    viewField: Record<string, string>;
    hierarchyFields: Record<string, IHierarchyField>;
    order: IOrderConfig[];
    rows: IDataRow[];
    refFields: Record<string, Record<string, any>>;
}

export interface IPivotData {
    params: IPivotParams;
    table: IPivotTable;
}

export interface ITreeNode {
    id: string;
    dimensionName: string;
    value: any;
    level: number;
    parent?: string;
    children: string[];
    isExpanded: boolean;
    hasChildren: boolean;
    hasData: boolean;
    data?: IPivotTable;
}

export interface ITreeMetadata {
    /** Глубина иерархии — максимальный уровень видимых узлов + 1 */
    depth: number;
    isHierarchical: boolean;
}

export interface ITree {
    metadata: ITreeMetadata;
    nodes: Map<string, ITreeNode>;
}

export interface IFlatDimension {
    dimension: IDimension;
    index: number;
    parentDimension?: string;
    isChild: boolean;
}

export interface IRowGroupItem {
    key: string;
    values: Map<string, any>;
    dimIndex: number;
    parentKey?: string;
    isSubtotal: boolean;
    subtotalHidden: boolean;
    sortOrder: number;
    level: number;
    childrenIndex: number;
    prevDimensionDepths: number[];
}

export interface IColumnGroupItem {
    key: string;
    values: Map<string, any>;
    dimIndex: number;
    parentKey?: string;
    isSubtotal: boolean;
    subtotalHidden: boolean;
    sortOrder: number;
    level: number;
    childrenIndex: number;
    prevDimensionDepths: number[];
}

export interface IDrillDownFilter {
    dimensionName: string;
    value: string;
    level: number;
}

export interface IDrillDownRequest {
    dimensionName: string;
    nodeId: string;
    parentNodeId?: string;
    level: number;
    activeFilters: IDrillDownFilter[];
}

export interface IDrillDownResponse {
    /** Drill-down children rows. */
    table: IPivotTable;
    /**
     * Fresh root-level data from the base request (no systemWhere).
     * Present when the DataManager always sends a base request
     * alongside drill-down requests.
     */
    baseTable?: IPivotTable;
    metadata: {
        dimensionName?: string;
        parentNodeId?: string;
        level: number;
    };
}

export interface IParsedData {
    rowDimensions: IFlatDimension[];
    columnDimensions: IFlatDimension[];
    measures: IMeasure[];
    layers: ILayer[];
    dataRows: IDataRow[];
    viewFields: Record<string, string>;
    refFields: Record<string, Record<string, any>>;
    hierarchyFields: Record<string, IHierarchyField>;
    orderConfig: IOrderConfig[];
}

export interface ISubtotalConfig {
    dimensionName: string;
    axis: 'row' | 'column';
    hidden: boolean;
    position: 'top' | 'bottom';
}

export interface IPivotState {
    expandedNodes: Record<string, string[]>;
    subtotalConfig: ISubtotalConfig[];
    drillDownCache: Record<string, IPivotTable>;
    hierarchyTrees: Record<string, { metadata: ITreeMetadata; nodes: ITreeNode[] }>;
}

export interface ITableDimensions {
    totalRows: number;
    totalColumns: number;
    headerRows: number;
    headerColumns: number;
    dataRows: number;
    dataColumns: number;
}

export interface IAggregationResult {
    value: number;
    count: number;
}

/**
 * Geometry info for the row-header area in classic (tabular) layout.
 */
export interface IRowHeaderGeometry {
    dimensionDepths: number[];
    cumulativeDepths: number[];
    totalColumns: number;
}

/**
 * Geometry info for the column-header area.
 */
export interface IColumnHeaderGeometry {
    colHeaderRowsOffset: number;
    totalColHeaderRows: number;
    dimensionDepths: number[];
    cumulativeDepths: number[];
    dataRowOffset: number;
}

/**
 * Snapshot of an expanded node, used to preserve drill-down state
 * across parameter changes.
 */
export interface IExpandedNodeSnapshot {
    dimensionName: string;
    nodeId: string;
    level: number;
}

export type OnFilterClickCallback = (field: string) => void;

export type OnDataChangedCallback = (updatedData: IPivotData) => void;
export type OnTableBuildCallback = (table: Map<number, Map<number, ICellWithStyles>>) => void;
export type OnDrillDownCallback = (
    axis: 'row' | 'column',
    dimensionName: string,
    nodeId: string,
    cellCoords?: ObjectIndexes,
) => Promise<void>;
export type OnCellPatchCallback = (rowIndex: number, columnIndex: number, cell: ICellWithStyles) => void;
export type OnLoadingStateChangeCallback = (dimensionName: string, nodeId: string, isLoading: boolean) => void;

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface IDataManager {
    fetchRootData(options?: { signal?: AbortSignal }): Promise<IPivotData>;
    fetchDrillDownData(request: IDrillDownRequest, options?: { signal?: AbortSignal }): Promise<IDrillDownResponse>;
}

export interface ILoadingStateManager {
    isLoading(dimensionName: string, nodeId: string): boolean;
    setLoading(dimensionName: string, nodeId: string, loading: boolean): void;
    onChange(callback: OnLoadingStateChangeCallback): () => void;
    clear(): void;
}

export interface IHierarchyTreeManager {
    getDimensionTree(dimensionName: string): ITree | undefined;
    getMetadata(dimensionName: string): ITreeMetadata | undefined;
    getNode(dimensionName: string, nodeId: string): ITreeNode | undefined;
    ensureNode(
        dimensionName: string,
        nodeId: string,
        parent?: string,
        level?: number,
        hierarchyConfig?: IHierarchyField,
    ): ITreeNode;
    updateTreeNodeLevels(dimensionName: string): void;
    updateTreeDepth(dimensionName: string): void;
    buildPath(dimensionName: string, value: string): string[];
    isExpanded(dimensionName: string, nodeId: string): boolean;
    setExpanded(dimensionName: string, nodeId: string, expanded: boolean): void;
    setDrillDownData(dimensionName: string, nodeId: string, data: IPivotTable): void;
    getDrillDownData(dimensionName: string, nodeId: string): IPivotTable | undefined;
    hasData(dimensionName: string, nodeId: string): boolean;
    markHasData(dimensionName: string, nodeId: string): void;
    clear(dimensionName?: string): void;
    exportState(): Record<string, { metadata: ITreeMetadata; nodes: ITreeNode[] }>;
    importState(state: Record<string, { metadata: ITreeMetadata; nodes: ITreeNode[] }>): void;
}

export interface ISubtotalConfigManager {
    setSubtotalVisibility(dimensionName: string, axis: 'row' | 'column', hidden: boolean): void;
    setSubtotalPosition(dimensionName: string, axis: 'row' | 'column', position: 'top' | 'bottom'): void;
    isSubtotalHidden(dimensionName: string, axis: 'row' | 'column'): boolean;
    getSubtotalPosition(dimensionName: string, axis: 'row' | 'column'): 'top' | 'bottom';
    clear(): void;
    exportState(): ISubtotalConfig[];
    importState(config: ISubtotalConfig[]): void;
}

export interface IDataParser {
    parse(data: IPivotData): IParsedData;
}

export interface IDimensionAnalyzer {
    getRowDimensions(): IFlatDimension[];
    getColumnDimensions(): IFlatDimension[];
    isSpecialDimension(name: string): boolean;
    getRegularDimensions(dimensions: IFlatDimension[]): IFlatDimension[];
    hasValuesInRows(): boolean;
    hasValuesInColumns(): boolean;
    hasLayersInRows(): boolean;
    hasLayersInColumns(): boolean;
}

export interface IViewValueResolver {
    resolveView(dimensionName: string, value: any): any;
}

export interface IAggregationEngine {
    aggregate(values: number[], functionName: string): number;
    accumulateValue(current: IAggregationResult | undefined, value: number, functionName: string): IAggregationResult;
    mergeResults(current: IAggregationResult | undefined, other: IAggregationResult, functionName: string): IAggregationResult;
    finalizeAggregation(result: IAggregationResult, functionName: string): number;
}

export interface ICellFactory {
    setDrillDownCallback(callback: OnDrillDownCallback): void;
    buildCell(
        data: any,
        styles: ICellStyles,
        metadata?: IPivotCellMetadata,
        components?: IButton[],
        readonly?: boolean,
    ): ICellWithStyles;
    buildEmptyCell(): ICellWithStyles;
    buildEmptyHeaderCell(): ICellWithStyles;
    buildCornerCell(rowDimensionLabels: string[]): ICellWithStyles;
    buildLayerHeaderCell(layer: ILayer): ICellWithStyles;
    buildMeasureHeaderCell(measure: IMeasure): ICellWithStyles;
    buildAggregateHeaderCell(aggregate: IAggregate): ICellWithStyles;
    buildGrandTotalHeaderCell(): ICellWithStyles;
    buildMeasureCell(
        value: any,
        measureName: string,
        measureLabel: string,
        layerName: string,
        layerLabel: string,
        aggregateFunction: string,
        aggregateLabel: string,
        rowGroup: IRowGroupItem,
        colGroup: IColumnGroupItem,
        isGrandTotal: boolean,
        format?: CellFormattingType,
    ): ICellWithStyles;
    buildDimensionCell(
        dimensionName: string,
        dimensionLabel: string,
        dimensionIndex: number,
        value: any,
        viewedValue: any,
        hierarchyLevel: number,
        groupDepth: number,
        axis: 'row' | 'column',
        subtotalHidden: boolean,
        isSubtotal: boolean,
        hasChildren: boolean,
        isExpanded: boolean,
        isLoading: boolean,
        parent?: string,
        refData?: any,
        prevDimensionDepths?: number[],
    ): ICellWithStyles;
}

export interface IAxisBuilder {
    buildGroups(dimensions: IFlatDimension[], axis: 'row', dataRows: IDataRow[]): IRowGroupItem[];
    buildGroups(dimensions: IFlatDimension[], axis: 'column', dataRows: IDataRow[]): IColumnGroupItem[];
    buildGroups(
        dimensions: IFlatDimension[],
        axis: 'row' | 'column',
        dataRows: IDataRow[],
    ): IRowGroupItem[] | IColumnGroupItem[];
}

export interface IFilterLegendRenderer {
    setOnFilterClickCallback(callback: OnFilterClickCallback): void;
    setViewResolver(resolver: IViewValueResolver): void;
    build(where?: IPivotFilterGroup | IPivotFilter): Map<number, Map<number, ICellWithStyles>>;
}

export interface IDataMerger {
    mergeData(
        mainData: IPivotTable,
        drillDownData: IDrillDownResponse,
        parentNodeId: string,
        dimensionName: string,
    ): IPivotTable;
    removeData(mainData: IPivotTable, parentNodeId: string, dimensionName: string): IPivotTable;
}

export interface IDrillDownController {
    setOnDataChangedCallback(callback: OnDataChangedCallback): void;
    /**
     * Устанавливает актуальное состояние данных.
     * Должен вызываться из TableOrchestrator при каждом обновлении currentData,
     * чтобы задачи в очереди drillDown использовали актуальный снимок состояния.
     */
    setCurrentData(data: IPivotData): void;
    loadRoot(): Promise<IPivotData>;
    loadRootFromCache?(paramsHash: string): Promise<IPivotData | null>;
    drillDown(
        currentData: IPivotData,
        dimensionName: string,
        nodeId: string,
        dimensionIndex: number,
        rowDimensions: IFlatDimension[],
        columnDimensions: IFlatDimension[],
        axis: 'row' | 'column',
    ): Promise<IPivotData>;
}

export interface IStateSerializer {
    serialize(): IPivotState;
    deserialize(state: IPivotState): void;
}

export interface IIndexedDBStorage {
    init(): Promise<void>;
    setRootData(paramsHash: string, data: IPivotData): Promise<void>;
    getRootData(paramsHash: string): Promise<IPivotData | null>;
    setDrillDownData(paramsHash: string, dimensionName: string, nodeId: string, data: IPivotTable): Promise<void>;
    getDrillDownData(paramsHash: string, dimensionName: string, nodeId: string): Promise<IPivotTable | null>;
    clearAll(): Promise<void>;
    clearByHash(paramsHash: string): Promise<void>;
}

export interface ITableOrchestrator {
    setOnTableBuildCallback(callback: OnTableBuildCallback): void;
    setClassicLayout(enabled: boolean): void;
    getClassicLayout(): boolean;
    /**
     * FIX [P2]: Accept optional classicLayout at build time.
     */
    buildFromRoot(classicLayout?: boolean): Promise<Map<number, Map<number, ICellWithStyles>>>;
    /**
     * FIX [P2]: Accept optional classicLayout at build time.
     */
    build(data: IPivotData, classicLayout?: boolean): Map<number, Map<number, ICellWithStyles>>;
    performDrillDown(
        dimensionName: string,
        nodeId: string,
        dimensionIndex: number,
        axis: 'row' | 'column',
        cellCoords?: ObjectIndexes,
    ): Promise<Map<number, Map<number, ICellWithStyles>>>;
    /**
     * Очистка очереди drillDown запросов.
     */
    rebuildWithNewDataManager(newDataManager: IDataManager): Promise<Map<number, Map<number, ICellWithStyles>>>;
    getTableDimensions(): ITableDimensions;
    getCurrentData(): IPivotData | null;
    getStateSerializer(): IStateSerializer;
    getHierarchyTreeManager(): IHierarchyTreeManager;
    getSubtotalConfigManager(): ISubtotalConfigManager;
    getFilterLegendRenderer(): IFilterLegendRenderer;
    setFilterClickCallback(callback: OnFilterClickCallback): void;
    setOnCellPatchCallback(callback: OnCellPatchCallback): void;
}

// ============================================================================
// BUILD CONTEXT
// ============================================================================

/**
 * Immutable snapshot of everything needed for a single build cycle.
 * Passed to renderers and calculators as a parameter — avoids
 * coupling them to the orchestrator's internal state.
 */
export interface IBuildContext {
    readonly parsedData: IParsedData;
    readonly dimensionAnalyzer: IDimensionAnalyzer;
    readonly viewResolver: IViewValueResolver;
    readonly cellFactory: ICellFactory;
    readonly hierarchyTreeManager: IHierarchyTreeManager;
    readonly subtotalConfigManager: ISubtotalConfigManager;
    readonly loadingStateManager: ILoadingStateManager;
    readonly aggregationEngine: IAggregationEngine;
    readonly filterLegendRenderer: IFilterLegendRenderer;
    readonly classicLayout: boolean;
    readonly currentData: IPivotData;
}

/** Shorthand for the deeply-nested aggregation map. */
export type AggregationDataMap = Map<string, Map<string, Map<string, IAggregationResult>>>;

export interface IAssembleResult {
    table: Map<number, Map<number, ICellWithStyles>>;
    tableDimensions: ITableDimensions;
}

// ============================================================================
// EXTRACTED COMPONENT INTERFACES
// ============================================================================

export interface IGeometryCalculator {
    invalidateCache(): void;
    getRowHeaderColumnCount(ctx: IBuildContext): number;
    getRowHeaderGeometry(ctx: IBuildContext): IRowHeaderGeometry;
    computeColumnHeaderGeometry(colHeaderRowsOffset: number, ctx: IBuildContext): IColumnHeaderGeometry;
    columnToDimensionLevel(
        col: number,
        cumulativeDepths: number[],
        dimensionDepths: number[],
    ): { dimIdx: number; levelInDim: number };
}

export interface IDataMapBuilder {
    build(
        parsedData: IParsedData,
        aggregationEngine: IAggregationEngine,
        hierarchyTreeManager?: IHierarchyTreeManager,
    ): AggregationDataMap;
}

export interface IVisibilityFilter {
    filterVisibleColumns(colGroups: IColumnGroupItem[]): IColumnGroupItem[];
    filterVisibleRows(rowGroups: IRowGroupItem[]): IRowGroupItem[];
}

export interface IHeaderRenderer {
    renderColumnHeaders(
        table: Map<number, Map<number, ICellWithStyles>>,
        geometry: IColumnHeaderGeometry,
        colGroups: IColumnGroupItem[],
        visibleColGroups: IColumnGroupItem[],
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void;

    renderCornerCells(
        table: Map<number, Map<number, ICellWithStyles>>,
        geometry: IColumnHeaderGeometry,
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void;

    renderGrandTotalColumnHeaders(
        table: Map<number, Map<number, ICellWithStyles>>,
        geometry: IColumnHeaderGeometry,
        visibleColGroups: IColumnGroupItem[],
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void;
}

export interface IBodyRenderer {
    renderDataRows(
        table: Map<number, Map<number, ICellWithStyles>>,
        dataRowOffset: number,
        visibleRowGroups: IRowGroupItem[],
        visibleColGroups: IColumnGroupItem[],
        dataMap: AggregationDataMap,
        hasColumnsTotal: boolean,
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void;
    renderGrandTotalRow(
        table: Map<number, Map<number, ICellWithStyles>>,
        grandTotalRowIdx: number,
        visibleRowGroups: IRowGroupItem[],
        visibleColGroups: IColumnGroupItem[],
        dataMap: AggregationDataMap,
        hasColumnsTotal: boolean,
        rowHeaderCols: number,
        ctx: IBuildContext,
    ): void;
}

export interface ITableAssembler {
    assemble(
        rowGroups: IRowGroupItem[],
        colGroups: IColumnGroupItem[],
        dataMap: AggregationDataMap,
        ctx: IBuildContext,
    ): IAssembleResult;
}
