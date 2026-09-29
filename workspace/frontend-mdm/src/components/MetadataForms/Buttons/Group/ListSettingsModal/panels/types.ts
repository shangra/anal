import type { MouseEvent } from 'react'

export interface AvailableFieldTreeNode {
    id: string
    label: string
    value: string
    isGroupLevel: boolean
    children?: AvailableFieldTreeNode[]
}

export interface AvailableFieldsPanelProps {
    fields: AvailableFieldTreeNode[]
    selectedValues: string[]
    expandedIds: Set<string>
    draggingFields: Set<string>
    showDragHint?: boolean
    enableDrag?: boolean
    title?: string
    canSelectHighlighted: boolean
    onToggle: (id: string) => void
    onSelect: (value: string, index: number, event: MouseEvent) => void
    onActivate: (value: string) => void
    onActivateMultiple: (values: string[]) => void
    onDragStartFields: (fields: string[]) => void
    onDragEndField: () => void
    getFieldsToDrag: (value: string) => string[]
    onWriteDragPayload?: (fields: string[], raw: string) => void
    onDragEnter?: (fields: string[]) => void
}

export interface AvailableFieldsPanelState {
    highlightedValues: string[]
    anchorIndex: number
    expandedIds: Set<string>
    draggingFields: Set<string>
}

export interface AvailableGroupingFieldsPanelProps {
    showDragHint?: boolean
    enableDrag?: boolean
    title?: string
    onFieldsAdded?: (fields: string[]) => void
}

export interface AvailableGroupingFieldsPanelState {
    selectedGroupFields: string[]
    disabledGroupFields: string[]
    highlightedValues: string[]
    anchorIndex: number
    expandedIds: Set<string>
    draggingFields: Set<string>
}

export interface AvailableSelectionFieldsPanelProps {
    selectedValues: string[]
    onSelectChange: (values: string[]) => void
    onActivate: (fields: string[]) => void
    onDragEnter?: (fields: string[]) => void
    title?: string
}

export interface AvailableSelectionFieldsPanelState {
    selectedGroupFields: string[]
    disabledGroupFields: string[]
    highlightedValues: string[]
    anchorIndex: number
    expandedIds: Set<string>
    draggingFields: Set<string>
}

export interface FieldTreeNodeViewProps {
    node: AvailableFieldTreeNode
    depth: number
    selectedValues: Set<string>
    expandedIds: Set<string>
    draggingFields: Set<string>
    enableDrag: boolean
    onToggle: (id: string) => void
    onSelect: (node: AvailableFieldTreeNode, event: MouseEvent) => void
    onActivate: (node: AvailableFieldTreeNode) => void
    onDragStartFields: (fields: string[]) => void
    onDragEndField: () => void
    getFieldsToDrag: (field: string) => string[]
    onWriteDragPayload?: (fields: string[], raw: string) => void
    onDragEnter?: (fields: string[]) => void
}

export interface SortingFieldTreeNode {
    id: string
    label: string
    value: string
    isGroupLevel: boolean
    children?: SortingFieldTreeNode[]
}

export interface AvailableSortingFieldsPanelProps {
    enableDrag?: boolean
    title?: string
    excludeFields?: string[]
    showDragHint?: boolean
}

export interface AvailableSortingFieldsPanelState {
    highlightedValues: string[]
    anchorIndex: number
    expandedIds: Set<string>
    draggingFields: Set<string>
}

export interface SortingFieldTreeProps {
    node: SortingFieldTreeNode
    depth: number
    selectedValues: Set<string>
    expandedIds: Set<string>
    draggingFields: Set<string>
    enableDrag: boolean
    onToggle: (id: string) => void
    onSelect: (node: SortingFieldTreeNode, event: MouseEvent) => void
    onActivate: (node: SortingFieldTreeNode) => void
    onDragStartFields: (fields: string[]) => void
    onDragEndField: () => void
    getFieldsToDrag: (field: string) => string[]
}

export interface AvailableColumnsPanelProps {
    showDragHint?: boolean
    enableDrag?: boolean
    title?: string
    /** Родительский узел (root или группа), в который добавляются выбранные колонки. */
    targetParentId?: string
    /** Идентификаторы полей, которые не должны отображаться в панели. */
    excludeFields?: string[]
    onFieldsAdded?: (fields: string[]) => void
}

export interface AvailableColumnsPanelState {
    highlightedValues: string[]
    anchorIndex: number
    expandedIds: Set<string>
    draggingFields: Set<string>
}
