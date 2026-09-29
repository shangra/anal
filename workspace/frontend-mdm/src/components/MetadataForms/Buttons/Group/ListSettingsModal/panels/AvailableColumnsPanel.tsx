import { Component, type MouseEvent, type ReactNode } from 'react'
import {
    columnGroupingSettingsActions,
    getColumnGroupingCatalog,
    getUsedColumnFieldIds,
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
} from '../../../../../../helpers/listSettings'
import '../ListSettingsModal.css'
import { AvailableFieldsPanel } from './AvailableFieldsPanel'
import { applyMultiSelect } from '../shared/multiSelect'
import { collectExpandableIds, collectSelectableValues } from './panels.utils'
import type { AvailableColumnsPanelProps, AvailableColumnsPanelState } from './types'
import type { AvailableFieldTreeNode } from './types'
import type { GroupingFieldTreeNode } from '../shared/types'

function toAvailableTreeNode(node: GroupingFieldTreeNode): AvailableFieldTreeNode {
    return {
        id: node.id,
        label: node.label,
        value: node.value,
        isGroupLevel: node.isGroupLevel,
        children: node.children?.map(toAvailableTreeNode),
    }
}

export class AvailableColumnsPanel extends Component<
    AvailableColumnsPanelProps,
    AvailableColumnsPanelState
> {
    private subscriberName: string
    private static instanceCounter = 0

    static defaultProps: Partial<AvailableColumnsPanelProps> = {
        showDragHint: false,
        enableDrag: true,
        title: 'Доступные поля',
        targetParentId: 'root',
    }

    constructor(props: AvailableColumnsPanelProps) {
        super(props)
        AvailableColumnsPanel.instanceCounter += 1
        this.subscriberName = `AvailableColumnsPanel-${AvailableColumnsPanel.instanceCounter}`
        this.state = {
            highlightedValues: [],
            anchorIndex: -1,
            expandedIds: new Set(),
            draggingFields: new Set(),
        }
    }

    componentDidMount(): void {
        subscribeListSettingsRevision(this.subscriberName, () => {
            this.setState({
                expandedIds: new Set(collectExpandableIds(this.getAvailableTree())),
            })
        })
        this.setState({
            expandedIds: new Set(collectExpandableIds(this.getAvailableTree())),
        })
    }

    componentWillUnmount(): void {
        unsubscribeListSettingsRevision(this.subscriberName)
    }

    private getAvailableTree(): AvailableFieldTreeNode[] {
        const exclude = new Set(this.props.excludeFields ?? getUsedColumnFieldIds())
        const filterAvailable = (nodes: GroupingFieldTreeNode[]): AvailableFieldTreeNode[] =>
            nodes
                .map((node) => {
                    if (node.isGroupLevel) {
                        const filteredChildren = node.children ? filterAvailable(node.children) : []
                        return toAvailableTreeNode({
                            ...node,
                            children:
                                filteredChildren.length > 0
                                    ? (filteredChildren as unknown as GroupingFieldTreeNode[])
                                    : undefined,
                        })
                    }
                    if (exclude.has(node.value)) return null
                    return toAvailableTreeNode(node)
                })
                .filter((node): node is AvailableFieldTreeNode => {
                    if (node === null) return false
                    if (node.isGroupLevel) {
                        return !!(node.children && node.children.length > 0)
                    }
                    return true
                })
        return filterAvailable(getColumnGroupingCatalog())
    }

    private handleToggle = (id: string): void => {
        this.setState((prev) => {
            const next = new Set(prev.expandedIds)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return { expandedIds: next }
        })
    }

    private handleSelectNode = (
        value: string,
        _index: number,
        event: MouseEvent,
    ): void => {
        const selectableValues = collectSelectableValues(this.getAvailableTree())
        const clickedIndex = selectableValues.indexOf(value)
        const result = applyMultiSelect(
            selectableValues,
            this.state.highlightedValues,
            this.state.anchorIndex,
            clickedIndex,
            {
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
            },
        )
        this.setState({
            highlightedValues: result.selection,
            anchorIndex: result.anchorIndex,
        })
    }

    private getFieldsToDrag = (field: string): string[] => {
        const selectableValues = collectSelectableValues(this.getAvailableTree())
        const highlightedSet = new Set(this.state.highlightedValues)
        if (highlightedSet.has(field)) {
            return selectableValues.filter((value) => highlightedSet.has(value))
        }
        return [field]
    }

    private addColumns = (fields: string[]): void => {
        if (fields.length === 0) return
        const target = this.props.targetParentId ?? 'root'
        columnGroupingSettingsActions.addColumns(target, fields)
        this.props.onFieldsAdded?.(fields)
    }

    private handleActivate = (value: string): void => {
        this.addColumns([value])
        this.setState({ highlightedValues: [], anchorIndex: -1 })
    }

    private handleActivateMultiple = (values: string[]): void => {
        this.addColumns(values)
        this.setState({ highlightedValues: [], anchorIndex: -1 })
    }

    private handleDragStartFields = (fields: string[]): void => {
        this.setState({ draggingFields: new Set(fields) })
    }

    private handleDragEndField = (): void => {
        this.setState({ draggingFields: new Set() })
    }

    render(): ReactNode {
        const {
            showDragHint = false,
            enableDrag = true,
            title = 'Доступные поля',
        } = this.props

        const { highlightedValues, expandedIds, draggingFields } = this.state
        const availableTree = this.getAvailableTree()
        const canSelectHighlighted = highlightedValues.length > 0

        return (
            <AvailableFieldsPanel
                fields={availableTree}
                selectedValues={highlightedValues}
                expandedIds={expandedIds}
                draggingFields={draggingFields}
                showDragHint={showDragHint}
                enableDrag={enableDrag}
                title={title}
                canSelectHighlighted={canSelectHighlighted}
                onToggle={this.handleToggle}
                onSelect={this.handleSelectNode}
                onActivate={this.handleActivate}
                onActivateMultiple={this.handleActivateMultiple}
                onDragStartFields={this.handleDragStartFields}
                onDragEndField={this.handleDragEndField}
                getFieldsToDrag={this.getFieldsToDrag}
            />
        )
    }
}