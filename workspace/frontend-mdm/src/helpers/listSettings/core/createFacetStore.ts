import StateManager from 'lite-react-statemanager'
import {
    getActiveListSettingsScope,
    isListSettingsBatch,
    noteListSettingsWrite,
    registerListSettingsFacet,
    resolveListSettingsScope,
} from './activeScope'
import { GLOBAL_LIST_SETTINGS_SCOPE } from './types'

export type FaceStateShape = object

export interface FacetStoreConfig<T extends FaceStateShape> {
    id: string
    storageKey: string
    legacyStorageKeys?: string[]
    keys: readonly (keyof T & string)[]
    empty: () => T
    parse: (raw: unknown) => T
    clone: (state: T) => T
}

export interface FacetStore<T extends FaceStateShape>{
    readonly id: string
    getState: (scope?: string) => T
    commit: (partial: Partial<T>) => void
    replace: (next: T) => void
    clone: (state: T) => T
    restore: (snapshot: T) => void
    subscribe: (
        subscriberName: string,
        onPatch: (patch: Partial<T>) => void,
    ) => void
    unsubscribe: (subscriberName: string) => void
}

function readRaw(storageKey: string, legacyKeys: string[] = []): string | null {
    const primary = localStorage.getItem(storageKey)
    if (primary) return primary
    for (const key of legacyKeys) {
        const legacy = localStorage.getItem(key)
        if (legacy) return legacy
    }
    return null
}

function storageKeyFor(base: string, scope: string): string {
    if (scope === GLOBAL_LIST_SETTINGS_SCOPE.key) {
        return base
    }
    return `${base}::${scope}`
}

export function createFacetStore <T extends FaceStateShape>(
     config : FacetStoreConfig<T>,
): FacetStore<T> {
    const cache = new Map<string, T>()

    const load = (scope: string): T => {
        try {
            const key = storageKeyFor(config.storageKey, scope)
            const raw = scope === GLOBAL_LIST_SETTINGS_SCOPE.key
                ? readRaw(key, config.legacyStorageKeys)
                : localStorage.getItem(key)
            if (!raw) return config.empty()
            return config.parse(JSON.parse(raw))
        } catch {
            return config.empty()
        }
    }

    const persist = (scope: string, state: T): void => {
        try {
            localStorage.setItem(storageKeyFor(config.storageKey, scope), JSON.stringify(state))
        } catch (e) {
            console.error('[createFacetStore] persist error:', e)
        }
    }

    const materialize = (scope: string): T => {
        const cached = cache.get(scope)
        if (cached) {
            return cached
        }
        const loaded = config.clone(load(scope))
        cache.set(scope, loaded)
        return loaded
    }

    const publish = (state: T): void => {
        const payload: Record<string, unknown> = {}
        for (const key of config.keys) {
            payload[key] = state[key]
        }
        StateManager.setState(payload)
    }

    const write = (scope: string, next: T): void => {
        const cloned = config.clone(next)
        cache.set(scope, cloned)
        persist(scope, cloned)
        if (!isListSettingsBatch() && scope === getActiveListSettingsScope()) {
            publish(cloned)
        }
        noteListSettingsWrite()
    }

    const read = (scope?: string): T => materialize(resolveListSettingsScope(scope))

    const initial = materialize(GLOBAL_LIST_SETTINGS_SCOPE.key)
    publish(initial)

    registerListSettingsFacet({
        hydrateActive: () => {
            publish(materialize(getActiveListSettingsScope()))
        },
    })

    const commit = (partial: Partial<T>): void => {
        const scope = resolveListSettingsScope()
        write(scope, { ...read(scope), ...partial })
    }

    const replace = (next: T): void => {
        const scope = resolveListSettingsScope()
        const payload = { ...config.empty() }
        for (const key of config.keys) {
            ;(payload as Record<string, unknown>)[key] = next[key]
        }
        write(scope, payload)
    }

    return {
        id: config.id,
        getState: read,
        commit,
        replace,
        clone: config.clone,
        restore: (snapshot) => replace(config.clone(snapshot)),
        subscribe: (subscriberName, onPatch) => {
            const handlers: Record<string, Record<string, (state: Record<string, unknown>) => void>> =
                {}
            for (const key of config.keys) {
                handlers[key] = {
                    [subscriberName]: (state) => {
                        onPatch(state as Partial<T>)
                    },
                }
            }
            StateManager.subscribeState(handlers)
        },
        unsubscribe: (subscriberName) => {
            const payload: Record<string, string[]> = {}
            for (const key of config.keys) {
                payload[key] = [subscriberName]
            }
            StateManager.unsubscribeState(payload)
        },
    }
}
