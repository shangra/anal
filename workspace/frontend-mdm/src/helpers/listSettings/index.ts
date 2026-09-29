export type { ListSettingsFacetId, ListSettingsScope } from './core/types'
export { GLOBAL_LIST_SETTINGS_SCOPE } from './core/types'
export {
    emitListSettingsRevision,
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
    getListSettingsRevision,
} from './core/revisionBus'
export type { FacetStore } from './core/createFacetStore'

export { attachListSettingsRevision } from './react/attachRevision'

export type { ListFieldDataType, ListFieldDescriptor } from './fields/types'
export { normalizeListFieldDataType } from './fields/types'
export {
    listFieldCatalog,
    getFieldDescriptor,
    getFieldLabel,
    getFieldDataType,
} from './fields/catalog'

export type {
    SelectionComparison,
    SelectionGroupLogic,
    SelectionCondition,
    SelectionGroup,
    SelectionNode,
    SelectionSettingsState,
    SelectionFlatRow,
} from './facets/selection/types'
export {
    SELECTION_COMPARISON_OPTIONS,
    SELECTION_GROUP_LOGIC_OPTIONS,
    COMPARISONS_BY_FIELD_TYPE,
    comparisonNeedsValue,
    getComparisonsForFieldType,
    isComparisonAllowedForFieldType,
    defaultComparisonForFieldType,
    isSelectionGroup,
    isSelectionCondition,
    isSelectionGroupNode,
    createSelectionCondition,
    createSelectionGroup,
    cloneSelectionNode,
    cloneSelectionSettingsState,
    parseSelectionSettingsState,
    emptySelectionSettingsState,
    flattenEnabledConditions,
    collectNodeIds,
    findNodeById,
    flattenSelectionForRender,
    getActiveSelectionConditions,
    getActiveSelectionNodes,
} from './facets/selection/types'
export {
    findNodeLocation,
    mapSelectionTree,
    updateSelectionNodeById,
    removeSelectionNodesByIds,
    groupSelectionNodes,
    ungroupSelectionNodes,
    setSelectionGroupLogic,
    moveSelectionNodes,
    canGroupSelectionNodes,
    canUngroupSelectionNodes,
} from './facets/selection/tree'
export {
    nodeMatchesSelection,
    rowMatchesSelectionTree,
    applySelectionToFlatRows,
    applySelectionToMixedRows,
} from './facets/selection/apply'
export {
    getSelectionSettingsState,
    selectionSettingsActions,
} from './facets/selection/store'
export { getGroupLogicLabel } from './facets/selection/types'

export type { GroupingSettingsState } from './facets/grouping/types'
export {
    getGroupingSettingsState,
    groupingSettingsActions,
    getActiveGroupFields,
    cloneGroupingSettingsState,
} from './facets/grouping/store'
export { applyGroupingToFlatRows } from './facets/grouping/apply'

export type { SortRule, SortSettingsState } from './facets/sort/types'
export {
    getSortSettingsState,
    sortSettingsActions,
    cloneSortSettingsState,
    getActiveSortRules,
    sortSettingsStore,
} from './facets/sort/store'
export {
    emptySortSettingsState,
    parseSortSettingsState,
} from './facets/sort/types'

export type {
    ColumnGroupNodeKind,
    ColumnGroupNode,
    ColumnCellAppearance,
    ColumnGroupingSettingsState,
    ColumnGroupFlatRow,
    ColumnGroupOrientation,
} from './facets/columnGrouping/types'

export {
    getColumnGroupingSettingsState,
    getColumnGroupingCatalog,
    setColumnGroupingCatalog,
    getUsedColumnFieldIds,
    getFlatColumnGroupRows,
    cloneColumnGroupingSettingsState,
    columnGroupingSettingsActions,
} from './facets/columnGrouping/store'

export {
    applyColumnGroupingToCols,
    flattenGroupedColumns,
    type ColumnGroupEntry,
    type GroupedColumnsOutput,
} from './facets/columnGrouping/apply'

export { findColumnNode, collectColumnNodeIds, childrenCountOf, indexOfNodeById } from './facets/columnGrouping/tree';

export type {
    ConditionalHorizontalAlign,
    ConditionalVerticalAlign,
    ConditionalAppearance,
    ConditionalAppearanceOption,
    ConditionalFormattingRule,
    ConditionalFormattingSettingsState,
} from './facets/conditionalFormatting/types'
export {
    CONDITIONAL_APPEARANCE_OPTIONS,
    HORIZONTAL_ALIGN_OPTIONS,
    VERTICAL_ALIGN_OPTIONS,
    TEXT_ORIENTATION_OPTIONS,
    MIRROR_OPTIONS,
    createConditionalFormattingRule,
    cloneConditionalAppearance,
    cloneConditionalFormattingRule,
    cloneConditionalFormattingSettingsState,
    parseConditionalFormattingSettingsState,
    emptyConditionalFormattingSettingsState,
    formatAppearanceSummary,
    formatTargetFieldsSummary,
    getAppearancePreviewColor,
    formatConditionSummary,
    conditionNodeMatches,
} from './facets/conditionalFormatting/types'
export {
    getConditionalFormattingSettingsState,
    conditionalFormattingSettingsActions,
} from './facets/conditionalFormatting/store'
export {
    appearanceToCssProperties,
    applyMarkIncomplete,
    ruleMatchesCondition,
    resolveConditionalCellDecoration,
    getActiveConditionalFormattingRules,
    formatCellBy1CFormat,
    parse1CFormatString,
} from './facets/conditionalFormatting/apply'

export { getListSettingsState, listSettingsActions } from '../grouping.helper'

export type { ActiveListView, ListViewApplyResult } from './pipeline/types'
export { getActiveListView } from './pipeline/getActiveListView'
export { applyListViewToFlatRows, applySelectionToRows, applySortToRows } from './pipeline/applyListView'