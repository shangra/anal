import {
    type MouseEvent,
} from 'react'

export interface GroupingFieldOption {
    value: string
    label: string
}

export interface GroupingFieldTreeNode {
    id: string
    label: string
    value: string
    isGroupLevel: boolean
    rawType?: string
    children?: GroupingFieldTreeNode[]
}

export interface AvailableGroupingFieldsPanelProps {
    showDragHint?: boolean
    enableDrag?: boolean
    title?: string
    onFieldsAdded?: (fields:
        string[]) => void
}

export interface AvailableGroupingFieldsPanelState {
    selectedGroupFields: string[]
    disabledGroupFields: string[]
    highlightedValues: string[]
    anchorIndex: number
    expandedIds: Set<string>
    draggingFields: Set<string>
}

export interface FieldTreeProps {
    node: GroupingFieldTreeNode
    depth: number
    selectedValues: Set<string>
    expandedIds: Set<string>
    draggingFields: Set<string>
    enableDrag: boolean
    onToggle: (id: string) => void
    onSelect: (node: GroupingFieldTreeNode, event: MouseEvent) => void
    onActivate: (node: GroupingFieldTreeNode) => void
    onDragStartFields: (fields: string[]) => void
    onDragEndField: () => void
    getFieldsToDrag: (field: string) => string[]
}