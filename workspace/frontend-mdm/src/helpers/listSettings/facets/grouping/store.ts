import { createFacetStore } from "../../core/createFacetStore"
import {
    cloneGroupingSettingsState,
    emptyGroupingSettingsState,
    parseGroupingSettingsState,
    resolveActiveGroupFields,
    type GroupingSettingsState,
} from './types'

const store = createFacetStore<GroupingSettingsState>({
    id: 'grouping',
    storageKey: 'list-settings-grouping',
    legacyStorageKeys: ['list-settings'],
    keys: ['selectedGroupFields', 'disabledGroupFields'],
    empty: emptyGroupingSettingsState,
    parse: parseGroupingSettingsState,
    clone: cloneGroupingSettingsState,
})

export function getGroupingSettingsState(scope?: string): GroupingSettingsState {
    return store.getState(scope)
}

export function getActiveGroupFields(scope?: string): string[] {
    return resolveActiveGroupFields(store.getState(scope))
}

export { cloneGroupingSettingsState }

export const groupingSettingsActions = {
    setSelectedGroupFields(fields: string[]): void {
        const { disabledGroupFields } = store.getState()
        store.commit({
            selectedGroupFields: fields,
            disabledGroupFields: disabledGroupFields.filter((field) => 
                fields.includes(field),
            ),
        })
    },

    addGroupFields(fields: string[]): void {
        const { selectedGroupFields, disabledGroupFields } = store.getState()
        const existing = new Set(selectedGroupFields)
        const toAdd = fields.filter((field) => !existing.has(field))
        if (toAdd.length === 0) return
        store.commit({
            selectedGroupFields: [...selectedGroupFields, ...toAdd],
            disabledGroupFields: disabledGroupFields.filter(
                (field) => !toAdd.includes(field),
            ),
        })
    },

    insertGroupFields(fieldsToInsert: string[], index: number): void {
        const { selectedGroupFields, disabledGroupFields } = store.getState()
        const existing = new Set(selectedGroupFields)
        const toAdd = fieldsToInsert.filter((field) => !existing.has(field))
        if (toAdd.length === 0) return
        const fields = [...selectedGroupFields]
        const clamped = Math.max(0, Math.min(index, fields.length))
        fields.splice(clamped, 0, ...toAdd)
        const added = new Set(toAdd)
        store.commit({
            selectedGroupFields: fields,
            disabledGroupFields: disabledGroupFields.filter((field) => !added.has(field)),
        })
    },

    reorderGroupFields(fieldsToMove: string[], targetIndex: number): void {
        const list = [...store.getState().selectedGroupFields]
        const moveSet = new Set(fieldsToMove)
        const moved = list.filter((field) => moveSet.has(field))
        if (moved.length === 0) return
        const remaining = list.filter((field) => !moveSet.has(field))
        const removedBefore = list
            .slice(0, Math.max(0, targetIndex))
            .filter((field) => moveSet.has(field)).length
        const adjustedIndex = Math.max(
            0,
            Math.min(targetIndex - removedBefore, remaining.length),
        )
        remaining.splice(adjustedIndex, 0, ...moved)
        store.commit({ selectedGroupFields: remaining })
    },

    removeGroupFields(fields: string[]): void {
        const toRemove = new Set(fields)
        const { selectedGroupFields, disabledGroupFields } = store.getState()
        store.commit({
            selectedGroupFields: selectedGroupFields.filter(
                (field) => !toRemove.has(field),
            ),
            disabledGroupFields: disabledGroupFields.filter(
                (field) => !toRemove.has(field),
            ),
        })
    },

    moveGroupFields(fieldsToMove: string[], direction: 'up' | 'down'): void {
        const selected = new Set(fieldsToMove)
        if (selected.size === 0) return
        const list = [...store.getState().selectedGroupFields]

        if (direction === 'up') {
            if (list.length > 0 && selected.has(list[0])) return
            for (let i = 1; i < list.length; i += 1) {
                if (selected.has(list[i]) && !selected.has(list[i - 1])) {
                    ;[list[i - 1], list[i]] = [list[i], list[i - 1]]
                }
            }
        } else {
            if (list.length > 0 && selected.has(list[list.length - 1])) return
            for (let i = list.length - 2; i >= 0; i -= 1) {
                if (selected.has(list[i]) && !selected.has(list[i + 1])) {
                    ;[list[i], list[i + 1]] = [list[i + 1], list[i]]
                }
            }
        }

        store.commit({ selectedGroupFields: list })
    },

    toggleGroupFieldEnabled(field: string): void {
        const { disabledGroupFields } = store.getState()
        if (disabledGroupFields.includes(field)) {
            store.commit({
                disabledGroupFields: disabledGroupFields.filter((item) => item !== field),
            })
        } else {
            store.commit({
                disabledGroupFields: [...disabledGroupFields, field],
            })
        }
    },

    restoreSnapshot(snapshot: GroupingSettingsState): void {
        store.restore(snapshot)
    },
}