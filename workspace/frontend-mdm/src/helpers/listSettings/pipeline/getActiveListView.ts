import { getActiveGroupFields } from '../facets/grouping/store'
import { getSelectionSettingsState } from '../facets/selection/store'
import { getSortSettingsState } from '../facets/sort/store'
import { getConditionalFormattingSettingsState } from '../facets/conditionalFormatting/store'
import { 
    getActiveSelectionConditions,
    getActiveSelectionNodes,
} from '../facets/selection/types'
import type { ActiveListView } from './types'

export function getActiveListView(scope?: string): ActiveListView {
    const selectionState = getSelectionSettingsState(scope)
    const sortState = getSortSettingsState(scope)
    const cfState = getConditionalFormattingSettingsState(scope)
    return {
        activeSelectionNodes: getActiveSelectionNodes(selectionState),
        activeSelectionConditions: getActiveSelectionConditions(selectionState),
        activeGroupFields: getActiveGroupFields(scope),
        activeSortRules: sortState.sortRules.filter((rule) => rule.enabled),
        activeConditionalFormattingRules: cfState.conditionalFormattingRules.filter((r) => r.enabled),
    }
}
