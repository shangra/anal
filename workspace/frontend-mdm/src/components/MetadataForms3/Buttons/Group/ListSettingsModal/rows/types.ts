import type { MouseEvent, DragEvent } from 'react'
import type { SelectionNode, SelectionFlatRow, SelectionCondition, SelectionGroup, SelectionGroupLogic } from '../../../../../../helpers/listSettings/facets/selection/types'

export interface SelectionConditionRowProps {
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
    onDragStart: (conditionId: string, flatIndex: number, event: DragEvent) => void
    onDragEnd: () => void
    onDragOver: (flatIndex: number, event: DragEvent) => void
    onDrop: (flatIndex: number, event: DragEvent) => void
}

export interface SelectionGroupRowProps {
    row: SelectionFlatRow & { node: SelectionGroup }
    flatIndex: number
    highlightedSet: Set<string>
    logicMenuGroupId: string | null
    onToggleHighlight: (row: SelectionFlatRow, flatIndex: number, event: MouseEvent) => void
    onToggleEnabled: (id: string) => void
    onToggleLogicMenu?: (groupId: string, event: MouseEvent) => void
    onSetGroupLogic?: (groupId: string, logic: SelectionGroupLogic) => void
}

export interface ValueEditorProps {
    condition: SelectionCondition
    isEditing: boolean
    onBeginEditing: (conditionId: string, cell: 'value', event: MouseEvent) => void
    onStopEditing: () => void
    onUpdate?: (conditionId: string, patch: Partial<SelectionCondition>) => void
}

export interface SelectionRowRendererProps {
    row: SelectionFlatRow
    flatIndex: number
    highlightedSet: Set<string>
    editingCell: { conditionId: string; cell: 'field' | 'comparison' | 'value' } | null
    logicMenuGroupId: string | null
    dragSource: 'selected' | null
    draggingFields: Set<string>
    isDropActive: boolean
    dropIndex: number | null
    onToggleHighlight: (row: SelectionFlatRow, flatIndex: number, event: MouseEvent) => void
    onToggleEnabled: (id: string) => void
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
