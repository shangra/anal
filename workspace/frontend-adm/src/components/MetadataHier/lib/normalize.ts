import type { RawRootNode, RawChildNode, NormalizedNode, NodeLoadStrategy, TreeMap } from 'components/MetadataHier/types';
import { buildNodeKey } from 'components/MetadataHier/lib/keys';

export function normalizeRootNode(raw: RawRootNode): NormalizedNode {
    return {
        nodeKey: raw.id,
        id: raw.id,
        name: raw.name,
        description: raw.description,
        crud: raw.crud,
        needToLoading: raw.needToLoading,
        icon: raw.icon ?? null,
        events: {},
        ownerId: null,
        classId: null,
        class: null,
        routes: null,
        sort: { strategy: 'none' },
        parentId: null,
        childrenIds: [],
        depth: 0,
        expandable: raw.needToLoading,
        isExpanded: false,
        isLoading: false,
        isLoaded: false,
        sortOrder: undefined,
        loadStatus: undefined,
        loadStrategy: 'lazy',
        // v3/tree часто отдаёт флаг через crud:['rls'], а не отдельным полем rls
        rls: raw.rls === true || raw.crud?.includes('rls') === true,
    };
}

export function normalizeChildNode(raw: RawChildNode, parentNodeKey: string, parentDepth: number): NormalizedNode {
    const nodeKey = buildNodeKey(parentNodeKey, raw.id);
    const loadStrategy: NodeLoadStrategy =
        (raw.children && raw.children.length > 0) || raw.needToLoading === false ? 'eager' : 'lazy';

    return {
        nodeKey,
        id: raw.id,
        name: raw.name,
        description: raw.description,
        crud: raw.crud,
        needToLoading: raw.needToLoading,
        icon: raw.icon ?? null,
        ownerId: raw.owner_id,
        classId: raw.class_id,
        class: raw.class,
        routes: raw.routes,
        sort: raw.sort ?? { strategy: 'none' },
        parentId: parentNodeKey,
        childrenIds: [],
        depth: parentDepth + 1,
        expandable: raw.needToLoading,
        isExpanded: false,
        isLoading: false,
        isLoaded: false,
        sortOrder: undefined,
        loadStatus: undefined,
        loadStrategy,
        events: raw.events ?? {},
        rls: raw.rls === true || raw.crud?.includes('rls') === true,
    };
}
export function toRawNode(node: NormalizedNode): RawChildNode {
    return {
        id: node.id,
        owner_id: node.ownerId ?? '00000000-0000-0000-0000-000000000000',
        class_id: node.classId ?? '',
        class: node.class ?? '',
        routes: node.routes ?? '',
        name: node.name,
        description: node.description,
        crud: node.crud,
        needToLoading: node.needToLoading,
        events: node.events,
    };
}

export function getChildren(nodeId: string, map: TreeMap): NormalizedNode[] {
    const node = map.get(nodeId);
    if (!node) return [];
    return node.childrenIds.map((id) => map.get(id)).filter((n): n is NormalizedNode => n !== undefined);
}

/**
 * Возвращает цепочку предков от корня до непосредственного родителя.
 * Используется для хлебных крошек, навигации и эвристик UI.
 * Если у какого-то звена parentId указывает на отсутствующий в карте узел,
 * цепочка обрывается на этом уровне (не падает).
 */
export function getAncestors(nodeKey: string, map: TreeMap): NormalizedNode[] {
    const result: NormalizedNode[] = [];
    let current = map.get(nodeKey);
    while (current?.parentId) {
        const parent = map.get(current.parentId);
        if (!parent) break;
        result.unshift(parent);
        current = parent;
    }
    return result;
}
