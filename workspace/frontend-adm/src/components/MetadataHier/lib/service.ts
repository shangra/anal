import { buildNodeKey } from 'components/MetadataHier/lib/keys';
import { fetchRoot, fetchChildren } from 'components/MetadataHier/api/api';
import { normalizeChildNode, normalizeRootNode } from 'components/MetadataHier/lib/normalize';
import { NormalizedNode, RawChildNode } from 'components/MetadataHier/types';
import { adaptSingleNode, buildFlatFromMap } from 'components/MetadataHier/lib/flatAdapter';
import { FlatTreeNode } from 'ui-kit';
import {
    EMPTY_SCOPE,
    readScope,
    ScopeState,
    writeScope,
    readChangeNode,
    writeMetadataSelected,
} from 'components/MetadataHier/lib/scope';
import { loadTree, saveTree, saveTreePartial } from 'components/MetadataHier/lib/cache';
import $message from 'components/ui/MyFlash/message.helper';

const VERSIONED_FIELDS = ['nodes', 'expandedIds', 'selectedIds', 'rootId'] as const;

function publishGlobalSelectedIfNeeded(server: string, prev: ScopeState, next: ScopeState): void {
    if (prev.selectedIds === next.selectedIds && prev.nodes === next.nodes) return;
    if (next.multiSelectMode) {
        writeMetadataSelected(null);
        return;
    }
    if (next.selectedIds.size !== 1) {
        writeMetadataSelected(null);
        return;
    }
    const [only] = next.selectedIds;
    const node = next.nodes.get(only);
    if (!node) {
        writeMetadataSelected(null);
        return;
    }
    writeMetadataSelected({ server, nodeKey: only, node });
}

export function patch(server: string, p: Partial<ScopeState>, opts: { skipSelectionPublish?: boolean } = {}): ScopeState {
    const prev = readScope(server);
    const bump = VERSIONED_FIELDS.some((f) => f in p);
    const next: ScopeState = {
        ...prev,
        ...p,
        treeVersion: bump ? prev.treeVersion + 1 : prev.treeVersion,
    };
    writeScope(server, next);
    if (!opts.skipSelectionPublish) {
        publishGlobalSelectedIfNeeded(server, prev, next);
    }
    return next;
}

export const getState = (server: string): ScopeState => readScope(server);

function updateNode(server: string, nodeKey: string, p: Partial<NormalizedNode>) {
    const { nodes } = readScope(server);
    const node = nodes.get(nodeKey);
    if (!node) return;
    const next = new Map(nodes);
    next.set(nodeKey, { ...node, ...p });
    patch(server, { nodes: next });
}

function mergeChildren(server: string, parentKey: string, children: RawChildNode[]) {
    const { nodes } = readScope(server);
    const parent = nodes.get(parentKey);
    if (!parent || parent.isLoaded) return;

    const next = new Map(nodes);
    const childrenKeys: string[] = [];

    const process = (raw: RawChildNode, pKey: string, pRawId: string, pDepth: number): string => {
        const corrected = { ...raw, owner_id: raw.owner_id ?? pRawId };
        const child = normalizeChildNode(corrected, pKey, pDepth);
        next.set(child.nodeKey, child);

        if (raw.children?.length) {
            const grand: string[] = [];
            for (const g of raw.children) grand.push(process(g, child.nodeKey, child.id, child.depth + 1));
            next.set(child.nodeKey, {
                ...child,
                childrenIds: grand,
                isLoaded: true,
                isLoading: false,
                expandable: grand.length > 0 || child.needToLoading,
            });
        }
        return child.nodeKey;
    };

    for (const c of children) childrenKeys.push(process(c, parentKey, parent.id, parent.depth));

    next.set(parentKey, {
        ...parent,
        childrenIds: childrenKeys,
        isLoaded: true,
        isLoading: false,
        expandable: parent.expandable,
    });
    const state = patch(server, { nodes: next });
    saveTreePartial(server, state);
}

export async function loadRoot(server: string): Promise<void> {
    const { rootId, nodes } = readScope(server);
    if (rootId && nodes.get(rootId)?.isLoaded) return;

    const cached = loadTree(server);
    if (cached) {
        patch(server, {
            ...cached.state,
            multiSelectMode: false,
            treeVersion: 0,
            nodeEvents: new Map(),
        });

        if (cached.isStale) {
            $message.show('Данные устарели. Выполняется рекурсивное обновление дерева...');
            // Асинхронный рефреш всего дерева (запускается, не блокируя рендер)
            reloadRootRecursively(server).catch(console.error);
        } else {
            $message.show(
                'Дерево загружено из памяти. Для обновления дерева нажмите на корень метаданных и нажмите на кнопку "Обновить" наверху дерева',
            );
        }
        return;
    }

    const data = await fetchRoot(server);
    const root = normalizeRootNode(data);
    const state = patch(server, {
        ...EMPTY_SCOPE,
        nodes: new Map([[root.id, root]]),
        rootId: root.nodeKey,
        expandedIds: new Set([root.nodeKey]),
    });
    saveTreePartial(server, state);
    await loadChildren(server, root.id);
}

export async function loadChildren(server: string, nodeKey: string): Promise<void> {
    const { nodes } = readScope(server);
    const node = nodes.get(nodeKey);
    if (!node) return;
    if (node.isLoaded || node.isLoading) return;

    const isRoot = node.parentId === null;
    if (!isRoot) updateNode(server, nodeKey, { isLoading: true });

    try {
        const data = await fetchChildren(node.id, server);
        mergeChildren(server, nodeKey, data);
    } catch (e) {
        if (!isRoot) updateNode(server, nodeKey, { isLoading: false });
        throw e;
    }
}

export function handleNodeClick(server: string, nodeKey: string): void {
    const { nodes, selectedIds, multiSelectMode } = readScope(server);
    if (!nodes.get(nodeKey)) return;

    if (selectedIds.has(nodeKey)) {
        const next = new Set(selectedIds);
        next.delete(nodeKey);
        patch(server, { selectedIds: next });
        return;
    }
    if (multiSelectMode) toggleSelectedForDeleteId(server, nodeKey);
    else patch(server, { selectedIds: new Set([nodeKey]) });
}

export function toggleSortOrder(server: string, nodeKey: string) {
    const { nodes } = readScope(server);
    const node = nodes.get(nodeKey);
    if (!node) return;
    const next = new Map(nodes);
    next.set(nodeKey, { ...node, sortOrder: node.sortOrder === 'asc' ? 'desc' : 'asc' });
    patch(server, { nodes: next });
}

export const getNodeByKey = (server: string, nodeKey: string) => readScope(server).nodes.get(nodeKey);

export const isRoot = (server: string, nodeKey: string) => {
    const node = getNodeByKey(server, nodeKey);
    return node ? node.parentId === null : !nodeKey.includes('/');
};

export const getSelectedIds = (server: string) => readScope(server).selectedIds;

export const clearSelectedIds = (server: string) => patch(server, { selectedIds: new Set() });

export function toggleSelectedForDeleteId(server: string, nodeKey: string) {
    const { selectedIds } = readScope(server);
    const next = new Set(selectedIds);
    next.has(nodeKey) ? next.delete(nodeKey) : next.add(nodeKey);
    patch(server, { selectedIds: next });
}

export function toggleMultiSelectMode(server: string) {
    const { multiSelectMode } = readScope(server);
    const mode = !multiSelectMode;
    patch(server, { multiSelectMode: mode, ...(mode ? {} : { selectedIds: new Set<string>() }) });
}

export function setMultiSelectMode(server: string, value: boolean): void {
    if (readScope(server).multiSelectMode === value) return;
    patch(server, { multiSelectMode: value });
}

export async function reloadChildrenByParentId(server: string, parentKey: string) {
    const { nodes } = readScope(server);
    const parent = nodes.get(parentKey);
    if (!parent) return;

    const next = new Map(nodes);
    for (const k of nodes.keys()) if (k.startsWith(`${parentKey}/`)) next.delete(k);
    next.set(parentKey, { ...parent, childrenIds: [], isLoaded: false, isLoading: false });
    patch(server, { nodes: next });
    await loadChildren(server, parentKey);
}

export function findNearestLazyAncestor(server: string, nodeKey: string): NormalizedNode | null {
    const { nodes } = readScope(server);
    const parts = nodeKey.split('/');
    parts.pop();
    while (parts.length) {
        const a = nodes.get(parts.join('/'));
        if (a?.loadStrategy === 'lazy') return a;
        parts.pop();
    }
    return null;
}

export function removeNodeFromState(server: string, nodeKey: string) {
    const { nodes, expandedIds } = readScope(server);
    if (!nodes.get(nodeKey)) return;

    const nextNodes = new Map(nodes);
    const nextExpanded = new Set(expandedIds);

    const rm = (k: string) => {
        const n = nextNodes.get(k);
        if (!n) return;
        for (const c of n.childrenIds ?? []) rm(c);
        nextNodes.delete(k);
        nextExpanded.delete(k);
    };
    rm(nodeKey);

    const parentKey = nodeKey.split('/').slice(0, -1).join('/');
    const parent = nextNodes.get(parentKey);
    if (parent) {
        nextNodes.set(parentKey, {
            ...parent,
            childrenIds: parent.childrenIds.filter((id) => id !== nodeKey),
        });
    }
    patch(server, { nodes: nextNodes, expandedIds: nextExpanded });
}

export async function reloadChildrenByParentNodeKey(server: string, parentKey: string, optimisticDeleteNodeKey?: string) {
    const { nodes, expandedIds } = readScope(server);
    const parent = nodes.get(parentKey);
    if (!parent) return;

    const keepRawIds = new Set<string>();
    for (const k of expandedIds) {
        if (k.startsWith(parentKey)) {
            const n = nodes.get(k);
            if (n) keepRawIds.add(n.id);
        }
    }

    const nextNodes = new Map(nodes);
    const nextExpanded = new Set(expandedIds);

    if (optimisticDeleteNodeKey) {
        nextNodes.delete(optimisticDeleteNodeKey);
        nextExpanded.delete(optimisticDeleteNodeKey);
    }
    nextNodes.set(parentKey, { ...parent, isLoaded: false });
    patch(server, { nodes: nextNodes, expandedIds: nextExpanded });

    await loadChildren(server, parentKey);

    await restoreExpandedByLevel(server, [parentKey], keepRawIds);

    saveTreePartial(server, readScope(server));
}

export async function reloadRootRecursively(server: string): Promise<void> {
    const { rootId, nodes, expandedIds } = readScope(server);
    if (!rootId) {
        await loadRoot(server);
        return;
    }

    const keepRawIds = new Set<string>();
    for (const k of expandedIds) {
        if (k === rootId) continue;
        const n = nodes.get(k);
        if (n) keepRawIds.add(n.id);
    }

    const root = nodes.get(rootId);
    if (!root) {
        await loadRoot(server);
        return;
    }

    const nextNodes = new Map<string, NormalizedNode>();
    nextNodes.set(rootId, { ...root, childrenIds: [], isLoaded: false, isLoading: false });
    patch(server, { nodes: nextNodes, expandedIds: new Set([rootId]) });

    await loadChildren(server, rootId);

    await restoreExpandedByLevel(server, [rootId], keepRawIds);

    saveTree(server, readScope(server), true);
}

async function restoreExpandedByLevel(server: string, parentKeys: string[], keepRawIds: Set<string>): Promise<void> {
    const { nodes } = readScope(server);
    const toExpand: Array<{ childKey: string; child: NormalizedNode }> = [];

    for (const pk of parentKeys) {
        const parent = nodes.get(pk);
        if (!parent) continue;
        for (const childKey of parent.childrenIds) {
            const child = nodes.get(childKey);
            if (child && keepRawIds.has(child.id)) {
                toExpand.push({ childKey, child });
            }
        }
    }

    if (!toExpand.length) return;

    const expanded = new Set(readScope(server).expandedIds);
    for (const { childKey } of toExpand) {
        expanded.add(childKey);
    }
    patch(server, { expandedIds: expanded });

    const results = await Promise.allSettled(
        toExpand
            .filter(({ child }) => !child.isLoaded && !child.isLoading)
            .map(({ childKey }) => loadChildren(server, childKey)),
    );

    const succeededKeys: string[] = [];
    const loadingNodes = toExpand.filter(({ child }) => !child.isLoaded && !child.isLoading);
    const settledByKey = new Map<string, PromiseSettledResult<void>>();
    loadingNodes.forEach(({ childKey }, idx) => settledByKey.set(childKey, results[idx]));

    for (const { childKey } of toExpand) {
        const settled = settledByKey.get(childKey);
        if (!settled || settled.status === 'fulfilled') {
            succeededKeys.push(childKey);
        } else {
            updateNode(server, childKey, { loadStatus: 'error' });
        }
    }

    await restoreExpandedByLevel(server, succeededKeys, keepRawIds);
}

export async function handleNodeUpdate(server: string, nodeKey: string) {
    const ancestor = findNearestLazyAncestor(server, nodeKey);

    if (ancestor) {
        await reloadChildrenByParentNodeKey(server, ancestor.nodeKey);
    }
}

export async function handleNodeAdd(server: string, nodeKey: string) {
    const { nodes } = readScope(server);
    const node = nodes.get(nodeKey);
    if (!node) return;

    const ancestor = findNearestLazyAncestor(server, nodeKey);
    if (ancestor) {
        await reloadChildrenByParentNodeKey(server, ancestor.nodeKey);
    } else {
        await reloadChildrenByParentId(server, nodeKey);
    }
}

export async function handleReloadNode(server: string, nodeKey: string) {
    const { nodes } = readScope(server);
    const node = nodes.get(nodeKey);
    if (!node) return;

    if (node.loadStrategy === 'lazy') {
        await reloadChildrenByParentNodeKey(server, nodeKey);
        return;
    }

    const ancestor = findNearestLazyAncestor(server, nodeKey);
    if (ancestor) {
        await reloadChildrenByParentNodeKey(server, ancestor.nodeKey);
    } else {
        await reloadChildrenByParentId(server, nodeKey);
    }
}

export function isAncestorOf(ancestorKey: string, descendantKey: string): boolean {
    if (ancestorKey === descendantKey) return true;
    return descendantKey.startsWith(`${ancestorKey}/`);
}

export function filterAncestorNodes(nodes: NormalizedNode[]): NormalizedNode[] {
    if (nodes.length <= 1) return nodes;

    const keys = new Set(nodes.map((n) => n.nodeKey));

    return nodes.filter((node) => {
        const parts = node.nodeKey.split('/');
        for (let i = parts.length - 1; i > 0; i--) {
            const ancestorKey = parts.slice(0, i).join('/');
            if (keys.has(ancestorKey)) return false;
        }
        return true;
    });
}

export interface OptimisticDeleteSnapshot {
    removedNodes: Array<[string, NormalizedNode]>;
    wasSelected: boolean;
    wasExpanded: boolean;
}

export function removeNodeOptimistically(server: string, nodeKey: string): OptimisticDeleteSnapshot {
    const { nodes, selectedIds, expandedIds } = readScope(server);
    const target = nodes.get(nodeKey);
    const removed: Array<[string, NormalizedNode]> = [];
    const wasSelected = selectedIds.has(nodeKey);
    const wasExpanded = expandedIds.has(nodeKey);

    if (!target) return { removedNodes: removed, wasSelected, wasExpanded };

    const nextNodes = new Map(nodes);
    const nextSelected = new Set(selectedIds);
    const nextExpanded = new Set(expandedIds);

    const collect = (k: string) => {
        const n = nextNodes.get(k);
        if (!n) return;
        for (const c of n.childrenIds ?? []) collect(c);
        removed.push([k, n]);
        nextNodes.delete(k);
        nextSelected.delete(k);
        nextExpanded.delete(k);
    };
    collect(nodeKey);

    const parentKey = nodeKey.split('/').slice(0, -1).join('/');
    const parent = nextNodes.get(parentKey);
    if (parent) {
        nextNodes.set(parentKey, {
            ...parent,
            childrenIds: parent.childrenIds.filter((id) => id !== nodeKey),
        });
    }

    const prev = readScope(server);
    writeScope(server, {
        ...prev,
        nodes: nextNodes,
        selectedIds: nextSelected,
        expandedIds: nextExpanded,
    });
    publishGlobalSelectedIfNeeded(server, prev, readScope(server));

    return { removedNodes: removed, wasSelected, wasExpanded };
}

export function restoreRemovedNodes(server: string, snapshot: OptimisticDeleteSnapshot): void {
    const { removedNodes, wasSelected, wasExpanded } = snapshot;
    if (!removedNodes.length) return;
    const { nodes, selectedIds, expandedIds } = readScope(server);

    const nextNodes = new Map(nodes);
    const nextSelected = new Set(selectedIds);
    const nextExpanded = new Set(expandedIds);

    for (const [k, n] of removedNodes) {
        nextNodes.set(k, n);
    }
    const [firstKey, firstNode] = removedNodes[0];
    if (wasSelected) nextSelected.add(firstNode.nodeKey);
    if (wasExpanded) nextExpanded.add(firstNode.nodeKey);

    const parentKey = firstKey.split('/').slice(0, -1).join('/');
    const parent = nextNodes.get(parentKey);
    if (parent && !parent.childrenIds.includes(firstKey)) {
        nextNodes.set(parentKey, { ...parent, childrenIds: [...parent.childrenIds, firstKey] });
    }

    const prev = readScope(server);
    writeScope(server, {
        ...prev,
        nodes: nextNodes,
        selectedIds: nextSelected,
        expandedIds: nextExpanded,
    });
    publishGlobalSelectedIfNeeded(server, prev, readScope(server));
}

export async function handleNodeDelete(server: string, nodeKey: string) {
    const ancestor = findNearestLazyAncestor(server, nodeKey);
    if (ancestor) {
        await reloadChildrenByParentNodeKey(server, ancestor.nodeKey, nodeKey);
    }
}

export function getSelectedFlatNodes(server: string): FlatTreeNode[] {
    const { selectedIds, nodes, expandedIds } = readScope(server);
    if (!selectedIds.size) return [];

    const result: FlatTreeNode[] = [];
    for (const key of selectedIds) {
        const node = nodes.get(key);
        if (!node) continue;
        result.push(adaptSingleNode(node, nodes, server, expandedIds, selectedIds));
    }
    return result;
}

export const searchFn = (server: string, term: string): FlatTreeNode[] => {
    const t = term.toLowerCase().trim();
    const { nodes, rootId, expandedIds, selectedIds } = readScope(server);
    if (!t || !rootId) return [];

    const parentOf = new Map<string, string>();
    nodes.forEach((n, k) => n.childrenIds?.forEach((c) => parentOf.set(c, k)));

    const matched = new Set<string>();
    const show = new Set<string>();
    const expanded = new Set<string>();

    nodes.forEach((n, k) => {
        if (k === rootId) return;
        if (!n.name?.toLowerCase().includes(t)) return;
        matched.add(k);
        show.add(k);
        let p = parentOf.get(k);
        while (p && p !== rootId) {
            show.add(p);
            expanded.add(p);
            p = parentOf.get(p);
        }
    });

    if (!matched.size) return [];

    const open = (k: string) => {
        if (!expandedIds.has(k)) return;
        expanded.add(k);
        nodes.get(k)?.childrenIds?.forEach((c) => {
            show.add(c);
            open(c);
        });
    };
    matched.forEach(open);

    expanded.add(rootId);

    return buildFlatFromMap(rootId, nodes, expanded, selectedIds, server).filter((n) => show.has(n.id));
};

export function toggleExpanded(server: string, nodeKey: string): { willLoad: boolean } {
    const { expandedIds, nodes } = readScope(server);
    const next = new Set(expandedIds);
    let willLoad = false;
    if (next.has(nodeKey)) {
        next.delete(nodeKey);
    } else {
        next.add(nodeKey);
        const n = nodes.get(nodeKey);
        if (n && !n.isLoaded && !n.isLoading) willLoad = true;
    }
    patch(server, { expandedIds: next });
    return { willLoad };
}

export function getChildrenByKey(server: string, nodeKey: string): NormalizedNode[] {
    const { nodes } = readScope(server);
    const node = nodes.get(nodeKey);
    if (!node) return [];
    return node.childrenIds.map((id) => nodes.get(id)).filter((n): n is NormalizedNode => n !== undefined);
}

export function reorderChildrenLocally(server: string, nodeKey: string, orderedIds: string[]): void {
    const { nodes } = readScope(server);
    const node = nodes.get(nodeKey);
    if (!node) return;

    const orderedChildKeys = orderedIds.map((id) => buildNodeKey(nodeKey, id)).filter((key) => node.childrenIds.includes(key));

    const remaining = node.childrenIds.filter((key) => !orderedChildKeys.includes(key));

    updateNode(server, nodeKey, { childrenIds: [...orderedChildKeys, ...remaining] });
}

export const isExpanded = (server: string, nodeKey: string): boolean => readScope(server).expandedIds.has(nodeKey);

export function applyChangeNode(server: string): void {
    const payload = readChangeNode(server);
    if (!payload?.nodeId) return;

    const { nodes } = readScope(server);
    let targetKey: string | null = null;
    let target: NormalizedNode | null = null;

    for (const [k, n] of nodes) {
        if (n.id === payload.nodeId) {
            targetKey = k;
            target = n;
            break;
        }
    }
    if (!targetKey || !target) return;

    const updated: NormalizedNode = payload.newNode
        ? payload.newNode
        : {
              ...target,
              name: payload.manifest?.name ?? target.name,
              description: payload.manifest?.description ?? target.description,
          };

    const nextNodes = new Map(nodes);
    nextNodes.set(targetKey, updated);
    // Перезаписываем только данные узла — выделение (selectedIds/multiSelectMode)
    // не менялось, повторная публикация metadataSelected не нужна и приводит
    // к ложному переоткрытию инспектора после сохранения из окна редактирования.
    patch(server, { nodes: nextNodes }, { skipSelectionPublish: true });
}

export function deleteRootElementIndent() {
    // пока такое себе решение
    setTimeout(() => {
        const treeElement = document.querySelector('.tree-cmp')!;
        const treeRootElement = treeElement.children[0]?.children[0]?.children[0];
        const rootItem = treeRootElement?.querySelector('span');
        rootItem?.removeChild(rootItem?.children[0]);
    }, 100);
}
