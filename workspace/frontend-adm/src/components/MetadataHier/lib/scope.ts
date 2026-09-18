import StateManager from 'lite-react-statemanager';
import type { NodeEventsList, NormalizedNode } from 'components/MetadataHier/types';

export interface ScopeState {
    nodes: Map<string, NormalizedNode>;
    rootId: string | null;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    multiSelectMode: boolean;
    treeVersion: number;
    nodeEvents: Map<string, NodeEventsList>;
    /** Timestamp последнего успешного сохранения в localStorage */
    cachedAt: number | null;
}

export const EMPTY_SCOPE: ScopeState = {
    nodes: new Map(),
    rootId: null,
    selectedIds: new Set(),
    expandedIds: new Set(),
    multiSelectMode: false,
    treeVersion: 0,
    nodeEvents: new Map<string, NodeEventsList>(),
    cachedAt: null,
};

export const METADATA_SELECTED_KEY = 'metadataSelected';

export const scopeKey = (server: string): string => `mh:${server}`;

export function readScope(server: string): ScopeState {
    const scope = (StateManager.state as Record<string, ScopeState | undefined>)[scopeKey(server)] ?? EMPTY_SCOPE;

    scope.nodes.forEach((node) => {
        if (Object.keys(node.events).length > 0) {
            scope.nodeEvents.set(node.nodeKey, node.events as NodeEventsList);
        }
    });

    return scope;
}
export function writeScope(server: string, next: ScopeState): void {
    StateManager.setState({ [scopeKey(server)]: next });
}
export function clearScope(server: string): void {
    StateManager.setState({ [scopeKey(server)]: undefined });
}

export interface ChangeNodePayload {
    nodeId: string;
    manifest?: { name?: string; description?: string };
    newNode?: NormalizedNode;
    source?: string;
    ts?: number;
}

export const changeNodeKey = (server: string): string => `mh:${server}:changeNode`;

export function readChangeNode(server: string): ChangeNodePayload | undefined {
    return (StateManager.state as Record<string, ChangeNodePayload | undefined>)[changeNodeKey(server)];
}
export function emitChangeNode(server: string, payload: ChangeNodePayload): void {
    StateManager.setState({ [changeNodeKey(server)]: { ...payload, ts: Date.now() } });
}

export interface MetadataSelected {
    server: string;
    nodeKey: string;
    node: NormalizedNode;
    ts?: number;
}

export function readMetadataSelected(): MetadataSelected | null {
    return ((StateManager.state as Record<string, unknown>)[METADATA_SELECTED_KEY] as MetadataSelected | null) ?? null;
}

export function writeMetadataSelected(next: MetadataSelected | null): void {
    if (next) {
        next = { ...next, ts: Date.now() };
    }
    StateManager.setState({ [METADATA_SELECTED_KEY]: next });
}
