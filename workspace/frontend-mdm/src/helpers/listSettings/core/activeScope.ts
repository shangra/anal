import { emitListSettingsRevision } from './revisionBus'
import { GLOBAL_LIST_SETTINGS_SCOPE } from './types'

type ScopedFacet = {
    hydrateActive: () => void
}

const facets: ScopedFacet[] = []

let activeScope = GLOBAL_LIST_SETTINGS_SCOPE.key
let writingScope: string | null = null
let batchDepth = 0
let batchDirty = false

export function registerListSettingsFacet(facet: ScopedFacet): void {
    facets.push(facet)
}

export function normalizeListSettingsScope(scope?: string): string {
    const key = (scope ?? '').trim()
    return key || GLOBAL_LIST_SETTINGS_SCOPE.key
}

/** Явный ключ важнее временной записи, та — важнее активной таблицы. */
export function resolveListSettingsScope(explicit?: string): string {
    if (typeof explicit === 'string' && explicit.trim()) {
        return normalizeListSettingsScope(explicit)
    }
    if (writingScope) {
        return writingScope
    }
    return activeScope
}

export function getActiveListSettingsScope(): string {
    return activeScope
}

export function isListSettingsBatch(): boolean {
    return batchDepth > 0
}

export function noteListSettingsWrite(): void {
    if (batchDepth > 0) {
        batchDirty = true
        return
    }
    emitListSettingsRevision()
}

export function listSettingsScopeKey(parts: { metaOwner?: string; name?: string }): string {
    const owner = (parts.metaOwner ?? '').trim()
    const name = (parts.name ?? '').trim()
    if (!owner && !name) {
        return GLOBAL_LIST_SETTINGS_SCOPE.key
    }
    if (!owner) {
        return name
    }
    if (!name || name === 'list') {
        return owner
    }
    return `${owner}:${name}`
}

/** Какую таблицу сейчас редактирует окно настроек. */
export function setActiveListSettingsScope(scope: string): void {
    const next = normalizeListSettingsScope(scope)
    if (next === activeScope) {
        return
    }
    activeScope = next
    for (const facet of facets) {
        facet.hydrateActive()
    }
    emitListSettingsRevision()
}

/** Запись в стор конкретной таблицы, не затрагивая активную. */
export function withListSettingsScope<T>(scope: string, fn: () => T): T {
    const previous = writingScope
    writingScope = normalizeListSettingsScope(scope)
    batchDepth += 1
    const dirtyBefore = batchDirty
    batchDirty = false
    try {
        return fn()
    } finally {
        const changed = batchDirty
        batchDirty = dirtyBefore || changed
        batchDepth -= 1
        writingScope = previous
        if (changed && batchDepth === 0) {
            emitListSettingsRevision()
        }
    }
}
