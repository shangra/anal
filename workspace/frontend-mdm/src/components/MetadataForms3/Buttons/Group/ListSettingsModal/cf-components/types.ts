import type { MouseEvent, DragEvent } from 'react'
import type {
    ConditionalFormattingRule,
    ConditionalAppearance,
} from '../../../../../../helpers/listSettings/facets/conditionalFormatting/types'
import type {
    SelectionNode,
    SelectionFlatRow,
    SelectionCondition,
    SelectionGroup,
    SelectionGroupLogic,
} from '../../../../../../helpers/listSettings/facets/selection/types'

export interface CfAppearanceEditorProps {
    appearance: ConditionalAppearance
    onChange: (appearance: ConditionalAppearance) => void
}

export interface CfAppearanceEditorState {
    expandedFont: boolean
    savedFontSettings: ConditionalAppearance['font']
}

export interface CfConditionEditorProps {
    nodes: SelectionNode[]
    onChange: (nodes: SelectionNode[]) => void
    compact?: boolean
}

export interface CfConditionEditorState {
    highlightedIds: string[]
    selectionAnchorIndex: number
    editingCell: { conditionId: string; cell: 'field' | 'comparison' | 'value' } | null
    logicMenuGroupId: string | null
    dragSource: 'selected' | null
    draggingFields: Set<string>
    isDropActive: boolean
    dropIndex: number | null
}

export interface CfPropertiesModalProps {
    rule: ConditionalFormattingRule
    onClose: () => void
    onUpdate: (patch: Partial<ConditionalFormattingRule>) => void
}

export type PropertiesTab = 'appearance' | 'condition' | 'fields'

export interface CfPropertiesModalState {
    activeTab: PropertiesTab
    presentation: string
}

export interface CfrConditionRowProps {
    row: SelectionFlatRow & { node: SelectionCondition }
    flatIndex: number
    highlightedSet: Set<string>
    editingCell: { conditionId: string; cell: 'field' | 'comparison' | 'value' } | null
    dragSource: 'selected' | null
    draggingFields: Set<string>
    isDropActive: boolean
    dropIndex: number | null
    onToggleEnabled: (id: string) => void
    onToggleHighlight: (row: SelectionFlatRow, flatIndex: number, event: MouseEvent) => void
    onBeginEditing: (conditionId: string, cell: 'field' | 'comparison' | 'value', event: MouseEvent) => void
    onStopEditing: () => void
    onUpdate?: (conditionId: string, patch: Partial<SelectionCondition>) => void
    onToggleLogicMenu?: (groupId: string, event: MouseEvent) => void
    onSetGroupLogic?: (groupId: string, logic: SelectionGroupLogic) => void
    onDragStart: (conditionId: string, flatIndex: number, event: DragEvent) => void
    onDragEnd: () => void
    onDragOver: (flatIndex: number, event: DragEvent) => void
    onDrop: (flatIndex: number, event: DragEvent) => void
}

export interface CfrGroupRowProps {
    row: SelectionFlatRow & { node: SelectionCondition | SelectionGroup }
    flatIndex: number
    highlightedSet: Set<string>
    logicMenuGroupId: string | null
    onToggleHighlight: (row: SelectionFlatRow, flatIndex: number, event: MouseEvent) => void
    onToggleEnabled: (id: string) => void
    onToggleLogicMenu: (groupId: string, event: MouseEvent) => void
    onSetGroupLogic: (groupId: string, logic: SelectionGroupLogic) => void
}

export interface CfRuleRowProps {
    rule: ConditionalFormattingRule
    index: number
    highlightedSet: Set<string>
    editingCell: { ruleId: string; cell: 'appearance' | 'condition' | 'fields' } | null
    dragSource: 'selected' | null
    draggingFields: Set<string>
    isDropActive: boolean
    dropIndex: number | null
    onToggleEnabled: (id: string) => void
    onToggleHighlight: (ruleId: string, index: number, event: MouseEvent) => void
    onBeginEditing: (ruleId: string, cell: 'appearance' | 'condition' | 'fields') => void
    onDragStart: (ruleId: string, index: number, event: DragEvent) => void
    onDragEnd: () => void
    onDragOver: (index: number, event: DragEvent) => void
    onDrop: (index: number, event: DragEvent) => void
}

export interface CfTargetFieldsEditorProps {
    rule: ConditionalFormattingRule
    onChange: (patch: { targetFields: string[] } | { applyToSubstrings: boolean }) => void
}

export const savedFieldsMap = new Map<string, string[]>()

export interface CfTargetFieldsEditorState {
    expanded: boolean
}
