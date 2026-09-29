import { createFacetStore } from '../../core/createFacetStore'
import { getFieldDataType } from '../../fields/catalog'
import {
    canGroupSelectionNodes,
    canUngroupSelectionNodes,
    findNodeLocation,
    groupSelectionNodes as groupNodesInTree,
    moveSelectionNodes as moveNodesInTree,
    removeSelectionNodesByIds,
    setSelectionGroupLogic as setGroupLogicInTree,
    updateSelectionNodeById,
    ungroupSelectionNodes as ungroupNodesInTree,
} from './tree'
import {
    cloneSelectionSettingsState,
    createSelectionCondition,
    defaultComparisonForFieldType,
    emptySelectionSettingsState,
    getActiveSelectionConditions as selectActiveConditions,
    isComparisonAllowedForFieldType,
    isSelectionGroup,
    parseSelectionSettingsState,
    type SelectionCondition,
    type SelectionGroupLogic,
    type SelectionNode,
    type SelectionSettingsState,
} from './types'

const store = createFacetStore<SelectionSettingsState>({
    id: 'selection',
    storageKey: 'list-settings-selection',
    legacyStorageKeys: ['list-settings'],
    keys: ['selectionNodes'],
    empty: emptySelectionSettingsState,
    parse: parseSelectionSettingsState,
    clone: cloneSelectionSettingsState,
})

export function getSelectionSettingsState(scope?: string): SelectionSettingsState {
    return store.getState(scope)
}

export { cloneSelectionSettingsState }

function normalizeConditionPatch(
    existing: SelectionCondition,
    patch: Partial<Pick<SelectionCondition, 'field' | 'comparison' | 'value' | 'enabled' | 'useRange'>>,
): Partial<SelectionCondition> {
    const updated: SelectionCondition = { ...existing, ...patch }

    if (patch.field !== undefined) {
        const dataType = getFieldDataType(patch.field)
        if (!isComparisonAllowedForFieldType(updated.comparison, dataType)) {
            updated.comparison = defaultComparisonForFieldType(dataType)
            updated.value = ''
        }
    }

    if (patch.comparison === 'filled' || patch.comparison === 'empty') {
        updated.value = ''
    }

    if (patch.comparison === 'between') {
        if (typeof updated.value === 'string') {
            updated.value = ['', '']
        }
    }

    if (patch.useRange !== undefined && !patch.useRange && updated.comparison === 'between') {
        updated.comparison = 'eq'
        updated.value = typeof updated.value === 'string' ? updated.value : ''
    }

    if (patch.useRange !== undefined && patch.useRange && updated.comparison === 'eq') {
        updated.comparison = 'between'
        if (typeof updated.value === 'string') {
            updated.value = [updated.value || '', '']
        }
    }

    return {
        field: updated.field,
        comparison: updated.comparison,
        value: updated.value,
        enabled: updated.enabled,
        useRange: updated.useRange,
    }
}

export const selectionSettingsActions = {
    setSelectionNodes(nodes: SelectionNode[]): void {
        store.commit({ selectionNodes: nodes })
    },

    addSelectionConditions(fields: string[]): void {
        if (fields.length === 0) return

        const { selectionNodes } = store.getState()

        store.commit({
            selectionNodes: [
                ...selectionNodes,
                ...fields.map((field) =>
                    createSelectionCondition(field, {
                        comparison: defaultComparisonForFieldType(getFieldDataType(field)),
                    }),
                ),
            ],
        })
    },

    updateSelectionCondition(
        id: string,
        patch: Partial<Pick<SelectionCondition, 'field' | 'comparison' | 'value' | 'enabled' | 'useRange'>>,
    ): void {
        const { selectionNodes } = store.getState()
        const location = findNodeLocation(selectionNodes, id)
        if (!location || isSelectionGroup(location.node)) return

        store.commit({
            selectionNodes: updateSelectionNodeById(
                selectionNodes,
                id,
                normalizeConditionPatch(location.node, patch),
            ),
        })
    },

    toggleSelectionNodeEnabled(id: string): void {
        const { selectionNodes } = store.getState()
        const location = findNodeLocation(selectionNodes, id)
        if (!location) return

        store.commit({
            selectionNodes: updateSelectionNodeById(selectionNodes, id, {
                enabled: !location.node.enabled,
            }),
        })
    },

    toggleSelectionConditionEnabled(id: string): void {
        selectionSettingsActions.toggleSelectionNodeEnabled(id)
    },

    removeSelectionNodes(ids: string[]): void {
        const { selectionNodes } = store.getState()
        store.commit({
            selectionNodes: removeSelectionNodesByIds(selectionNodes, ids),
        })
    },

    removeSelectionConditions(ids: string[]): void {
        selectionSettingsActions.removeSelectionNodes(ids)
    },

    moveSelectionNodes(ids: string[], direction: 'up' | 'down'): void {
        const { selectionNodes } = store.getState()
        store.commit({
            selectionNodes: moveNodesInTree(selectionNodes, ids, direction),
        })
    },

    moveSelectionConditions(ids: string[], direction: 'up' | 'down'): void {
        selectionSettingsActions.moveSelectionNodes(ids, direction)
    },

    groupSelectionNodes(ids: string[], logic: SelectionGroupLogic = 'and'): void {
        const { selectionNodes } = store.getState()
        if (!canGroupSelectionNodes(selectionNodes, ids)) return

        store.commit({
            selectionNodes: groupNodesInTree(selectionNodes, ids, logic),
        })
    },

    ungroupSelectionNodes(ids: string[]): void {
        const { selectionNodes } = store.getState()
        if (!canUngroupSelectionNodes(selectionNodes, ids)) return

        store.commit({
            selectionNodes: ungroupNodesInTree(selectionNodes, ids),
        })
    },

    setSelectionGroupLogic(groupId: string, logic: SelectionGroupLogic): void {
        const { selectionNodes } = store.getState()
        store.commit({
            selectionNodes: setGroupLogicInTree(selectionNodes, groupId, logic),
        })
    },

    getActiveSelectionConditions(): SelectionCondition[] {
        return selectActiveConditions(store.getState())
    },

    restoreSnapshot(snapshot: SelectionSettingsState): void {
        store.restore(snapshot)
    },
}
