import StateManager from 'lite-react-statemanager';
import type { NormalizedNode } from 'components/MetadataHier/types';
import type { ScopeState } from 'components/MetadataHier/lib/scope';

export const STORAGE_TTL_MS = 60 * 1000 * 1000;

const CACHE_PREFIX = 'mh-cache:';

export interface LoadTreeResult {
    state: ScopeState;
    isStale: boolean;
}

interface CacheData {
    rootId: string | null;
    nodes: Array<[string, NormalizedNode]>;
    expandedIds: string[];
    // selectedIds: string[];
    cachedAt: number;
}

function getCacheKey(server: string): string {
    return `${CACHE_PREFIX}${server}`;
}

export function saveTree(server: string, state: ScopeState, fullRefresh?: boolean): void {
    const cacheData: CacheData = {
        rootId: state.rootId,
        nodes: [...state.nodes.entries()],
        expandedIds: [...state.expandedIds],
        // selectedIds: [...state.selectedIds],
        cachedAt: fullRefresh ? Date.now() : state.cachedAt ?? Date.now(),
    };

    try {
        localStorage.setItem(getCacheKey(server), JSON.stringify(cacheData));
    } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            StateManager.setState({
                modal: {
                    show: true,
                    element: { name: 'Внимание' },
                    content: 'Не удалось сохранить дерево в памяти: слишком большой размер',
                },
            });
        } else {
            console.error('[cache] Ошибка при сохранении дерева:', e);
        }
    }
}

export function saveTreePartial(server: string, state: ScopeState): void {
    saveTree(server, state, false);
}

export function loadTree(server: string): LoadTreeResult | null {
    try {
        const raw = localStorage.getItem(getCacheKey(server));
        if (!raw) return null;

        const cacheData: CacheData = JSON.parse(raw);
        if (!cacheData || !cacheData.cachedAt) return null;

        const age = Date.now() - cacheData.cachedAt;
        const isStale = age > STORAGE_TTL_MS;

        const state: ScopeState = {
            rootId: cacheData.rootId,
            nodes: new Map(cacheData.nodes),
            expandedIds: new Set(cacheData.expandedIds),
            // selectedIds: new Set(cacheData.selectedIds),
            selectedIds: new Set(),
            multiSelectMode: false,
            treeVersion: 0,
            nodeEvents: new Map(),
            cachedAt: cacheData.cachedAt,
        };

        return { state, isStale };
    } catch (e) {
        console.error('[cache] Ошибка при загрузке дерева:', e);
        return null;
    }
}

export function clearCache(server: string): void {
    try {
        localStorage.removeItem(getCacheKey(server));
    } catch {
        // ignore
    }
}
