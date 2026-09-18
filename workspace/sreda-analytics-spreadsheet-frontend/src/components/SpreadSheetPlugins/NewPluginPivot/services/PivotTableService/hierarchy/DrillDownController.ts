import PQueue from 'p-queue';

import IndexedDBStorage from '../storage/IndexedDBStorage';
import {
    IDataManager,
    IDataMerger,
    IDrillDownController,
    IDrillDownFilter,
    IDrillDownRequest,
    IDrillDownResponse,
    IFlatDimension,
    IHierarchyTreeManager,
    IIndexedDBStorage,
    IPivotData,
    IPivotTable,
    OnDataChangedCallback,
} from '../types';

export default class DrillDownController implements IDrillDownController {
    private onDataChangedCallback?: OnDataChangedCallback;

    private paramsHash: string = '';

    /**
     * Актуальное состояние данных, обновляется после каждого drillDown.
     * Используется внутри mergeQueue вместо захваченного аргумента currentData,
     * чтобы гарантировать корректное слияние при параллельных вызовах.
     */
    private latestData: IPivotData | null = null;

    /**
     * Очередь для сетевых запросов — параллельное выполнение.
     * Запросы для разных узлов идут одновременно.
     */
    private fetchQueue = new PQueue({ concurrency: Infinity });

    /**
     * Очередь для слияния данных — строго последовательно (concurrency: 1).
     * Гарантирует, что каждое слияние видит результат предыдущего.
     */
    private mergeQueue = new PQueue({ concurrency: 1 });

    constructor(
        private dataManager: IDataManager,
        private hierarchyTreeManager: IHierarchyTreeManager,
        private dataMerger: IDataMerger,
        private indexedDBStorage?: IIndexedDBStorage,
    ) {}

    setOnDataChangedCallback(callback: OnDataChangedCallback): void {
        this.onDataChangedCallback = callback;
    }

    /**
     * Устанавливает актуальное состояние данных.
     * Вызывается из TableOrchestrator при инициализации и после каждого build.
     */
    setCurrentData(data: IPivotData): void {
        this.latestData = data;
    }

    async loadRoot(options?: { signal?: AbortSignal }): Promise<IPivotData> {
        const data = await this.dataManager.fetchRootData(options);

        if (this.indexedDBStorage) {
            this.paramsHash = IndexedDBStorage.computeParamsHash(data.params);
            try {
                await this.indexedDBStorage.setRootData(this.paramsHash, data);
            } catch (e) {
                console.warn('[DrillDownController] Ошибка сохранения данных в IndexedDB:', e);
            }
        }

        return data;
    }

    async loadRootFromCache(paramsHash: string): Promise<IPivotData | null> {
        if (!this.indexedDBStorage) return null;

        try {
            return await this.indexedDBStorage.getRootData(paramsHash);
        } catch (e) {
            console.warn('[DrillDownController] Ошибка получения данных из IndexedDB:', e);
            return null;
        }
    }

    /**
     * Collects active DrillDown filters.
     *
     * 1. TARGET dimension: only the node being drilled.
     * 2. CROSS-AXIS dimensions: only actually EXPANDED nodes.
     */
    private collectActiveFilters(
        rowDimensions: IFlatDimension[],
        columnDimensions: IFlatDimension[],
        currentDimensionName: string,
        currentNodeId: string,
        currentAxis: 'row' | 'column',
    ): IDrillDownFilter[] {
        const filters: IDrillDownFilter[] = [];

        const otherAxisDims = currentAxis === 'row' ? columnDimensions : rowDimensions;

        // ── 1. Target dimension: ONLY the node being drilled ──────────────
        {
            const node = this.hierarchyTreeManager.getNode(currentDimensionName, currentNodeId);
            if (node) {
                filters.push({
                    dimensionName: currentDimensionName,
                    value: currentNodeId,
                    level: node.level,
                });
            }
        }

        // ── 2. Cross-axis: ONLY expanded nodes ───────────────────────────
        for (const flatDim of otherAxisDims) {
            const dimName = flatDim.dimension.name;
            const tree = this.hierarchyTreeManager.getDimensionTree(dimName);
            if (!tree) continue;

            for (const [, node] of tree.nodes) {
                if (!node.isExpanded) continue;

                filters.push({
                    dimensionName: dimName,
                    value: node.id,
                    level: node.level,
                });
            }
        }

        // ── 3. Deduplication and sorting ──────────────────────────────────
        const seen = new Map<string, IDrillDownFilter>();
        for (const f of filters) {
            const key = `${f.dimensionName}::${f.value}::${f.level}`;
            seen.set(key, f);
        }

        return Array.from(seen.values()).sort((a, b) => {
            if (a.dimensionName !== b.dimensionName) {
                return a.dimensionName.localeCompare(b.dimensionName);
            }
            return a.level - b.level;
        });
    }

    /**
     * Refreshes root-level rows in `currentData` using the base table
     * from the drill-down response.
     */
    private refreshRootData(currentData: IPivotData, baseTable: IPivotTable): IPivotData {
        const drillRows = currentData.table.rows.filter((r) => r.__drill_parent__ != null);

        return {
            ...currentData,
            table: {
                ...currentData.table,
                rows: [...baseTable.rows, ...drillRows],
                refFields: { ...baseTable.refFields, ...currentData.table.refFields },
                hierarchyFields: { ...currentData.table.hierarchyFields, ...baseTable.hierarchyFields },
                viewField: { ...currentData.table.viewField, ...baseTable.viewField },
                order: baseTable.order.length > 0 ? baseTable.order : currentData.table.order,
            },
        };
    }

    async drillDown(
        currentData: IPivotData,
        dimensionName: string,
        nodeId: string,
        dimensionIndex: number,
        rowDimensions: IFlatDimension[],
        columnDimensions: IFlatDimension[],
        axis: 'row' | 'column',
    ): Promise<IPivotData> {
        // Синхронно обновляем latestData при первом вызове (если ещё не установлен)
        if (!this.latestData) {
            this.latestData = currentData;
        }

        // ── Collapse: не требует сетевого запроса — сразу в mergeQueue ────────
        const isExpandedNow = this.hierarchyTreeManager.isExpanded(dimensionName, nodeId);
        if (isExpandedNow) {
            return this.mergeQueue.add(async () => {
                const baseData = this.latestData ?? currentData;

                this.hierarchyTreeManager.setExpanded(dimensionName, nodeId, false);
                const updatedTable = this.dataMerger.removeData(baseData.table, nodeId, dimensionName);

                const updatedData: IPivotData = { ...baseData, table: updatedTable };
                this.latestData = updatedData;
                this.onDataChangedCallback?.(updatedData);
                return updatedData;
            }) as Promise<IPivotData>;
        }

        // ── Expand: кэш в памяти — тоже без сетевого запроса ─────────────────
        const hasDataInMemory = this.hierarchyTreeManager.hasData(dimensionName, nodeId);
        if (hasDataInMemory) {
            return this.mergeQueue.add(async () => {
                const baseData = this.latestData ?? currentData;

                const cachedData = this.hierarchyTreeManager.getDrillDownData(dimensionName, nodeId);
                let updatedTable: IPivotTable;

                if (cachedData) {
                    const node = this.hierarchyTreeManager.getNode(dimensionName, nodeId);
                    const response: IDrillDownResponse = {
                        table: cachedData,
                        metadata: {
                            dimensionName,
                            parentNodeId: nodeId,
                            level: (node?.level ?? 0) + 1,
                        },
                    };
                    updatedTable = this.dataMerger.mergeData(baseData.table, response, nodeId, dimensionName);
                } else {
                    updatedTable = baseData.table;
                }

                this.hierarchyTreeManager.setExpanded(dimensionName, nodeId, true);

                const updatedData: IPivotData = { ...baseData, table: updatedTable };
                this.latestData = updatedData;
                this.onDataChangedCallback?.(updatedData);
                return updatedData;
            }) as Promise<IPivotData>;
        }

        // ── Expand: нет кэша в памяти — нужен сетевой запрос ─────────────────
        // Фаза 1: параллельный fetch (вне mergeQueue)
        const node = this.hierarchyTreeManager.getNode(dimensionName, nodeId);
        if (!node) {
            throw new Error(`Узел "${nodeId}" не найден в измерении "${dimensionName}"`);
        }

        // Собираем фильтры ДО запроса на основе текущего состояния дерева.
        // При параллельных вызовах каждый запрос видит дерево без учёта
        // ещё не завершившихся параллельных expand — это корректно,
        // т.к. cross-axis фильтры читают isExpanded, а setExpanded(true)
        // происходит в mergeQueue уже после получения ответа.
        const activeFilters = this.collectActiveFilters(rowDimensions, columnDimensions, dimensionName, nodeId, axis);

        const fetchPromise = this.fetchQueue.add(async () => {
            // Сначала пробуем IndexedDB-кэш
            if (this.indexedDBStorage && this.paramsHash) {
                try {
                    const cachedDrillData = await this.indexedDBStorage.getDrillDownData(
                        this.paramsHash,
                        dimensionName,
                        nodeId,
                    );
                    if (cachedDrillData) {
                        return { type: 'cached' as const, data: cachedDrillData, node };
                    }
                } catch (e) {
                    console.warn('[DrillDownController] Failed to read drill cache from IndexedDB:', e);
                }
            }

            // Сетевой запрос
            const request: IDrillDownRequest = {
                dimensionName,
                nodeId,
                parentNodeId: nodeId,
                level: node.level + 1,
                activeFilters,
            };

            const response = await this.dataManager.fetchDrillDownData(request);
            return { type: 'fetched' as const, response, node };
        });

        // Фаза 2: последовательное слияние (в mergeQueue)
        return this.mergeQueue.add(async () => {
            const fetchResult = await fetchPromise;
            const baseData = this.latestData ?? currentData;
            let effectiveData = baseData;
            let updatedTable: IPivotTable;

            if (fetchResult!.type === 'cached') {
                const { data: cachedDrillData } = fetchResult!;

                this.hierarchyTreeManager.setDrillDownData(dimensionName, nodeId, cachedDrillData);
                this.hierarchyTreeManager.markHasData(dimensionName, nodeId);

                const response: IDrillDownResponse = {
                    table: cachedDrillData,
                    metadata: {
                        dimensionName,
                        parentNodeId: nodeId,
                        level: fetchResult!.node.level + 1,
                    },
                };
                updatedTable = this.dataMerger.mergeData(effectiveData.table, response, nodeId, dimensionName);
            } else {
                const { response } = fetchResult!;

                if (response.baseTable) {
                    // Обновляем effectiveData на основе актуального latestData —
                    // чтобы не потерять данные параллельных drillDown,
                    // завершившихся пока шёл этот запрос.
                    effectiveData = this.refreshRootData(this.latestData ?? baseData, response.baseTable);
                }

                this.hierarchyTreeManager.setDrillDownData(dimensionName, nodeId, response.table);
                this.hierarchyTreeManager.markHasData(dimensionName, nodeId);

                if (this.indexedDBStorage && this.paramsHash) {
                    try {
                        await this.indexedDBStorage.setDrillDownData(this.paramsHash, dimensionName, nodeId, response.table);
                    } catch (e) {
                        console.warn('[DrillDownController] Ошибка сохранения данных в IndexedDB:', e);
                    }
                }

                updatedTable = this.dataMerger.mergeData(effectiveData.table, response, nodeId, dimensionName);
            }

            this.hierarchyTreeManager.setExpanded(dimensionName, nodeId, true);

            const updatedData: IPivotData = { ...effectiveData, table: updatedTable };
            this.latestData = updatedData;
            this.onDataChangedCallback?.(updatedData);

            return updatedData;
        }) as Promise<IPivotData>;
    }
}
