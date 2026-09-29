import { type ReactNode } from 'react'
import type { SelectionConditionRowProps } from './types'
import { Select } from 'ui-kit'
import {
    comparisonNeedsValue,
    getComparisonsForFieldType,
    getFieldDataType,
    getFieldLabel,
    SELECTION_COMPARISON_OPTIONS,
    selectionSettingsActions,
    type SelectionCondition,
} from '../../../../../../helpers/listSettings'
import { buildComparisonOptions, buildFieldOptions } from './ConditionRow.utils'
import { ValueEditor } from './ValueEditor'
import '../ListSettingsModal.css'

export function SelectionConditionRow({
    row,
    flatIndex,
    highlightedSet,
    editingCell,
    onToggleEnabled,
    onToggleHighlight,
    onBeginEditing,
    onStopEditing,
    onUpdate,
    dragSource,
    draggingFields,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
}: SelectionConditionRowProps & { onUpdate?: (conditionId: string, patch: Partial<SelectionCondition>) => void }): ReactNode {
    const condition = row.node
    const isHighlighted = highlightedSet.has(condition.id)
    const needsValue = comparisonNeedsValue(condition.comparison)
    const fieldType = getFieldDataType(condition.field)
    const comparisonOptions = getComparisonsForFieldType(fieldType)
    const isEditing = (cell: 'field' | 'comparison' | 'value'): boolean =>
        editingCell !== null && editingCell.conditionId === condition.id && editingCell.cell === cell
    const isSelected = dragSource === 'selected' && draggingFields.has(condition.id)

    const fieldOptions = buildFieldOptions()
    const comparisonListOptions = buildComparisonOptions(comparisonOptions.map((o): string => o.value))

        return (
            <li
                key={condition.id}
                className={[
                    'selected-item',
                    'selection-condition',
                    condition.enabled ? '' : 'is-disabled',
                    isHighlighted ? 'is-highlighted' : '',
                    isSelected ? 'is-dragging' : '',
                ].filter(Boolean).join(' ')}
                style={{ ['--group-indent']: `${8 + row.depth * 20}px` } as React.CSSProperties}
                onClick={(event) => onToggleHighlight(row, flatIndex, event)}
                draggable
                onDragStart={(event) => onDragStart(condition.id, flatIndex, event)}
                onDragEnd={onDragEnd}
                onDragOver={(event) => onDragOver(flatIndex, event)}
                onDrop={(event) => onDrop(flatIndex, event)}
            >
                <input
                    type="checkbox"
                    className="checkbox"
                    checked={condition.enabled}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => onToggleEnabled(condition.id)}
                    aria-label={`Использовать отбор: ${getFieldLabel(condition.field)}`}
                />

            {isEditing('field') ? (
                <div className="selection-editor-wrapper" style={{ flex: 1, minWidth: 0 }} onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                    <Select style={{ width: '100%' }} options={fieldOptions} value={condition.field} variant="contained" resettable onClick={(event) => event.stopPropagation()} onChange={(val) => { selectionSettingsActions.updateSelectionCondition(condition.id, { field: val ?? '' }) }} />
                </div>
            ) : (
                <span className="selection-cell-display selection-field-select" onClick={(event) => onBeginEditing(condition.id, 'field', event)} aria-label="Редактировать поле">
                    {getFieldLabel(condition.field)}
                </span>
            )}

            {isEditing('comparison') ? (
                <div className="selection-editor-wrapper" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                    <Select style={{ width: '100%' }} options={comparisonListOptions} value={condition.comparison} variant="contained" resettable onChange={(val) => { selectionSettingsActions.updateSelectionCondition(condition.id, { comparison: (val ?? condition.comparison) as SelectionCondition['comparison'] }) }} />
                </div>
            ) : (
                <span className="selection-cell-display selection-comparison-select" onClick={(event) => onBeginEditing(condition.id, 'comparison', event)} aria-label="Редактировать поле">
                    {SELECTION_COMPARISON_OPTIONS.find((o: { value: string; label: string }) => o.value === condition.comparison)?.label ?? condition.comparison}
                </span>
            )}

            {needsValue ? (
                <ValueEditor condition={condition} isEditing={isEditing('value')} onBeginEditing={onBeginEditing} onStopEditing={onStopEditing} onUpdate={onUpdate} />
            ) : (
                <span className="selection-value-placeholder" />
            )}
        </li>
    )
}
