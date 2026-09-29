import { Component, type MouseEvent, type ReactNode } from 'react'
import { getListSettingsState } from '../../../../../../helpers/grouping.helper'
import {
    groupingSettingsActions,
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
} from '../../../../../../helpers/listSettings'
import '../ListSettingsModal.css'
import { buildGroupingFieldsTree } from '../shared/utils'
import type { GroupingFieldTreeNode } from '../shared/types'
import { applyMultiSelect } from '../shared/multiSelect'
import { AvailableFieldsPanel } from './AvailableFieldsPanel'
import { collectSelectableValues, collectExpandableIds } from './panels.utils'
import type {
    AvailableGroupingFieldsPanelProps,
    AvailableGroupingFieldsPanelState,
} from './types'
import type { AvailableFieldTreeNode } from './types'

function toAvailableTreeNode(node: GroupingFieldTreeNode): AvailableFieldTreeNode {
    return {
        id: node.id,
        label: node.label,
        value: node.value,
        isGroupLevel: node.isGroupLevel,
        children: node.children?.map(toAvailableTreeNode),
    }
}

export class AvailableGroupingFieldsPanel extends Component<
    AvailableGroupingFieldsPanelProps,
    AvailableGroupingFieldsPanelState
> {
    private subscriberName: string
    private static instanceCounter = 0

    static defaultProps: Partial<AvailableGroupingFieldsPanelProps> = {
        showDragHint: false,
        enableDrag: true,
        title: 'Доступные поля',
    }

    constructor(props: AvailableGroupingFieldsPanelProps) {
        super(props)
        AvailableGroupingFieldsPanel.instanceCounter += 1
        this.subscriberName = `AvailableGroupingFieldsPanel-${AvailableGroupingFieldsPanel.instanceCounter}`
        const store = getListSettingsState()
        this.state = {
            selectedGroupFields: store.selectedGroupFields,
            disabledGroupFields: store.disabledGroupFields,
            highlightedValues: [],
            anchorIndex: -1,
            expandedIds: new Set(),
            draggingFields: new Set(),
        }
    }

    componentDidMount(): void {
        subscribeListSettingsRevision(this.subscriberName, () => {
            const store = getListSettingsState()
            this.setState(
                {
                    selectedGroupFields: store.selectedGroupFields,
                    disabledGroupFields: store.disabledGroupFields,
                },
                () => this.syncTreeDerivedState(),
            )
        })
        this.syncTreeDerivedState()
    }

    componentDidUpdate(
        _prevProps: AvailableGroupingFieldsPanelProps,
        prevState: AvailableGroupingFieldsPanelState,
    ): void {
        if (
            prevState.selectedGroupFields !== this.state.selectedGroupFields ||
            prevState.disabledGroupFields !== this.state.disabledGroupFields
        ) {
            this.syncTreeDerivedState()
        }
    }

    componentWillUnmount(): void {
        unsubscribeListSettingsRevision(this.subscriberName)
    }

    private getAvailableTree(): AvailableFieldTreeNode[] {
        const { selectedGroupFields, disabledGroupFields } = this.state
        const disabled = new Set(disabledGroupFields)
        const activeGroupFields = selectedGroupFields.filter((f) => !disabled.has(f))
        const rawTree = buildGroupingFieldsTree(selectedGroupFields, activeGroupFields)
        return rawTree.map(toAvailableTreeNode)
    }

    private syncTreeDerivedState = (): void => {
        const availableTree = this.getAvailableTree()
        const selectableValues = collectSelectableValues(availableTree)
        const available = new Set(selectableValues)

        this.setState((prev) => {
            const nextHighlighted = prev.highlightedValues.filter((v) => available.has(v))
            return {
                expandedIds: new Set(collectExpandableIds(availableTree)),
                highlightedValues:
                    nextHighlighted.length === prev.highlightedValues.length
                        ? prev.highlightedValues
                        : nextHighlighted,
            }
        })
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
        const availableTree = this.getAvailableTree()
        const selectableValues = collectSelectableValues(availableTree)
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
        const availableTree = this.getAvailableTree()
        const selectableValues = collectSelectableValues(availableTree)
        const highlightedSet = new Set(this.state.highlightedValues)
        if (highlightedSet.has(field)) {
            return selectableValues.filter((value: string) => highlightedSet.has(value))
        }
        return [field]
    }

    private handleActivate = (value: string): void => {
        groupingSettingsActions.addGroupFields([value])
        this.setState({
            highlightedValues: [],
            anchorIndex: -1,
        })
        this.props.onFieldsAdded?.([value])
    }

    private handleActivateMultiple = (values: string[]): void => {
        if (values.length === 0) return
        groupingSettingsActions.addGroupFields(values)
        this.setState({
            highlightedValues: [],
            anchorIndex: -1,
        })
        this.props.onFieldsAdded?.(values)
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
                selectedValues={this.state.selectedGroupFields}
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
