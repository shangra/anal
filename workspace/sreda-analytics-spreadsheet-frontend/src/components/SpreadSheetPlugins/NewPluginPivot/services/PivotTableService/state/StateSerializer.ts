import { IHierarchyTreeManager, IPivotState, IPivotTable, IStateSerializer, ISubtotalConfigManager } from '../types';

export default class StateSerializer implements IStateSerializer {
    constructor(private hierarchyTreeManager: IHierarchyTreeManager, private subtotalConfigManager: ISubtotalConfigManager) {}

    serialize(): IPivotState {
        const hierarchyTrees = this.hierarchyTreeManager.exportState();
        const expandedNodes: Record<string, string[]> = {};

        for (const [dimName, { nodes }] of Object.entries(hierarchyTrees)) {
            expandedNodes[dimName] = nodes.filter((n) => n.isExpanded).map((n) => n.id);
        }

        const drillDownCache: Record<string, IPivotTable> = {};
        for (const [dimName, { nodes }] of Object.entries(hierarchyTrees)) {
            for (const node of nodes) {
                if (node.data) {
                    const cacheKey = this.encodeCacheKey(dimName, node.id);
                    drillDownCache[cacheKey] = node.data;
                }
            }
        }

        return {
            expandedNodes,
            subtotalConfig: this.subtotalConfigManager.exportState(),
            drillDownCache,
            hierarchyTrees,
        };
    }

    deserialize(state: IPivotState): void {
        this.hierarchyTreeManager.importState(state.hierarchyTrees);
        this.subtotalConfigManager.importState(state.subtotalConfig);

        for (const [cacheKey, table] of Object.entries(state.drillDownCache)) {
            const decoded = this.decodeCacheKey(cacheKey);
            if (!decoded) continue;

            const { dimName, nodeId } = decoded;
            this.hierarchyTreeManager.setDrillDownData(dimName, nodeId, table);
        }
    }

    /**
     * Кодирует пару (dimName, nodeId) в строку-ключ кэша.
     * Использует разделение по ПЕРВОМУ вхождению ':->:' для совместимости
     * со старыми состояниями, но для новых ключей применяет безопасное
     * JSON-кодирование через btoa.
     */
    private encodeCacheKey(dimName: string, nodeId: string): string {
        try {
            const jsonStr = JSON.stringify([dimName, nodeId]);
            // Safe for any Unicode content:
            const bytes = new TextEncoder().encode(jsonStr);
            const binaryStr = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
            return `v2:${btoa(binaryStr)}`;
        } catch {
            // Ultimate fallback.
            return `${dimName}:->:${nodeId}`;
        }
    }

    private decodeCacheKey(key: string): { dimName: string; nodeId: string } | null {
        if (key.startsWith('v2:')) {
            try {
                const binaryStr = atob(key.slice(3));
                const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
                const jsonStr = new TextDecoder().decode(bytes);
                const [dimName, nodeId] = JSON.parse(jsonStr) as [string, string];
                return { dimName, nodeId };
            } catch {
                return null;
            }
        }

        // Old format — split by FIRST occurrence.
        const separatorIdx = key.indexOf(':->:');
        if (separatorIdx === -1) return null;

        const dimName = key.slice(0, separatorIdx);
        const nodeId = key.slice(separatorIdx + ':->:'.length);

        if (!dimName || !nodeId) return null;

        return { dimName, nodeId };
    }
}
