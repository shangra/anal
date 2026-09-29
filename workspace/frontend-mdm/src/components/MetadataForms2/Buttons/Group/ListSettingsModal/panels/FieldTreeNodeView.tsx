import { Component, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { CollapseIcon } from '../../Icon/collapse.icon'
import { FieldLine } from '../../Icon/fieldLine.icon'
import { HasChildrenIcon } from '../../Icon/haschildren.icon'
import type {  FieldTreeNodeViewProps } from './types'
import '../ListSettingsModal.css'

export class FieldTreeNodeView extends Component<FieldTreeNodeViewProps> {
    private handleDragStart = (event: React.DragEvent<HTMLDivElement>): void => {
        const {
            node,
            enableDrag,
            getFieldsToDrag,
            onDragStartFields,
            onWriteDragPayload,
            onDragEnter,
        } = this.props
        const canSelect = !node.isGroupLevel
        const canDrag = canSelect && enableDrag
        if (!canDrag) {
            event.preventDefault()
            return
        }
        const fields = getFieldsToDrag(node.value)
        const raw = JSON.stringify({ source: 'available' as const, fields })
        event.dataTransfer.effectAllowed = 'copy'
        event.dataTransfer.setData('text/plain', raw)
        if (onWriteDragPayload) onWriteDragPayload(fields, raw)
        if (onDragEnter) onDragEnter(fields)
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
            getFieldsToDrag
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
                    role='treeitem'
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
                    {hasChildren ? (
                        <span
                            className="toggle-btn"
                            onClick={this.handleTwistClick}
                            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                            <CollapseIcon style={{ width: 24, height: 24, display: 'block' }} />
                        </span>
                    ) : (
                        <span className="toggle-btn toggle-btn--leaf" aria-hidden>
                            {canDrag ? '\u283F' : ''}
                        </span>
                    )}
                    <span className='field-label'>
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
                        {node.children!.map((child) => (
                            <FieldTreeNodeView
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                selectedValues={selectedValues}
                                expandedIds={expandedIds}
                                draggingFields={draggingFields}
                                enableDrag={enableDrag}
                                onToggle={onToggle}
                                onSelect={onSelect}
                                onActivate={onActivate}
                                onDragStartFields={onDragStartFields}
                                onDragEndField={onDragEndField}
                                getFieldsToDrag={getFieldsToDrag}
                            />
                        ))}
                    </ul>
                )}
            </li>
        )
    }
}
