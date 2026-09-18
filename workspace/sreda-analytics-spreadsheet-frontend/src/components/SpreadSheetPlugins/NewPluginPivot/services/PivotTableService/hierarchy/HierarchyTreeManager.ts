import { IHierarchyField, IHierarchyTreeManager, IPivotTable, ITree, ITreeMetadata, ITreeNode } from '../types';

export default class HierarchyTreeManager implements IHierarchyTreeManager {
    private trees = new Map<string, ITree>();

    getDimensionTree(dimensionName: string): ITree | undefined {
        return this.trees.get(dimensionName);
    }

    getMetadata(dimensionName: string): ITreeMetadata | undefined {
        return this.getDimensionTree(dimensionName)?.metadata;
    }

    getNode(dimensionName: string, nodeId: string): ITreeNode | undefined {
        return this.getDimensionTree(dimensionName)?.nodes?.get(nodeId);
    }

    ensureNode(
        dimensionName: string,
        nodeId: string,
        parent?: string,
        // eslint-disable-next-line default-param-last
        level: number = 0,
        hierarchyConfig?: IHierarchyField,
    ): ITreeNode {
        let node = this.getNode(dimensionName, nodeId);

        if (!node) {
            node = {
                id: nodeId,
                dimensionName,
                value: nodeId,
                level,
                parent,
                children: [],
                isExpanded: false,
                hasChildren: hierarchyConfig?.hierarchy ?? false,
                hasData: false,
            };

            if (!this.trees.has(dimensionName)) {
                this.trees.set(dimensionName, {
                    metadata: {
                        depth: 1, // FIX: always start with depth 1, updateTreeDepth will correct
                        isHierarchical: hierarchyConfig?.hierarchy ?? false,
                    },
                    nodes: new Map(),
                });
            }
            this.trees.get(dimensionName)!.nodes.set(nodeId, node);
        }

        return node;
    }

    updateTreeNodeLevels(dimensionName: string): void {
        const tree = this.getDimensionTree(dimensionName);
        if (!tree) return;

        const visited = new Set<string>();

        // 1. Find roots
        const roots: ITreeNode[] = [];
        for (const node of tree.nodes.values()) {
            if (node.parent == null || !tree.nodes.has(node.parent)) {
                roots.push(node);
            }
        }

        // 2. Iterative DFS
        const stack: Array<{ node: ITreeNode; level: number }> = [];
        for (const root of roots) {
            stack.push({ node: root, level: 0 });
        }

        while (stack.length > 0) {
            const { node, level } = stack.pop()!;

            if (visited.has(node.value)) continue;
            visited.add(node.value);

            node.level = level;

            for (const childValue of node.children) {
                const childNode = tree.nodes.get(childValue);
                if (childNode && !visited.has(childValue)) {
                    stack.push({ node: childNode, level: level + 1 });
                }
            }
        }
    }

    /**
     * FIX [CRITICAL-2]: Recalculates the depth of the dimension tree.
     *
     * The depth must reflect the maximum level of any VISIBLE node —
     * not just expanded ones. A node is "visible" if it is a root node
     * or if its parent is expanded. Previously, only expanded nodes were
     * counted, causing undercounting by 1 level and column-header
     * row collisions.
     */
    updateTreeDepth(dimensionName: string): void {
        const tree = this.getDimensionTree(dimensionName);
        if (!tree) return;

        let maxDepth = 0;
        for (const node of tree.nodes.values()) {
            // A node is visible if it has no parent (root) or its parent is expanded.
            const parentNode = node.parent ? tree.nodes.get(node.parent) : undefined;
            const isVisible = node.parent == null || !tree.nodes.has(node.parent) || parentNode?.isExpanded;

            if (isVisible) {
                maxDepth = Math.max(maxDepth, node.level + 1);
            }
        }
        tree.metadata.depth = Math.max(maxDepth, 1);
    }

    buildPath(dimensionName: string, value: string): string[] {
        const path: string[] = [];
        const visited = new Set<string>();
        let currentValue: string | undefined = value;

        while (currentValue !== undefined) {
            if (visited.has(currentValue)) {
                console.warn(
                    `HierarchyTreeManager: обнаружено зацикливание измерения "${dimensionName}" на узле "${currentValue}"`,
                );
                break;
            }
            visited.add(currentValue);
            path.unshift(currentValue);
            const node = this.getNode(dimensionName, currentValue);
            currentValue = node?.parent;
        }

        return path;
    }

    isExpanded(dimensionName: string, nodeId: string): boolean {
        return this.getNode(dimensionName, nodeId)?.isExpanded ?? false;
    }

    setExpanded(dimensionName: string, nodeId: string, expanded: boolean): void {
        const node = this.getNode(dimensionName, nodeId);
        if (node) {
            node.isExpanded = expanded;
            if (!expanded) {
                this.collapseChildren(dimensionName, node);
            }

            this.updateTreeDepth(dimensionName);
        }
    }

    private collapseChildren(dimensionName: string, node: ITreeNode): void {
        for (const childId of node.children) {
            const child = this.getNode(dimensionName, childId);
            if (child && child.isExpanded) {
                child.isExpanded = false;
                this.collapseChildren(dimensionName, child);
            }
        }
    }

    setDrillDownData(dimensionName: string, nodeId: string, data: IPivotTable): void {
        const node = this.getNode(dimensionName, nodeId);
        if (node) {
            node.data = data;
        }
    }

    getDrillDownData(dimensionName: string, nodeId: string): IPivotTable | undefined {
        return this.getNode(dimensionName, nodeId)?.data;
    }

    hasData(dimensionName: string, nodeId: string): boolean {
        return this.getNode(dimensionName, nodeId)?.hasData ?? false;
    }

    markHasData(dimensionName: string, nodeId: string): void {
        const node = this.getNode(dimensionName, nodeId);
        if (node) {
            node.hasData = true;
        }
    }

    clear(dimensionName?: string): void {
        if (dimensionName) {
            this.trees.delete(dimensionName);
        } else {
            this.trees.clear();
        }
    }

    exportState(): Record<string, { metadata: ITreeMetadata; nodes: ITreeNode[] }> {
        const state: Record<string, { metadata: ITreeMetadata; nodes: ITreeNode[] }> = {};

        for (const [dimensionName, { metadata, nodes }] of this.trees) {
            state[dimensionName] = {
                metadata,
                nodes: Array.from(nodes.values()),
            };
        }

        return state;
    }

    importState(state: Record<string, { metadata: ITreeMetadata; nodes: ITreeNode[] }>): void {
        this.clear();

        for (const [dimensionName, { metadata, nodes }] of Object.entries(state)) {
            if (!this.trees.has(dimensionName)) {
                this.trees.set(dimensionName, { metadata, nodes: new Map() });
            }
            for (const node of nodes) {
                this.trees.get(dimensionName)!.nodes.set(node.id, node);
            }
        }
    }
}
