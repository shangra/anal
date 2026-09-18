import { FlatTreeNode } from 'ui-kit';
import { TreeMap } from 'components/MetadataHier/types';
import { buildFlatFromMap } from 'components/MetadataHier/lib/flatAdapter';

export class TreeDataCache {
    private cachedTreeData: FlatTreeNode[] | null = null;

    private lastRootId: string | null = null;

    private lastVersion: number = -1;

    private shouldRecompute(rootId: string | null, version: number): boolean {
        return rootId !== this.lastRootId || version !== this.lastVersion;
    }

    public getTreeData(
        rootId: string | null,
        nodes: TreeMap,
        expandedIds: Set<string>,
        selectedIds: Set<string>,
        version: number,
        server: string,
    ): FlatTreeNode[] {
        if (!rootId) {
            this.cachedTreeData = [];
            this.lastRootId = null;
            this.lastVersion = -1;
            return [];
        }

        if (this.shouldRecompute(rootId, version) || this.cachedTreeData === null) {
            this.cachedTreeData = buildFlatFromMap(rootId, nodes, expandedIds, selectedIds, server);
            this.lastRootId = rootId;
            this.lastVersion = version;
        }

        return this.cachedTreeData;
    }

    public reset(): void {
        this.cachedTreeData = null;
        this.lastRootId = null;
        this.lastVersion = -1;
    }
}
