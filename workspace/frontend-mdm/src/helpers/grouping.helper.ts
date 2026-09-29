import StateManager from 'lite-react-statemanager';
import { GroupingFieldTreeNode } from '../components/MetadataForms/Buttons/Group/ListSettingsModal/shared/types';

export const STORAGE_KEY = 'list-settings-grouping';

export interface ListSettingsData {
    selectedGroupFields: string[],
    disabledGroupFields: string[],
    availableFields: GroupingFieldTreeNode[],
}

export type ListSettingsSubscriber = {
    setState: (state: Partial<ListSettingsData>) => void
}

export function loadPersisted(): ListSettingsData {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) {
            return { selectedGroupFields: [], disabledGroupFields: [], availableFields: [] }
        }

        const parsed = JSON.parse(raw) as Partial<ListSettingsData>
        return {
            selectedGroupFields: Array.isArray(parsed.selectedGroupFields)
                ? parsed.selectedGroupFields
                : [],
            disabledGroupFields: Array.isArray(parsed.disabledGroupFields)
                ? parsed.disabledGroupFields
                : [],
            availableFields: Array.isArray(parsed.availableFields)
                ? parsed.availableFields
                : [],
        }
    } catch {
        return { selectedGroupFields: [], disabledGroupFields: [], availableFields: [] }
    }
}

function persist(): void {
    // persist handled by createFacetStore in listSettings/facets/grouping/store.ts
}

function commit(partial: Partial<ListSettingsData>): void {
    StateManager.setState({ ...partial })
    persist()
}

export function getListSettingsState(): ListSettingsData {
    const state = StateManager.state
    return {
        selectedGroupFields: (state.selectedGroupFields as string[] | undefined) ?? [],
        disabledGroupFields: (state.disabledGroupFields as string[] | undefined) ?? [],
        availableFields: (state.availableFields as GroupingFieldTreeNode[] | undefined) ?? [],
    }
}

export function getCatalogFields(): import('../components/MetadataForms/Buttons/Group/ListSettingsModal/shared/types').GroupingFieldTreeNode[] {
    return getListSettingsState().availableFields
}

export function createListSettingsSubscriber(
    apply: (key: keyof ListSettingsData, value: string[]) => void,
): ListSettingsSubscriber {
    return {
        setState: (patch) => {
            if (patch.selectedGroupFields !== undefined)
                apply('selectedGroupFields', patch.selectedGroupFields)
            if (patch.disabledGroupFields !== undefined)
                apply('disabledGroupFields', patch.disabledGroupFields)
        }
    }
}

export function subscribeListSettings(
    subscriberName: string,
    target: ListSettingsSubscriber,
): void {
    const onSelectedGroupFields = (state: Record<string, unknown>): void => {
        target.setState(state as Partial<ListSettingsData>)
    }
    const onDisabledGroupFields = (state: Record<string, unknown>): void => {
        target.setState(state as Partial<ListSettingsData>)
    }
    StateManager.subscribeState({
        selectedGroupFields: {
            [subscriberName]: onSelectedGroupFields,
        },
        disabledGroupFields: {
            [subscriberName]: onDisabledGroupFields,
        },
    })
}

export function unsubscribeListSettings(subscriberName: string): void {
    StateManager.unsubscribeState({
        selectedGroupFields: [subscriberName],
        disabledGroupFields: [subscriberName],
    })
}

export const listSettingsActions = {
    setSelectedGroupFields(fields: string[]): void {
        const { disabledGroupFields } = getListSettingsState()
        commit({
            selectedGroupFields: fields,
            disabledGroupFields: disabledGroupFields.filter((f) => fields.includes(f)),
        })
    },

    addGroupField(field: string): void {
        const { selectedGroupFields, disabledGroupFields } = getListSettingsState()
        if (selectedGroupFields.includes(field)) return
        commit({
            selectedGroupFields: [...selectedGroupFields, field],
            disabledGroupFields: disabledGroupFields.filter((f) => f !== field),
        })
    },

    addGroupFields(fields: string[]): void {
        const { selectedGroupFields, disabledGroupFields } = getListSettingsState()
        const existing = new Set(selectedGroupFields)
        const toAdd = fields.filter((f) => !existing.has(f))
        if (toAdd.length === 0) return
        commit({
            selectedGroupFields: [...selectedGroupFields, ...toAdd],
            disabledGroupFields: disabledGroupFields.filter((f) => !toAdd.includes(f)),
        })
    },

    insertGroupField(field: string, index: number): void {
        const { selectedGroupFields, disabledGroupFields } = getListSettingsState()
        if (selectedGroupFields.includes(field)) return
        const fields = [...selectedGroupFields]
        const clamped = Math.max(0, Math.min(index, fields.length))
        fields.splice(clamped, 0, field)

        commit({
            selectedGroupFields: fields,
            disabledGroupFields: disabledGroupFields.filter((f) => f !== field),
        })
    },


    insertGroupFields(fieldsToInsert: string[], index: number): void {
        const { selectedGroupFields, disabledGroupFields } = getListSettingsState()
        const existing = new Set(selectedGroupFields)
        const toAdd = fieldsToInsert.filter((f) => !existing.has(f))

        if (toAdd.length === 0) return
        const fields = [...selectedGroupFields]
        const clamped = Math.max(0, Math.min(index, fields.length))
        fields.splice(clamped, 0, ...toAdd)
        const added = new Set(toAdd)
        commit({
            selectedGroupFields: fields,
            disabledGroupFields: disabledGroupFields.filter((f) => !added.has(f)),
        })
    },

    reorderGroupField(fromIndex: number, toIndex: number): void {
        const fields = [...getListSettingsState().selectedGroupFields]
        if (
            fromIndex < 0 ||
            fromIndex >= fields.length ||
            toIndex < 0 ||
            toIndex >= fields.length ||
            fromIndex === toIndex
        ) {
            return
        }
        const [item] = fields.splice(fromIndex, 1)
        fields.splice(toIndex, 0, item)
        commit({ selectedGroupFields: fields })
    },

    reorderGroupFields(fieldsToMove: string[], targetIndex: number): void {
        const list = [...getListSettingsState().selectedGroupFields]
        const moveSet = new Set(fieldsToMove)
        const moved = list.filter((f) => moveSet.has(f))
        if (moved.length === 0) return
        const remaining = list.filter((f) => !moveSet.has(f))
        const removedBefore = list
            .slice(0, Math.max(0, targetIndex))
            .filter((f) => moveSet.has(f)).length
        const adjustedIndex = Math.max(
            0,
            Math.min(targetIndex - removedBefore, remaining.length),
        )
        remaining.splice(adjustedIndex, 0, ...moved)
        commit({ selectedGroupFields: remaining })
    },

    removeGroupField(field: string): void {
        const { selectedGroupFields, disabledGroupFields } = getListSettingsState()
        commit({
            selectedGroupFields: selectedGroupFields.filter((f) => f !== field),
            disabledGroupFields: disabledGroupFields.filter((f) => f !== field),
        })
    },

    removeGroupFields(fields: string[]): void {
        const toRemove = new Set(fields)
        const { selectedGroupFields, disabledGroupFields } = getListSettingsState()
        commit({
            selectedGroupFields: selectedGroupFields.filter((f) => !toRemove.has(f)),
            disabledGroupFields: disabledGroupFields.filter((f) => !toRemove.has(f)),
        })
    },

    moveGroupField(index: number, direction: 'up' | 'down'): void {
        const fields = [...getListSettingsState().selectedGroupFields]
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= fields.length) return
            ;[fields[index], fields[target]] = [fields[target], fields[index]]
        commit({ selectedGroupFields: fields })
    },

    moveGroupFields(fieldsToMove: string[], direction: 'up' | 'down'): void {
        const selected = new Set(fieldsToMove)
        if (selected.size === 0) return
        const list = [...getListSettingsState().selectedGroupFields]
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
        commit({ selectedGroupFields: list })
    },

    toggleGroupFieldEnabled(field: string): void {
        const { selectedGroupFields, disabledGroupFields } = getListSettingsState()
        if (!selectedGroupFields.includes(field)) return
        if (disabledGroupFields.includes(field)) {
            commit({
                disabledGroupFields: disabledGroupFields.filter((f) => f !== field),
            })
        } else {
            commit({
                disabledGroupFields: [...disabledGroupFields, field],
            })
        }
    },

    getActiveGroupFields(): string[] {
        const { selectedGroupFields, disabledGroupFields } = getListSettingsState()
        const disabled = new Set(disabledGroupFields)
        return selectedGroupFields.filter((f) => !disabled.has(f))
    },

    restoreSnapshot(snapshot: ListSettingsData): void {
        commit({
            selectedGroupFields: [...snapshot.selectedGroupFields],
            disabledGroupFields: [...snapshot.disabledGroupFields],
        })
    },

    setAvailableFields(fields: GroupingFieldTreeNode[]): void {
        commit({ availableFields: fields })
    },
}