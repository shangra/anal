import { Component, type MouseEvent, type ReactNode } from 'react'
import { getListSettingsState } from '../../../../../../helpers/grouping.helper'
import { subscribeListSettingsRevision, unsubscribeListSettingsRevision } from '../../../../../../helpers/listSettings'
import { buildGroupingFieldsTree } from '../shared/utils'
import type { GroupingFieldTreeNode } from '../shared/types'
import { AvailableFieldsPanel } from './AvailableFieldsPanel'
import '../ListSettingsModal.css'
import { collectSelectableValues, collectExpandableIds } from './panels.utils'
import type {
    AvailableSelectionFieldsPanelProps,
    AvailableSelectionFieldsPanelState,
} from './types'
import type { AvailableFieldTreeNode } from './types'

function toAvailableTreeNode(node: GroupingFieldTreeNode): AvailableFieldTreeNode {
    return {
        id: node.id,
        label: node.label,
        value: node.value,
        isGroupLevel: false,
        children: node.children?.map(toAvailableTreeNode),
    }
}

const SUBSCRIBER = 'AvailableSelectionFieldsPanel'

export class AvailableSelectionFieldsPanel extends Component<
    AvailableSelectionFieldsPanelProps,
    AvailableSelectionFieldsPanelState
> {
    private panelSubscriberName: string
    static defaultProps: Partial<AvailableSelectionFieldsPanelProps> = {
        title: 'Доступные поля',
    }
    static instanceCounter = 0

    constructor(props: AvailableSelectionFieldsPanelProps) {
        super(props)
        AvailableSelectionFieldsPanel.instanceCounter += 1
        this.panelSubscriberName = `${SUBSCRIBER}-${AvailableSelectionFieldsPanel.instanceCounter}`
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
        subscribeListSettingsRevision(this.panelSubscriberName, () => {
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
        _prevProps: AvailableSelectionFieldsPanelProps,
        prevState: AvailableSelectionFieldsPanelState,
    ): void {
        if (
            prevState.selectedGroupFields !== this.state.selectedGroupFields ||
            prevState.disabledGroupFields !== this.state.disabledGroupFields
        ) {
            this.syncTreeDerivedState()
        }
    }

    componentWillUnmount(): void {
        unsubscribeListSettingsRevision(this.panelSubscriberName)
    }

    private getAvailableTree(): AvailableFieldTreeNode[] {
        const { selectedGroupFields, disabledGroupFields } = this.state
        const disabled = new Set(disabledGroupFields)
        const activeGroupFields = selectedGroupFields.filter((f) => !disabled.has(f))
        const rawTree = buildGroupingFieldsTree(selectedGroupFields, activeGroupFields)
        return rawTree.map(toAvailableTreeNode)
    }

    private getSelectableValues(): string[] {
        const tree = this.getAvailableTree()
        return collectSelectableValues(tree)
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

    private handleSelect = (
        value: string,
        index: number,
        event: MouseEvent,
    ): void => {
        const selectableValues = this.getSelectableValues()
        const clickedIndex = selectableValues.indexOf(value)
        if (clickedIndex < 0) return

        const result = this.applyMultiSelect(
            selectableValues,
            clickedIndex,
            event,
        )
        this.setState({
            highlightedValues: result.selection,
            anchorIndex: result.anchorIndex,
        })
        this.props.onSelectChange(result.selection)
    }

    private applyMultiSelect = (
        allValues: string[],
        clickedIndex: number,
        event: MouseEvent,
    ): { selection: string[]; anchorIndex: number } => {
        const { highlightedValues, anchorIndex } = this.state
        const result: string[] = []

        if (event.shiftKey && anchorIndex >= 0) {
            const from = Math.min(anchorIndex, clickedIndex)
            const to = Math.max(anchorIndex, clickedIndex)
            return { selection: allValues.slice(from, to + 1), anchorIndex: clickedIndex }
        }
        if (event.ctrlKey || event.metaKey) {
            const set = new Set(highlightedValues)
            if (set.has(allValues[clickedIndex])) {
                set.delete(allValues[clickedIndex])
                result.push(...set)
            } else {
                set.add(allValues[clickedIndex])
                result.push(...set)
            }
            return { selection: result, anchorIndex: clickedIndex }
        }
        return { selection: [allValues[clickedIndex]], anchorIndex: clickedIndex }
    }

    private handleActivate = (value: string): void => {
        const { selectedValues, onActivate } = this.props
        const fields = selectedValues.includes(value) && selectedValues.length > 0
            ? selectedValues
            : [value]
        onActivate(fields)
        this.setState({
            highlightedValues: [],
            anchorIndex: -1,
        })
    }

    private handleActivateMultiple = (values: string[]): void => {
        this.props.onActivate(values)
        this.setState({
            highlightedValues: [],
            anchorIndex: -1,
        })
    }

    private getFieldsToDrag = (field: string): string[] => {
        const { highlightedValues } = this.state
        const set = new Set(highlightedValues)
        if (set.has(field)) {
            return highlightedValues
        }
        return [field]
    }

    private handleDragStartFields = (fields: string[]): void => {
        this.setState({ draggingFields: new Set(fields) })
    }

    private handleDragEndField = (): void => {
        this.setState({ draggingFields: new Set() })
    }

    private handleWriteDragPayload = (fields: string[], _raw: string): void => {
        this.handleDragStartFields(fields)
    }

    render(): ReactNode {
        const { selectedValues, title = 'Доступные поля' } = this.props
        const { highlightedValues, expandedIds, draggingFields } = this.state
        const availableTree = this.getAvailableTree()
        const canSelectHighlighted = highlightedValues.length > 0

        return (
            <AvailableFieldsPanel
                fields={availableTree}
                selectedValues={selectedValues}
                expandedIds={expandedIds}
                draggingFields={draggingFields}
                showDragHint
                enableDrag
                title={title}
                canSelectHighlighted={canSelectHighlighted}
                onToggle={() => {}}
                onSelect={this.handleSelect}
                onActivate={this.handleActivate}
                onActivateMultiple={this.handleActivateMultiple}
                onDragStartFields={this.handleDragStartFields}
                onDragEndField={this.handleDragEndField}
                getFieldsToDrag={this.getFieldsToDrag}
                onWriteDragPayload={this.handleWriteDragPayload}
                onDragEnter={this.props.onDragEnter!}
            />
        )
    }
}
