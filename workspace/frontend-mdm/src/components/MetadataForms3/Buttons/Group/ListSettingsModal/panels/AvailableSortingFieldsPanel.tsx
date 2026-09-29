import { Component, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { getSortSettingsState, sortSettingsActions, subscribeListSettingsRevision, unsubscribeListSettingsRevision } from '../../../../../../helpers/listSettings'
import { writeSortingDragPayload } from '../dnd/sortingDnd'
import { applyMultiSelect } from '../shared/multiSelect'
import { FieldLine } from '../../Icon/fieldLine.icon'
import { CollapseIcon } from '../../Icon/collapse.icon'
import { HasChildrenIcon } from '../../Icon/haschildren.icon'
import { Button } from 'ui-kit'
import type {
    AvailableSortingFieldsPanelProps,
    AvailableSortingFieldsPanelState,
    SortingFieldTreeNode,
    SortingFieldTreeProps,
} from './types'
import { collectExpandableIds, collectSelectableValues } from './panels.utils'

class FieldTreeNodeView extends Component<SortingFieldTreeProps> {
    private handleDragStart = (event: React.DragEvent<HTMLDivElement>): void => {
        const { node, enableDrag, getFieldsToDrag, onDragStartFields } = this.props
        const canSelect = !node.isGroupLevel
        const canDrag = canSelect && enableDrag
        if (!canDrag) {
            event.preventDefault()
            return
        }
        const fields = getFieldsToDrag(node.value)
        writeSortingDragPayload(event, { source: 'available', fields })
        onDragStartFields(fields)
    }

    private handleClick = (event: MouseEvent<HTMLDivElement>): void => {
        event.stopPropagation()
        this.props.onSelect(this.props.node, event)
    }

    private handleDoubleClick = (event: MouseEvent<HTMLDivElement>): void => {
        event.stopPropagation()
        if (!this.props.node.isGroupLevel) {
            this.props.onActivate(this.props.node)
        }
    }

    private handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        const { node, expandedIds, onToggle, onActivate } = this.props
        const hasChildren = Boolean(node.children?.length)
        const isExpanded = expandedIds.has(node.id)
        const canSelect = !node.isGroupLevel

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (canSelect) onActivate(node)
            else if (hasChildren) onToggle(node.id)
        }
        if (event.key === 'ArrowRight' && hasChildren && !isExpanded) {
            event.preventDefault()
            onToggle(node.id)
        }
        if (event.key === 'ArrowLeft' && hasChildren && !isExpanded) {
            event.preventDefault()
            onToggle(node.id)
        }
    }

    private handleTwistClick = (event: MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation()
        this.props.onToggle(this.props.node.id)
    }

    render(): ReactNode {
        const {
            node,
            depth,
            selectedValues,
            expandedIds,
            draggingFields,
            enableDrag,
            onToggle,
            onSelect,
            onActivate,
            onDragStartFields,
            onDragEndField,
            getFieldsToDrag,
        } = this.props

        const hasChildren = Boolean(node.children?.length)
        const isExpanded = expandedIds.has(node.id)
        const canSelect = !node.isGroupLevel
        const isHighlighted = canSelect && selectedValues.has(node.value)
        const canDrag = canSelect && enableDrag
        const isDragging = canDrag && draggingFields.has(node.value)

        return (
            <li className={`tree-item level-${depth}`}>
                <div
                    className={[
                        'tree-item-row',
                        isHighlighted ? 'is-highlighted' : '',
                        node.isGroupLevel ? 'is-group' : '',
                        canDrag ? 'is-draggable' : '',
                        isDragging ? 'is-dragging' : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    style={{ paddingLeft: `${depth * 20 + 10}px` }}
                    role="treeitem"
                    aria-expanded={hasChildren ? isExpanded : undefined}
                    aria-selected={isHighlighted}
                    tabIndex={0}
                    draggable={canDrag}
                    onDragStart={this.handleDragStart}
                    onDragEnd={onDragEndField}
                    onClick={this.handleClick}
                    onDoubleClick={this.handleDoubleClick}
                    onKeyDown={this.handleKeyDown}
                >
                    {hasChildren && (
                        <span
                            className="toggle-btn"
                            onClick={this.handleTwistClick}
                            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                            <CollapseIcon style={{ width: 24, height: 24, display: 'block' }} />
                        </span>
                    )}
                    <span className="field-label">
                        {hasChildren ? (
                            <HasChildrenIcon style={{ width: 20, height: 20, display: 'inline-block', marginRight: 6 }} />
                        ) : (
                            <FieldLine style={{ width: 20, height: 20, display: 'inline-block', marginRight: 6 }} />
                        )}
                        {node.label}
                    </span>
                </div>

                {hasChildren && isExpanded && (
                    <ul className="tree-children" role="group">
                        {node.children!.map((child: SortingFieldTreeNode) => (
                            <FieldTreeNodeView
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                selectedValues={selectedValues}
                                expandedIds={expandedIds}
                                draggingFields={draggingFields}
                                enableDrag={enableDrag}
                                onToggle={this.props.onToggle}
                                onSelect={this.props.onSelect}
                                onActivate={this.props.onActivate}
                                onDragStartFields={this.props.onDragStartFields}
                                onDragEndField={this.props.onDragEndField}
                                getFieldsToDrag={this.props.getFieldsToDrag}
                            />
                        ))}
                    </ul>
                )}
            </li>
        )
    }
}

export class AvailableSortingFieldsPanel extends Component<
    AvailableSortingFieldsPanelProps,
    AvailableSortingFieldsPanelState
> {
    static defaultProps: Partial<AvailableSortingFieldsPanelProps> = {
        enableDrag: true,
        title: 'Доступные поля',
    }

    private subscriberName: string
    private static instanceCounter = 0

    constructor(props: AvailableSortingFieldsPanelProps) {
        super(props)
        AvailableSortingFieldsPanel.instanceCounter += 1
        this.subscriberName = `AvailableSortingFieldsPanel-${AvailableSortingFieldsPanel.instanceCounter}`
        const store = getSortSettingsState()
        this.state = {
            highlightedValues: [],
            anchorIndex: -1,
            expandedIds: new Set(collectExpandableIds(store.availableFields)),
            draggingFields: new Set(),
        }
    }

    componentDidMount(): void {
        subscribeListSettingsRevision(this.subscriberName, () => {
            this.setState({
                expandedIds: new Set(collectExpandableIds(getSortSettingsState().availableFields)),
            })
        })
    }

    componentWillUnmount(): void {
        unsubscribeListSettingsRevision(this.subscriberName)
        this.setState({ draggingFields: new Set(), highlightedValues: [], anchorIndex: -1 })
    }

    private getAvailableTree(): SortingFieldTreeNode[] {
        const exclude = new Set(this.props.excludeFields ?? [])
        const { availableFields } = getSortSettingsState()
        const filterAvailable = (nodes: SortingFieldTreeNode[]): SortingFieldTreeNode[] =>
            nodes
                .map((node) => {
                    if (node.isGroupLevel) {
                        const filteredChildren = node.children ? filterAvailable(node.children) : []
                        return { ...node, children: filteredChildren.length > 0 ? filteredChildren : undefined }
                    }
                    if (exclude.has(node.value)) return null
                    return node
                })
                .filter((node): node is SortingFieldTreeNode => {
                    if (node === null) return false
                    if (node.isGroupLevel) {
                        return !!(node.children && node.children.length > 0)
                    }
                    return true
                })
        return filterAvailable(availableFields)
    }

    private handleToggle = (id: string): void => {
        this.setState((prev) => {
            const next = new Set(prev.expandedIds)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return { expandedIds: next }
        })
    }

    private handleSelectNode = (node: SortingFieldTreeNode, event: MouseEvent): void => {
        if (node.isGroupLevel) return

        const availableTree = this.getAvailableTree()
        const selectableValues = collectSelectableValues(availableTree)
        const clickedIndex = selectableValues.indexOf(node.value)
        const { highlightedValues } = this.state
        const { anchorIndex } = this.state
        const result = applyMultiSelect(selectableValues, highlightedValues, anchorIndex, clickedIndex, {
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
        })
        this.setState({
            highlightedValues: result.selection,
            anchorIndex: result.anchorIndex,
        })
    }

    private getFieldsToDrag = (field: string): string[] => {
        const availableTree = this.getAvailableTree()
        const selectableValues = collectSelectableValues(availableTree)
        const { highlightedValues } = this.state
        const highlightedSet = new Set(highlightedValues)
        if (highlightedSet.has(field)) {
            return selectableValues.filter((value) => highlightedSet.has(value))
        }
        return [field]
    }

    private selectHighlighted = (): void => {
        const { highlightedValues } = this.state
        if (highlightedValues.length === 0) return

        const exclude = new Set(this.props.excludeFields ?? [])
        const toAdd = highlightedValues.filter((v) => !exclude.has(v))
        if (toAdd.length === 0) return

        sortSettingsActions.addSortFields(toAdd)
        this.setState({
            highlightedValues: [],
            anchorIndex: -1,
            draggingFields: new Set(),
        })
    }

    private handleActivate = (node: SortingFieldTreeNode): void => {
        if (node.isGroupLevel) return

        const exclude = new Set(this.props.excludeFields ?? [])
        if (exclude.has(node.value)) return

        sortSettingsActions.addSortField(node.value)
        this.setState({
            highlightedValues: [],
            anchorIndex: -1,
            draggingFields: new Set(),
        })
    }

    private clearSelection = (): void => {
        this.setState({
            highlightedValues: [],
            anchorIndex: -1,
            draggingFields: new Set(),
        })
    }

    private handleBackgroundClick = (event: MouseEvent<HTMLElement>): void => {
        if (event.target === event.currentTarget) {
            this.clearSelection()
        }
    }

    private handleDragStartFields = (fields: string[]): void => {
        this.setState({ draggingFields: new Set(fields) })
    }

    private handleDragEndField = (): void => {
        this.setState({ draggingFields: new Set() })
    }

    render(): ReactNode {
        const { enableDrag = true, title = 'Доступные поля' } = this.props

        const { highlightedValues, expandedIds, draggingFields } = this.state
        const availableTree = this.getAvailableTree()
        const canSelectHighlighted = highlightedValues.length > 0

        return (
            <section className="left-panel" aria-label={title}>
                <div className="panel-header" />
                <div className="panel-actions" onClick={(event) => event.stopPropagation()}>
                    <Button
                        type="button"
                        className="action-button"
                        variant="outlined"
                        color="secondary"
                        disabled={!canSelectHighlighted}
                        onClick={this.selectHighlighted}
                    >
                        Выбрать
                    </Button>
                </div>
                <div className="tree-list" onClick={this.handleBackgroundClick}>
                    {availableTree.length > 0 ? (
                        <ul
                            className="tree-children"
                            role="tree"
                            aria-label="Дерево полей"
                            onClick={this.handleBackgroundClick}
                        >
                            {availableTree.map((node) => (
                                <FieldTreeNodeView
                                    key={node.id}
                                    node={node}
                                    depth={0}
                                    selectedValues={new Set(highlightedValues)}
                                    expandedIds={expandedIds}
                                    draggingFields={draggingFields}
                                    enableDrag={enableDrag}
                                    onToggle={this.handleToggle}
                                    onSelect={this.handleSelectNode}
                                    onActivate={this.handleActivate}
                                    onDragStartFields={this.handleDragStartFields}
                                    onDragEndField={this.handleDragEndField}
                                    getFieldsToDrag={this.getFieldsToDrag}
                                />
                            ))}
                        </ul>
                    ) : (
                        <div className="empty-state">Нет доступных полей</div>
                    )}
                </div>
            </section>
        )
    }
}
