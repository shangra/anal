import { Component, type ReactNode, type DragEvent, type ChangeEvent } from 'react'
import { Checkbox, Button } from 'ui-kit'
import {
    formatAppearanceSummary,
    formatTargetFieldsSummary,
    getAppearancePreviewColor,
} from '../../../../../../helpers/listSettings/facets/conditionalFormatting/types'
import { getFieldLabel } from '../../../../../../helpers/listSettings/fields/catalog'
import type { CfRuleRowProps } from './types'

export class CfRuleRow extends Component<CfRuleRowProps> {
    private handleToggleEnabled = (e: ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation()
        const { rule, onToggleEnabled } = this.props
        onToggleEnabled(rule.id)
    }

    private handleBeginEditing = (e: React.MouseEvent) => {
        e.stopPropagation()
        const { rule, onBeginEditing } = this.props
        onBeginEditing(rule.id, 'appearance')
    }

    handleDragStart = (e: DragEvent) => {
        const { rule, index, onDragStart } = this.props
        onDragStart(rule.id, index, e)
    }

    handleDragEnd = () => {
        const { onDragEnd } = this.props
        onDragEnd()
    }

    handleDragOver = (e: DragEvent) => {
        const { index, onDragOver } = this.props
        e.preventDefault()
        onDragOver(index, e)
    }

    handleDrop = (e: DragEvent) => {
        const { index, onDrop } = this.props
        e.preventDefault()
        onDrop(index, e)
    }

    handleClick = (e: React.MouseEvent) => {
        const { rule, index, onToggleHighlight } = this.props
        if (e.target instanceof HTMLElement && (
            e.target.closest('input[type="checkbox"]') ||
            e.target.closest('.cf-rule-row__checkbox') ||
            e.target.tagName === 'BUTTON'
        )) return
        onToggleHighlight(rule.id, index, e)
    }

    render(): ReactNode {
        const {
            rule,
            index,
            highlightedSet,
            editingCell,
            dragSource,
            draggingFields,
            isDropActive,
            dropIndex,
        } = this.props

        const isHighlighted = highlightedSet.has(rule.id)
        const isSelected = dragSource === 'selected' && draggingFields.has(rule.id)
        const previewColor = getAppearancePreviewColor(rule.appearance)
        const appearanceSummary = formatAppearanceSummary(rule.appearance)
        const targetFieldsText = formatTargetFieldsSummary(rule.targetFields, getFieldLabel)

        const rowStyle: React.CSSProperties = previewColor
            ? { backgroundColor: `${previewColor}18` }
            : {}

        return (
            <li
                className={[
                    'cf-rule-row',
                    'selected-item',
                    'selection-condition',
                    rule.enabled ? '' : 'is-disabled',
                    isHighlighted ? 'is-highlighted' : '',
                    isSelected ? 'is-dragging' : '',
                    dropIndex === index ? 'drop-before' : '',
                ].filter(Boolean).join(' ')}
                style={rowStyle}
                draggable
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onDragOver={this.handleDragOver}
                onDrop={this.handleDrop}
                onClick={this.handleClick}
            >
                <div className="cf-rule-row__checkbox">
                    <Checkbox
                        checked={rule.enabled}
                        onChange={this.handleToggleEnabled}
                        aria-label="Использовать правило"
                    />
                </div>

                <span className="cf-rule-row__appearance">
                    {appearanceSummary}
                    {previewColor && (
                        <span
                            className="cf-rule-row__preview-badge"
                            style={{ backgroundColor: previewColor }}
                        />
                    )}
                </span>

                <span className="cf-rule-row__condition">
                    {rule.conditionNodes.length === 0 ? 'Всегда' : 'Условие'}
                </span>

                <span className="cf-rule-row__fields" title={targetFieldsText}>
                    {targetFieldsText}
                </span>

                <Button
                    variant="text"
                    size="small"
                    title="Свойства элемента"
                    onClick={this.handleBeginEditing}
                >
                    ✎
                </Button>
            </li>
        )
    }
}
