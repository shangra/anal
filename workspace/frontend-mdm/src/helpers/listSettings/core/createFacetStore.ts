import StateManager from 'lite-react-statemanager'
import { emitListSettingsRevision } from './revisionBus'

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
    getState: () => T
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

export function createFacetStore <T extends FaceStateShape>(
     config : FacetStoreConfig<T>,
): FacetStore<T> {
    const load = (): T => {
        try {
            const raw = readRaw(config.storageKey, config.legacyStorageKeys)
            if (!raw) return config.empty()
            return config.parse(JSON.parse(raw))
        } catch {
            return config.empty()
        }
    }

    const persist = (state: T): void => {
        try {
            localStorage.setItem(config.storageKey, JSON.stringify(state))
        } catch (e) {
            console.error('[createFacetStore] persist error:', e)
        }
    }

    const readState = (): T => {
        const bag = StateManager.state
        const result = { ...config.empty() }
        for (const key of config.keys) {
            const value = bag[key]
            if (value !== undefined) {
                ;(result as Record<string, unknown>)[key] = value
            }
        }
        return result
    }

    const initial = load()
    StateManager.setState({ ...initial })

    const commit = (partial: Partial<T>): void => {
        StateManager.setState({ ...partial })
        persist(readState())
        emitListSettingsRevision()
    }

    const replace = (next: T): void => {
        const payload: Record<string, unknown> = {}
        for (const key of config.keys) {
            payload[key] = next[key]
        }
        StateManager.setState(payload)
        persist(readState())
        emitListSettingsRevision()
    }

    return {
        id: config.id,
        getState: readState,
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