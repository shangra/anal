import React, { useCallback, useContext, useSyncExternalStore } from 'react';

import { PluginRegistry, RegistryPluginState } from '../../types';
import { AdapterAPI } from '../Adapter';

// ─── Расширенный API с подпиской ─────────────────────────────────────────────

export interface AdapterSubscribableAPI extends AdapterAPI {
    /** Подписка на изменения. Возвращает unsubscribe. */
    subscribe: (listener: () => void) => () => void;
    /** Текущая версия состояния (инкрементируется при каждом dispatch). */
    getVersion: () => number;
}

export const AdapterCtx = React.createContext<AdapterSubscribableAPI | null>(null);

export function useAdapterAPI(): AdapterSubscribableAPI {
    const api = useContext(AdapterCtx);
    if (!api) throw new Error('useAdapterAPI: нет провайдера AdapterCtx в дереве');
    return api;
}

/**
 * usePluginState с точечной подпиской через useSyncExternalStore.
 *
 * Компонент перерисовывается ТОЛЬКО если состояние запрошенного плагина
 * действительно изменилось (по ссылке).
 */
export function usePluginState<K extends keyof PluginRegistry>(key: K): RegistryPluginState<K> | undefined;
export function usePluginState<S>(key: string): S | undefined;
export function usePluginState(key: string): unknown {
    const api = useAdapterAPI();

    const subscribe = useCallback((onStoreChange: () => void) => api.subscribe(onStoreChange), [api]);

    const getSnapshot = useCallback(() => api.getPluginState(key as string), [api, key]);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
