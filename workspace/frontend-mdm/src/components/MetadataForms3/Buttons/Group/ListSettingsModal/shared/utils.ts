import { getListSettingsState } from '../../../../../../helpers/grouping.helper'
import type { GroupingFieldTreeNode } from './types'
import {
    cloneGroupingSettingsState,
    cloneSelectionSettingsState,
    cloneConditionalFormattingSettingsState,
    cloneSortSettingsState,
    getGroupingSettingsState,
    getSelectionSettingsState,
    getConditionalFormattingSettingsState,
    getSortSettingsState,
    type GroupingSettingsState,
    type SelectionSettingsState,
    type ConditionalFormattingSettingsState,
    type SortSettingsState,
} from '../../../../../../helpers/listSettings'


export function buildGroupingFieldsTree(
    selectedGroupFields: string[],
    activeGroupFields: string[] = selectedGroupFields,
): GroupingFieldTreeNode[] {
    const { availableFields } = getListSettingsState()
    const labelByValue = Object.fromEntries(
        availableFields.map((f) => [f.value, f.label]),
    )

    const selectedSet = new Set(selectedGroupFields)
    const availableNodes: GroupingFieldTreeNode[] = availableFields
        .filter((f) => !selectedSet.has(f.value))
        .map((f) => ({
            id: f.value,
            label: f.label,
            value: f.value,
            isGroupLevel: false,
            children: [],
        }))

    if (activeGroupFields.length === 0) {
        return availableNodes
    }

    let groupChain: GroupingFieldTreeNode | null = null

    for (let i = activeGroupFields.length - 1; i >= 0; i -= 1) {
        const value = activeGroupFields[i]
        groupChain = {
            id: `group-${value}`,
            label: labelByValue[value] ?? value,
            value,
            isGroupLevel: true,
            children: groupChain ? [groupChain] : [],
        }
    }
    return groupChain ? [groupChain, ...availableNodes] : availableNodes
}


// ---- List settings snapshot helpers ----

let titleIdCounter = 0

export function generateTitleId(): string {
    titleIdCounter += 1
    return `list-settings-title-${titleIdCounter}`
}

export function serializeSelection(state: SelectionSettingsState): string {
    return JSON.stringify(state.selectionNodes)
}

export function serializeSort(state: SortSettingsState): string {
    return JSON.stringify(state.sortRules)
}

export function takeSnapshots(): {
    grouping: GroupingSettingsState
    selection: SelectionSettingsState
    conditionalFormatting: ConditionalFormattingSettingsState
    sort: SortSettingsState
} {
    return {
        grouping: cloneGroupingSettingsState(getGroupingSettingsState()),
        selection: cloneSelectionSettingsState(getSelectionSettingsState()),
        conditionalFormatting: cloneConditionalFormattingSettingsState(getConditionalFormattingSettingsState()),
        sort: cloneSortSettingsState(getSortSettingsState()),
    }
}
