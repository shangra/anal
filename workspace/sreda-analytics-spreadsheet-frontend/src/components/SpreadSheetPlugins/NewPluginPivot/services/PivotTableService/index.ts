import { ICellWithStyles } from '../../../../AdapterSpreadSheet/types';
import SubtotalConfigManager from './aggregation/SubtotalConfigManager';
import TableOrchestrator from './core/TableOrchestrator';
import DataParser from './data/DataParser';
import HierarchyTreeManager from './hierarchy/HierarchyTreeManager';
import LoadingStateManager from './state/LoadingStateManager';
import IndexedDBStorage from './storage/IndexedDBStorage';
import {
    IDataManager,
    IIndexedDBStorage,
    IPivotData,
    IPivotState,
    ITableDimensions,
    ITableOrchestrator,
    OnCellPatchCallback,
    OnFilterClickCallback,
    OnTableBuildCallback,
} from './types';

export default class PivotTableService {
    private orchestrator: ITableOrchestrator;

    private indexedDBStorage?: IIndexedDBStorage;

    constructor(dataManager: IDataManager, useIndexedDB = false) {
        const hierarchyTreeManager = new HierarchyTreeManager();
        const subtotalConfigManager = new SubtotalConfigManager();
        const loadingStateManager = new LoadingStateManager();
        const dataParser = new DataParser();

        let storage: IIndexedDBStorage | undefined;
        if (useIndexedDB) {
            storage = new IndexedDBStorage();
            this.indexedDBStorage = storage;
        }

        this.orchestrator = new TableOrchestrator(
            dataParser,
            hierarchyTreeManager,
            subtotalConfigManager,
            loadingStateManager,
            dataManager,
            storage,
        );
    }

    async initIndexedDB(): Promise<void> {
        if (this.indexedDBStorage) {
            await this.indexedDBStorage.init();
        }
    }

    async clearIndexedDBCache(): Promise<void> {
        if (this.indexedDBStorage) {
            await this.indexedDBStorage.clearAll();
        }
    }

    setOnTableBuildCallback(callback: OnTableBuildCallback): void {
        this.orchestrator.setOnTableBuildCallback(callback);
    }

    async build(classicLayout?: boolean): Promise<Map<number, Map<number, ICellWithStyles>>> {
        if (this.indexedDBStorage) {
            await this.indexedDBStorage.init();
        }
        return this.orchestrator.buildFromRoot(classicLayout);
    }

    buildFromData(data: IPivotData, classicLayout?: boolean): Map<number, Map<number, ICellWithStyles>> {
        return this.orchestrator.build(data, classicLayout);
    }

    async drillDown(
        dimensionName: string,
        nodeId: string,
        dimensionIndex: number,
        axis: 'row' | 'column',
    ): Promise<Map<number, Map<number, ICellWithStyles>>> {
        return this.orchestrator.performDrillDown(dimensionName, nodeId, dimensionIndex, axis);
    }

    async rebuildWithNewParams(dataManager: IDataManager): Promise<Map<number, Map<number, ICellWithStyles>>> {
        return this.orchestrator.rebuildWithNewDataManager(dataManager);
    }

    setSubtotalVisibility(
        dimensionName: string,
        axis: 'row' | 'column',
        hidden: boolean,
    ): Map<number, Map<number, ICellWithStyles>> | null {
        this.orchestrator.getSubtotalConfigManager().setSubtotalVisibility(dimensionName, axis, hidden);
        return this.rebuildIfPossible();
    }

    setSubtotalPosition(
        dimensionName: string,
        axis: 'row' | 'column',
        position: 'top' | 'bottom',
    ): Map<number, Map<number, ICellWithStyles>> | null {
        this.orchestrator.getSubtotalConfigManager().setSubtotalPosition(dimensionName, axis, position);
        return this.rebuildIfPossible();
    }

    setClassicLayout(enabled: boolean): Map<number, Map<number, ICellWithStyles>> | null {
        this.orchestrator.setClassicLayout(enabled);
        return this.rebuildIfPossible();
    }

    getClassicLayout(): boolean {
        return this.orchestrator.getClassicLayout();
    }

    rebuild(): Map<number, Map<number, ICellWithStyles>> {
        const currentData = this.orchestrator.getCurrentData();
        if (!currentData) {
            throw new Error('Нет данных для перестройки. Сначала вызовите build() или buildFromData().');
        }
        return this.orchestrator.build(currentData);
    }

    private rebuildIfPossible(): Map<number, Map<number, ICellWithStyles>> | null {
        const currentData = this.orchestrator.getCurrentData();
        if (!currentData) return null;
        return this.orchestrator.build(currentData);
    }

    getTableDimensions(): ITableDimensions {
        return this.orchestrator.getTableDimensions();
    }

    toPlainObject(table: Map<number, Map<number, ICellWithStyles>>): Record<number, Record<number, ICellWithStyles>> {
        const result: Record<number, Record<number, ICellWithStyles>> = {};

        for (const [rowIndex, row] of table) {
            result[rowIndex] = {};
            for (const [colIndex, cell] of row) {
                result[rowIndex][colIndex] = cell;
            }
        }

        return result;
    }

    exportState(): IPivotState {
        return this.orchestrator.getStateSerializer().serialize();
    }

    importState(state: IPivotState): void {
        this.orchestrator.getStateSerializer().deserialize(state);
    }

    importStateFromJSON(json: string): void {
        try {
            const state = JSON.parse(json) as IPivotState;
            this.importState(state);
        } catch (e) {
            throw new Error(`Ошибка разбора JSON состояния таблицы: ${(e as Error).message}`);
        }
    }

    isNodeExpanded(dimensionName: string, nodeId: string): boolean {
        return this.orchestrator.getHierarchyTreeManager().isExpanded(dimensionName, nodeId);
    }

    setOnFilterClickCallback(callback: OnFilterClickCallback): void {
        this.orchestrator.setFilterClickCallback(callback);
    }

    setOnCellPatchCallback(callback: OnCellPatchCallback): void {
        this.orchestrator.setOnCellPatchCallback(callback);
    }
}
