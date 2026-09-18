import { ILoadingStateManager, OnLoadingStateChangeCallback } from '../types';

export default class LoadingStateManager implements ILoadingStateManager {
    private loadingNodes = new Map<string, Set<string>>();

    private listeners: OnLoadingStateChangeCallback[] = [];

    isLoading(dimensionName: string, nodeId: string): boolean {
        return this.loadingNodes.get(dimensionName)?.has(nodeId) ?? false;
    }

    setLoading(dimensionName: string, nodeId: string, loading: boolean): void {
        if (!this.loadingNodes.has(dimensionName)) {
            this.loadingNodes.set(dimensionName, new Set());
        }

        const nodes = this.loadingNodes.get(dimensionName)!;
        if (loading) {
            nodes.add(nodeId);
        } else {
            nodes.delete(nodeId);
        }

        this.notifyListeners(dimensionName, nodeId, loading);
    }

    onChange(callback: OnLoadingStateChangeCallback): () => void {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index !== -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    private notifyListeners(dimensionName: string, nodeId: string, loading: boolean): void {
        for (const listener of this.listeners) {
            listener(dimensionName, nodeId, loading);
        }
    }

    clear(): void {
        this.loadingNodes.clear();
    }
}
