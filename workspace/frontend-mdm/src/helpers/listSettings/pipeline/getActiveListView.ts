import { getActiveGroupFields } from '../facets/grouping/store'
import { getSelectionSettingsState } from '../facets/selection/store'
import { getSortSettingsState } from '../facets/sort/store'
import { getConditionalFormattingSettingsState } from '../facets/conditionalFormatting/store'
import { 
    getActiveSelectionConditions,
    getActiveSelectionNodes,
} from '../facets/selection/types'
import type { ActiveListView } from './types'

export function getActiveListView(): ActiveListView {
    const selectionState = getSelectionSettingsState()
    const sortState = getSortSettingsState()
    const cfState = getConditionalFormattingSettingsState()
    return {
        activeSelectionNodes: getActiveSelectionNodes(selectionState),
        activeSelectionConditions: getActiveSelectionConditions(selectionState),
        activeGroupFields: getActiveGroupFields(),
        activeSortRules: sortState.sortRules.filter((rule) => rule.enabled),
        activeConditionalFormattingRules: cfState.conditionalFormattingRules.filter((r) => r.enabled),
    }
}
