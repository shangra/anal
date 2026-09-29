import type { SelectionNode } from '../../../../../../helpers/listSettings'
import type { GroupingFieldTreeNode } from '../shared/types'
import type { ConditionalFormattingRule } from '../../../../../../helpers/listSettings/facets/conditionalFormatting/types'

export type SelectionEditableCell = 'field' | 'comparison' | 'value'

export interface SelectionEditingCell {
    conditionId: string
    cell: SelectionEditableCell
}

export interface SelectionTabState {
    selectionNodes: SelectionNode[]
    availableSelectedFields: string[]
    highlightedIds: string[]
    selectionAnchorIndex: number
    addModalOpen: boolean
    logicMenuGroupId: string | null
    editingCell: SelectionEditingCell | null
    draggingFields: Set<string>
    dragSource: 'selected' | null
    dropIndex: number | null
    isDropActive: boolean
    availableDragFields: string[] | null
}

export interface GroupingTabState {
    selectedGroupFields: string[]
    disabledGroupFields: string[]
    availableFields: GroupingFieldTreeNode[]
    addModalOpen: boolean
    highlightedSelectedFields: string[]
    selectionAnchorIndex: number
    draggingFields: Set<string>
    dragSource: 'available' | 'selected' | null
    dropIndex: number | null
    isDropActive: boolean
    listSettingsRevision: number
}

export interface SortTextFieldItem {
    field: string
    label: string
    direction: 'asc' | 'desc'
}

export interface SortingTabState {
    highlightedFields: SortTextFieldItem[]
    selectionAnchorIndex: number
    draggingFields: Set<string>
    dragSource: 'available' | 'sort' | null
    dropIndex: number | null
    isDropActive: boolean
    addModalOpen: boolean
    /** Открытые селекты направления (ключ — имя поля) */
    openedDirectionSelects: Record<string, boolean>
}

export type CfPropertiesTab = 'appearance' | 'condition' | 'fields'

export interface ConditionalFormattingTabState {
    conditionalFormattingRules: ConditionalFormattingRule[]
    highlightedIds: string[]
    selectionAnchorIndex: number
    editingCell: { ruleId: string; cell: 'appearance' | 'condition' | 'fields' } | null
    propertiesModalOpen: boolean
    editingRuleId: string | null
    activePropertiesTab: CfPropertiesTab
    dragSource: 'selected' | null
    draggingFields: Set<string>
    dropIndex: number | null
    isDropActive: boolean
}

export interface ColumnGroupingDropTarget {
    parentId: string
    index: number
    zone: 'into' | 'before' | 'after'
}

export interface ColumnGroupingTabState {
    highlightedNodeIds: string[]
    selectionAnchor: string | null
    draggingNodeIds: string[]
    dragSource: 'tree' | 'available-panel' | null
    dropTarget: ColumnGroupingDropTarget | null
    expandedGroupIds: Set<string>
    isAddFieldsModalOpen: boolean
    editingGroupId: string | null
    /** Черновик ширины/высоты, пока не выбрана колонка для применения. */
    draftWidth: string
    draftHeight: string
    /** Значение, выставленное кнопками «±»; приоритетнее выбранного значения и черновика (null — неактивно). */
    stepDraftWidth: string | null
    stepDraftHeight: string | null
    draftFlexGrow: boolean
    draftExpandVertical: boolean
    /** Открытые селекты растягивания ячейки (ключ — 'flexGrow' | 'expandVertical'). */
    openedAppearanceSelects: Record<string, boolean>
    draftGroupOrientation: 'horizontal' | 'vertical' | undefined
}