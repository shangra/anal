import { createFacetStore } from '../../core/createFacetStore'
import {
    cloneSortSettingsState,
    emptySortSettingsState,
    parseSortSettingsState,
    resolveActiveSortRules,
    type SortRule,
    type SortSettingsState,
} from './types'

const store = createFacetStore<SortSettingsState>({
    id: 'sort',
    storageKey: 'list-settings-sort',
    legacyStorageKeys: ['list-settings-sorting'],
    keys: ['sortRules', 'availableFields', 'fieldTypes'],
    empty: emptySortSettingsState,
    parse: parseSortSettingsState,
    clone: cloneSortSettingsState,
})

export { store as sortSettingsStore }

export function getSortSettingsState(): SortSettingsState {
    return store.getState()
}

export function getActiveSortRules(): SortRule[] {
    return resolveActiveSortRules(store.getState())
}

export { cloneSortSettingsState }

function isValidFieldName(field: string): boolean {
    if (!field || typeof field !== 'string') return false
    const trimmed = field.trim()
    if (!trimmed) return false
    if (trimmed === 'undefined' || trimmed === 'null') return false
    if (trimmed.includes('undefined.') || trimmed.includes('null.')) return false
    return true
}

export const sortSettingsActions = {
    addSortField(field: string): void {
        if (!isValidFieldName(field)) return
        const { sortRules } = store.getState()
        if (sortRules.some((r: SortRule) => r.field === field)) return
        const newRules = [...sortRules, { field, direction: 'ASC' as const, enabled: true }]
        store.commit({ sortRules: newRules })
    },

    addSortFields(fields: string[]): void {
        if (!Array.isArray(fields)) return
        const { sortRules } = store.getState()
        const existing = new Set(sortRules.map((r: SortRule) => r.field))
        const toAdd = fields.filter((f) => isValidFieldName(f) && !existing.has(f))
        if (toAdd.length === 0) return
        const rules = [...sortRules]
        const updatedRules = rules.map((rule: SortRule) => {
            if (toAdd.includes(rule.field)) {
                return { ...rule, direction: 'ASC' as const, enabled: true }
            }
            return rule
        })
        const newRules = toAdd.map((f: string) => ({ field: f, direction: 'ASC' as const, enabled: true }))
        store.commit({ sortRules: [...updatedRules, ...newRules] })
    },

    removeSortField(field: string): void {
        const { sortRules } = store.getState()
        const next = sortRules.filter((r: SortRule) => r.field !== field)
        store.commit({ sortRules: next })
    },

    removeSortFields(fields: string[]): void {
        const toRemove = new Set(fields)
        const { sortRules } = store.getState()
        store.commit({ sortRules: sortRules.filter((r: SortRule) => !toRemove.has(r.field)) })
    },

    changeSortDirection(field: string, direction: 'ASC' | 'DESC'): void {
        const { sortRules } = store.getState()
        if (!isValidFieldName(field)) return
        const rules = sortRules.map((r: SortRule) => {
            if (r.field === field) {
                return { ...r, direction }
            }
            return r
        })
        store.commit({ sortRules: rules })
    },

    moveSortRules(fields: string[], direction: 'up' | 'down'): void {
        const selected = new Set(fields.filter(isValidFieldName))
        if (selected.size === 0) return
        const list = [...store.getState().sortRules]

        if (direction === 'up') {
            if (list.length > 0 && selected.has(list[0].field)) return
            for (let i = 1; i < list.length; i += 1) {
                if (selected.has(list[i].field) && !selected.has(list[i - 1].field)) {
                    ;[list[i - 1], list[i]] = [list[i], list[i - 1]]
                }
            }
        } else {
            if (list.length > 0 && selected.has(list[list.length - 1].field)) return
            for (let i = list.length - 2; i >= 0; i -= 1) {
                if (selected.has(list[i].field) && !selected.has(list[i + 1].field)) {
                    ;[list[i], list[i + 1]] = [list[i + 1], list[i]]
                }
            }
        }

        store.commit({ sortRules: list })
    },

    reorderSortRules(fieldsToMove: string[], targetIndex: number): void {
        const list = [...store.getState().sortRules]
        const moveSet = new Set(fieldsToMove)
        const moved = list.filter((r: SortRule): r is SortRule => moveSet.has(r.field) && isValidFieldName(r.field))
        if (moved.length === 0) return
        const remaining = list.filter((r: SortRule) => !moveSet.has(r.field))
        const removedBefore = list
            .slice(0, Math.max(0, targetIndex))
            .filter((r: SortRule): r is SortRule => moveSet.has(r.field)).length
        const adjusted = Math.max(0, Math.min(targetIndex - removedBefore, remaining.length))
        remaining.splice(adjusted, 0, ...moved)
        store.commit({ sortRules: remaining })
    },

    toggleSortFieldEnabled(field: string): void {
        const { sortRules } = store.getState()
        const ruleIndex = sortRules.findIndex((r: SortRule) => r.field === field)
        if (ruleIndex === -1) return
        const rules = sortRules.map((r: SortRule, i: number) => {
            if (i === ruleIndex) {
                return { ...r, enabled: !r.enabled }
            }
            return r
        })
        store.commit({ sortRules: rules })
    },

    setAvailableFields(fields: SortSettingsState['availableFields']): void {
        store.commit({ availableFields: fields })
    },

    setFieldTypes(fieldTypes: SortSettingsState['fieldTypes']): void {
        store.commit({ fieldTypes })
    },

    restoreSnapshot(snapshot: SortSettingsState): void {
        store.restore(snapshot)
    },
}
