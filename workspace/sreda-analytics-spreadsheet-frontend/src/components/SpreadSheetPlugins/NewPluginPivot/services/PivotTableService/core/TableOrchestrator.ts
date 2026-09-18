import { ICellWithStyles, ObjectIndexes } from '../../../../../AdapterSpreadSheet/types';
import AggregationEngine from '../aggregation/AggregationEngine';
import ViewValueResolver from '../aggregation/ViewValueResolver';
import AxisBuilder from '../axis/AxisBuilder';
import DimensionAnalyzer from '../axis/DimensionAnalyzer';
import VisibilityFilter from '../axis/VisibilityFilter';
import DataMapBuilder from '../data/DataMapBuilder';
import DataMerger from '../data/DataMerger';
import DrillDownController from '../hierarchy/DrillDownController';
import BodyRenderer from '../rendering/BodyRenderer';
import CellFactory from '../rendering/CellFactory';
import FilterLegendRenderer from '../rendering/FilterLegendRenderer';
import GeometryCalculator from '../rendering/GeometryCalculator';
import HeaderRenderer from '../rendering/HeaderRenderer';
import StateSerializer from '../state/StateSerializer';
import {
    IAxisBuilder,
    IBuildContext,
    IColumnGroupItem,
    IDataManager,
    IDataParser,
    IDimensionAnalyzer,
    IDrillDownController,
    IExpandedNodeSnapshot,
    IFilterLegendRenderer,
    IHierarchyTreeManager,
    IIndexedDBStorage,
    ILoadingStateManager,
    IParsedData,
    IPivotData,
    IRowGroupItem,
    IStateSerializer,
    ISubtotalConfigManager,
    ITableDimensions,
    ITableOrchestrator,
    IViewValueResolver,
    OnCellPatchCallback,
    OnFilterClickCallback,
    OnTableBuildCallback,
} from '../types';
import TableAssembler from './TableAssembler';

export default class TableOrchestrator implements ITableOrchestrator {
    // ── Stable managers (live across builds) ──────────────────────────
    private hierarchyTreeManager: IHierarchyTreeManager;

    private subtotalConfigManager: ISubtotalConfigManager;

    private loadingStateManager: ILoadingStateManager;

    // ── Pipeline components (stateless / cacheable) ──────────────────
    private geometryCalculator = new GeometryCalculator();

    private dataMapBuilder = new DataMapBuilder();

    private visibilityFilter = new VisibilityFilter();

    private headerRenderer = new HeaderRenderer(this.geometryCalculator);

    private bodyRenderer = new BodyRenderer(this.geometryCalculator);

    private tableAssembler = new TableAssembler(
        this.geometryCalculator,
        this.visibilityFilter,
        this.headerRenderer,
        this.bodyRenderer,
    );

    // ── Per-build state ──────────────────────────────────────────────
    private parsedData!: IParsedData;

    private dimensionAnalyzer!: IDimensionAnalyzer;

    private viewResolver!: IViewValueResolver;

    private axisBuilder!: IAxisBuilder;

    private filterLegendRenderer: IFilterLegendRenderer;

    private aggregationEngine = new AggregationEngine();

    // ── Drill-down ───────────────────────────────────────────────────
    private drillDownController?: IDrillDownController;

    private stateSerializer: IStateSerializer;

    // ── Mutable external state ───────────────────────────────────────
    private currentData: IPivotData | null = null;

    private tableDimensions: ITableDimensions | null = null;

    private onTableRebuildCallback?: OnTableBuildCallback;

    private filterClickCallback?: OnFilterClickCallback;

    private onCellPatchCallback?: OnCellPatchCallback;

    // ── Last built table (for patching) ─────────────────────────────
    private classicLayout = false;

    private dataManager: IDataManager;

    private indexedDBStorage?: IIndexedDBStorage;

    constructor(
        private dataParser: IDataParser,
        hierarchyTreeManager: IHierarchyTreeManager,
        subtotalConfigManager: ISubtotalConfigManager,
        loadingStateManager: ILoadingStateManager,
        dataManager: IDataManager,
        indexedDBStorage?: IIndexedDBStorage,
    ) {
        this.hierarchyTreeManager = hierarchyTreeManager;
        this.subtotalConfigManager = subtotalConfigManager;
        this.loadingStateManager = loadingStateManager;
        this.dataManager = dataManager;
        this.indexedDBStorage = indexedDBStorage;
        this.filterLegendRenderer = new FilterLegendRenderer();
        this.stateSerializer = new StateSerializer(this.hierarchyTreeManager, this.subtotalConfigManager);
    }

    // ════════════════════════════════════════════════════════════════════
    //  Public API — configuration
    // ════════════════════════════════════════════════════════════════════

    setOnTableBuildCallback(callback: OnTableBuildCallback): void {
        this.onTableRebuildCallback = callback;
    }

    setFilterClickCallback(callback: OnFilterClickCallback): void {
        this.filterClickCallback = callback;
        this.filterLegendRenderer.setOnFilterClickCallback(callback);
    }

    setOnCellPatchCallback(callback: OnCellPatchCallback): void {
        this.onCellPatchCallback = callback;
    }

    setClassicLayout(enabled: boolean): void {
        this.classicLayout = enabled;
    }

    getClassicLayout(): boolean {
        return this.classicLayout;
    }

    getStateSerializer(): IStateSerializer {
        return this.stateSerializer;
    }

    getHierarchyTreeManager(): IHierarchyTreeManager {
        return this.hierarchyTreeManager;
    }

    getSubtotalConfigManager(): ISubtotalConfigManager {
        return this.subtotalConfigManager;
    }

    getFilterLegendRenderer(): IFilterLegendRenderer {
        return this.filterLegendRenderer;
    }

    getTableDimensions(): ITableDimensions {
        if (!this.tableDimensions) throw new Error('Table must be built first');
        return this.tableDimensions;
    }

    getCurrentData(): IPivotData | null {
        return this.currentData;
    }

    // ════════════════════════════════════════════════════════════════════
    //  Public API — build
    // ════════════════════════════════════════════════════════════════════

    async buildFromRoot(classicLayout?: boolean): Promise<Map<number, Map<number, ICellWithStyles>>> {
        if (classicLayout !== undefined) this.classicLayout = classicLayout;

        const controller = this.getOrCreateDrillDownController();
        const rootData = await controller.loadRoot();
        this.currentData = rootData;

        return this.build(rootData);
    }

    build(data: IPivotData, classicLayout?: boolean): Map<number, Map<number, ICellWithStyles>> {
        if (classicLayout !== undefined) this.classicLayout = classicLayout;

        // 1. Invalidate per-build caches
        this.geometryCalculator.invalidateCache();

        // 2. Initialize context dependencies
        this.initialize(data);

        // 3. Build axes
        const rowGroups = this.buildRowGroups();
        const colGroups = this.buildColumnGroups();

        // 4. Build aggregation map — pass hierarchyTreeManager for shadow-map exclusion
        const dataMap = this.dataMapBuilder.build(this.parsedData, this.aggregationEngine, this.hierarchyTreeManager);

        // 5. Create build context
        const ctx = this.createBuildContext();

        // 6. Assemble table
        const { table, tableDimensions } = this.tableAssembler.assemble(rowGroups, colGroups, dataMap, ctx);

        this.tableDimensions = tableDimensions;

        this.onTableRebuildCallback?.(table);

        return table;
    }

    // ════════════════════════════════════════════════════════════════════
    //  Public API — drill-down
    // ════════════════════════════════════════════════════════════════════

    async performDrillDown(
        dimensionName: string,
        nodeId: string,
        dimensionIndex: number,
        axis: 'row' | 'column',
        cellCoords?: ObjectIndexes,
    ): Promise<Map<number, Map<number, ICellWithStyles>>> {
        if (!this.currentData) throw new Error('Table must be built first');

        const isExpandedNow = this.hierarchyTreeManager.isExpanded(dimensionName, nodeId);

        const rowDimensions = this.dimensionAnalyzer.getRegularDimensions(this.dimensionAnalyzer.getRowDimensions());
        const columnDimensions = this.dimensionAnalyzer.getRegularDimensions(this.dimensionAnalyzer.getColumnDimensions());

        this.loadingStateManager.setLoading(dimensionName, nodeId, true);
        try {
            // Показываем loadingCell ДО начала запроса (только для expand)
            if (!isExpandedNow && cellCoords && this.onCellPatchCallback) {
                const loadingCell = this.buildLoadingCell(dimensionName, nodeId, axis);
                if (loadingCell) {
                    this.onCellPatchCallback(cellCoords.rowIndex, cellCoords.columnIndex, loadingCell);
                }
            }

            this.currentData = await this.getOrCreateDrillDownController().drillDown(
                this.currentData,
                dimensionName,
                nodeId,
                dimensionIndex,
                rowDimensions,
                columnDimensions,
                axis,
            );
        } finally {
            this.loadingStateManager.setLoading(dimensionName, nodeId, false);
        }

        return this.build(this.currentData);
    }

    async rebuildWithNewDataManager(newDataManager: IDataManager): Promise<Map<number, Map<number, ICellWithStyles>>> {
        // 1. Snapshot
        const expandedNodes = this.collectExpandedNodes();

        // 2. Replace manager
        this.dataManager = newDataManager;
        this.drillDownController = undefined;
        this.hierarchyTreeManager.clear();

        // 3. Fetch root
        const controller = this.getOrCreateDrillDownController();
        const rootData = await controller.loadRoot();
        this.currentData = rootData;

        // 4. Bootstrap tree
        this.initialize(rootData);
        this.buildRowGroups();
        this.buildColumnGroups();

        // 5. Re-expand
        if (expandedNodes.length > 0) {
            await this.reExpandNodes(expandedNodes, controller);
        }

        // 6. Final build
        return this.build(this.currentData!);
    }

    // ════════════════════════════════════════════════════════════════════
    //  Initialization
    // ════════════════════════════════════════════════════════════════════

    private initialize(data: IPivotData): void {
        this.currentData = data;
        this.parsedData = this.dataParser.parse(data);
        this.dimensionAnalyzer = new DimensionAnalyzer(this.parsedData);

        this.viewResolver = new ViewValueResolver(
            this.dimensionAnalyzer,
            this.parsedData.measures,
            this.parsedData.layers,
            this.parsedData.viewFields,
            this.parsedData.refFields,
        );

        this.filterLegendRenderer.setViewResolver(this.viewResolver);
        if (this.filterClickCallback) {
            this.filterLegendRenderer.setOnFilterClickCallback(this.filterClickCallback);
        }

        const cellFactory = new CellFactory(this.viewResolver);
        cellFactory.setDrillDownCallback(async (axis, dimensionName, nodeId, cellCoords) => {
            const dims =
                axis === 'row' ? this.dimensionAnalyzer.getRowDimensions() : this.dimensionAnalyzer.getColumnDimensions();
            const regularDims = this.dimensionAnalyzer.getRegularDimensions(dims);
            const dimIndex = regularDims.findIndex((d) => d.dimension.name === dimensionName);
            await this.performDrillDown(dimensionName, nodeId, dimIndex, axis, cellCoords);
        });

        // Store cellFactory in parsedData-adjacent state so context can reference it
        this._cellFactory = cellFactory;

        this.axisBuilder = new AxisBuilder(this.hierarchyTreeManager, this.subtotalConfigManager, this.parsedData);
    }

    /** Transient cell factory for the current build cycle. */
    private _cellFactory!: CellFactory;

    /**
     * Build a single dimension cell in loading state, using the last build's
     * context (parsedData, viewResolver, hierarchyTreeManager).
     */
    private buildLoadingCell(dimensionName: string, nodeId: string, axis: 'row' | 'column'): ICellWithStyles | null {
        if (!this._cellFactory || !this.parsedData || !this.viewResolver) return null;

        const dims = axis === 'row' ? this.parsedData.rowDimensions : this.parsedData.columnDimensions;
        const flatDim = dims.find((d) => d.dimension.name === dimensionName);
        if (!flatDim) return null;

        const node = this.hierarchyTreeManager.getNode(dimensionName, nodeId);
        const viewedValue = this.viewResolver.resolveView(dimensionName, nodeId);
        const refData = this.parsedData.refFields[dimensionName]?.[nodeId];

        return this._cellFactory.buildDimensionCell(
            dimensionName,
            flatDim.dimension.label,
            flatDim.index,
            nodeId,
            viewedValue,
            node?.level ?? 0,
            flatDim.index,
            axis,
            false,
            false,
            node?.hasChildren ?? true,
            node?.isExpanded ?? false,
            true, // isLoading
            node?.parent,
            refData,
        );
    }

    private createBuildContext(): IBuildContext {
        return {
            parsedData: this.parsedData,
            dimensionAnalyzer: this.dimensionAnalyzer,
            viewResolver: this.viewResolver,
            cellFactory: this._cellFactory,
            hierarchyTreeManager: this.hierarchyTreeManager,
            subtotalConfigManager: this.subtotalConfigManager,
            loadingStateManager: this.loadingStateManager,
            aggregationEngine: this.aggregationEngine,
            filterLegendRenderer: this.filterLegendRenderer,
            classicLayout: this.classicLayout,
            currentData: this.currentData!,
        };
    }

    // ════════════════════════════════════════════════════════════════════
    //  Axis builders (thin delegation)
    // ════════════════════════════════════════════════════════════════════

    private buildRowGroups(): IRowGroupItem[] {
        return this.axisBuilder.buildGroups(this.dimensionAnalyzer.getRowDimensions(), 'row', this.parsedData.dataRows);
    }

    private buildColumnGroups(): IColumnGroupItem[] {
        return this.axisBuilder.buildGroups(this.dimensionAnalyzer.getColumnDimensions(), 'column', this.parsedData.dataRows);
    }

    // ════════════════════════════════════════════════════════════════════
    //  Drill-down controller
    // ════════════════════════════════════════════════════════════════════

    private getOrCreateDrillDownController(): IDrillDownController {
        if (!this.drillDownController) {
            const dataMerger = new DataMerger();
            this.drillDownController = new DrillDownController(
                this.dataManager,
                this.hierarchyTreeManager,
                dataMerger,
                this.indexedDBStorage,
            );
            this.drillDownController.setOnDataChangedCallback((updatedData) => {
                this.currentData = updatedData;
            });
        }
        return this.drillDownController;
    }

    // ════════════════════════════════════════════════════════════════════
    //  Drill-down state preservation
    // ════════════════════════════════════════════════════════════════════

    private collectExpandedNodes(): IExpandedNodeSnapshot[] {
        const result: IExpandedNodeSnapshot[] = [];
        const trees = this.hierarchyTreeManager.exportState();

        for (const [dimName, { nodes }] of Object.entries(trees)) {
            for (const node of nodes) {
                if (node.isExpanded) {
                    result.push({
                        dimensionName: dimName,
                        nodeId: node.id,
                        level: node.level,
                    });
                }
            }
        }

        return result.sort((a, b) => a.level - b.level);
    }

    private async reExpandNodes(expandedNodes: IExpandedNodeSnapshot[], controller: IDrillDownController): Promise<void> {
        const rowDimNames = new Set(this.parsedData.rowDimensions.map((d) => d.dimension.name));
        const colDimNames = new Set(this.parsedData.columnDimensions.map((d) => d.dimension.name));

        const rowDimensions = this.dimensionAnalyzer.getRegularDimensions(this.dimensionAnalyzer.getRowDimensions());
        const columnDimensions = this.dimensionAnalyzer.getRegularDimensions(this.dimensionAnalyzer.getColumnDimensions());

        for (const snapshot of expandedNodes) {
            const { dimensionName, nodeId } = snapshot;

            if (!rowDimNames.has(dimensionName) && !colDimNames.has(dimensionName)) {
                continue;
            }

            const node = this.hierarchyTreeManager.getNode(dimensionName, nodeId);
            if (!node) continue;

            const axis = rowDimNames.has(dimensionName) ? 'row' : 'column';

            this.loadingStateManager.setLoading(dimensionName, nodeId, true);
            try {
                // eslint-disable-next-line no-await-in-loop
                const updatedData = await controller.drillDown(
                    this.currentData!,
                    dimensionName,
                    nodeId,
                    0,
                    rowDimensions,
                    columnDimensions,
                    axis,
                );

                this.currentData = updatedData;
                this.refreshParsedState();
            } catch (e) {
                console.warn(`[TableOrchestrator] Failed to re-expand "${nodeId}" in "${dimensionName}":`, e);
            } finally {
                this.loadingStateManager.setLoading(dimensionName, nodeId, false);
            }
        }
    }

    private refreshParsedState(): void {
        if (!this.currentData) return;

        this.parsedData = this.dataParser.parse(this.currentData);
        this.dimensionAnalyzer = new DimensionAnalyzer(this.parsedData);

        this.axisBuilder = new AxisBuilder(this.hierarchyTreeManager, this.subtotalConfigManager, this.parsedData);

        this.axisBuilder.buildGroups(this.parsedData.rowDimensions, 'row', this.parsedData.dataRows);
        this.axisBuilder.buildGroups(this.parsedData.columnDimensions, 'column', this.parsedData.dataRows);
    }
}
