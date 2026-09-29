import { Component, type MouseEvent, type ReactNode } from 'react'
import { applyMultiSelect } from '../shared/multiSelect'
import '../ListSettingsModal.css'
import { FieldTreeNodeView } from './FieldTreeNodeView'
import { collectSelectableValues } from './panels.utils'
import type { AvailableFieldsPanelProps, AvailableFieldsPanelState } from './types'

export class AvailableFieldsPanel extends Component<
    AvailableFieldsPanelProps,
    AvailableFieldsPanelState
> {
    static defaultProps: Partial<AvailableFieldsPanelProps> = {
        showDragHint: false,
        enableDrag: true,
        title: 'Доступные поля',
    }

    constructor(props: AvailableFieldsPanelProps) {
        super(props)
        this.state = {
            highlightedValues: [],
            anchorIndex: -1,
            expandedIds: new Set(props.expandedIds),
            draggingFields: new Set(props.draggingFields),
        }
    }

    componentDidUpdate(prevProps: AvailableFieldsPanelProps): void {
        if (prevProps.expandedIds !== this.props.expandedIds) {
            this.setState({ expandedIds: new Set(this.props.expandedIds) })
        }
        if (prevProps.draggingFields !== this.props.draggingFields) {
            this.setState({ draggingFields: new Set(this.props.draggingFields) })
        }
    }

    private handleToggle = (id: string): void => {
        this.setState((prev) => {
            const next = new Set(prev.expandedIds)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return { expandedIds: next }
        })
        this.props.onToggle(id)
    }

    private handleSelectNode = (
        node: AvailableFieldsPanelProps['fields'][number],
        event: MouseEvent,
    ): void => {
        if (node.isGroupLevel) return

        const selectableValues = collectSelectableValues(this.props.fields)
        const clickedIndex = selectableValues.indexOf(node.value)

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
        this.props.onSelect(node.value, clickedIndex, event)
    }

    private getFieldsToDrag = (field: string): string[] => {
        const selectableValues = collectSelectableValues(this.props.fields)
        const highlightedSet = new Set(this.state.highlightedValues)
        if (highlightedSet.has(field)) {
            return selectableValues.filter((value: string) => highlightedSet.has(value))
        }
        return [field]
    }

    private selectHighlighted = (): void => {
        const { highlightedValues } = this.state
        if (highlightedValues.length === 0) return
        this.props.onActivateMultiple(highlightedValues)
        this.setState({
            highlightedValues: [],
            anchorIndex: -1
        })
    }

    private handleActivate = (node: AvailableFieldsPanelProps['fields'][number]): void => {
        if (node.isGroupLevel) return
        this.props.onActivate(node.value)
        this.setState({
            highlightedValues: [],
            anchorIndex: -1
        })
    }

    private clearSelection = (): void => {
        this.setState({
            highlightedValues: [],
            anchorIndex: -1
        })
    }

    private handleBackgroundClick = (event: MouseEvent<HTMLElement>): void => {
        if (event.target === event.currentTarget) {
            this.clearSelection()
        }
    }

    private handleDragStartFields = (fields: string[]): void => {
        this.setState({ draggingFields: new Set(fields) })
        this.props.onDragStartFields(fields)
    }

    private handleDragEndField = (): void => {
        this.setState({ draggingFields: new Set() })
        this.props.onDragEndField()
    }

    render(): ReactNode {
        const {
            showDragHint = false,
            enableDrag = true,
            title = 'Доступные поля',
            fields,
            selectedValues,
            canSelectHighlighted,
            onWriteDragPayload,
            onDragEnter,
        } = this.props

        const { highlightedValues, expandedIds, draggingFields } = this.state
        const highlightedSet = new Set(highlightedValues)

        return (
            <section className="left-panel" aria-label={title}>
                <div
                    className="panel-header"
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        type="button"
                        className="action-button"
                        disabled={!canSelectHighlighted}
                        onClick={this.selectHighlighted}
                    >
                        Выбрать
                    </button>
                    {showDragHint && (
                        <span className="toolbar-hint">или перетащите вправо</span>
                    )}
                </div>
                <div className="tree-list" onClick={this.handleBackgroundClick}>
                    {fields.length > 0 ? (
                        <ul
                            className="tree-children"
                            role="tree"
                            aria-label="Дерево полей"
                            onClick={this.handleBackgroundClick}
                        >
                            {fields.map((node) => (
                                <FieldTreeNodeView
                                    key={node.id}
                                    node={node}
                                    depth={0}
                                    selectedValues={highlightedSet}
                                    expandedIds={expandedIds}
                                    draggingFields={draggingFields}
                                    enableDrag={enableDrag}
                                    onToggle={this.handleToggle}
                                    onSelect={this.handleSelectNode}
                                    onActivate={this.handleActivate}
                                    onDragStartFields={this.handleDragStartFields}
                                    onDragEndField={this.handleDragEndField}
                                    getFieldsToDrag={this.getFieldsToDrag}
                                    onWriteDragPayload={onWriteDragPayload}
                                    onDragEnter={onDragEnter}
                                />
                            ))}
                        </ul>
                    ) : (
                        <div className="empty-state">Все поля выбраны</div>
                    )}
                </div>
            </section>
        )
    }
}
