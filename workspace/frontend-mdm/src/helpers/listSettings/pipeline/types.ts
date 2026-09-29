import { ICell } from '../../../components/MetadataForms/ElementsList/ReactWindowWrapperCombined'
import { ITreeRow } from '../../../components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types'
import type { SelectionCondition, SelectionNode } from '../facets/selection/types'
import type { SortRule } from '../facets/sort/types'
import type { ConditionalFormattingRule } from '../facets/conditionalFormatting/types'

export interface ActiveListView {
    activeSelectionNodes: SelectionNode[]
    activeSelectionConditions: SelectionCondition[]
    activeGroupFields: string[]
    activeSortRules: SortRule[]
    activeConditionalFormattingRules: ConditionalFormattingRule[]
}

export type ListViewApplyResult = ICell[][] | ITreeRow[]
