import { type ReactNode } from 'react'
import { Select } from 'ui-kit'
import {
    comparisonNeedsValue,
    getComparisonsForFieldType,
    getFieldDataType,
    getFieldLabel,
    SELECTION_COMPARISON_OPTIONS,
    getGroupLogicLabel,
    SELECTION_GROUP_LOGIC_OPTIONS,
    type SelectionCondition,
    type SelectionGroup,
    type SelectionGroupLogic,
    type SelectionFlatRow,
} from '../../../../../../helpers/listSettings'
import { ValueEditor } from '../rows/ValueEditor'
import { buildComparisonOptions, buildFieldOptions } from '../rows/ConditionRow.utils'
import '../ListSettingsModal.css'
import type { CfrConditionRowProps, CfrGroupRowProps } from './types'

export function CfrConditionRow({
    row,
    flatIndex,
    highlightedSet,
    editingCell,
    dragSource,
    draggingFields,
    isDropActive,
    dropIndex,
    onToggleEnabled,
    onToggleHighlight,
    onBeginEditing,
    onStopEditing,
    onUpdate,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
}: CfrConditionRowProps): ReactNode {
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
            style={{ '--group-indent': `${8 + row.depth * 20}px` } as React.CSSProperties}
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
                    <Select style={{ width: '100%' }} options={fieldOptions} value={condition.field} variant="contained" resettable onClick={(event) => event.stopPropagation()} onChange={(val) => { onUpdate?.(condition.id, { field: val ?? '' }); onStopEditing() }} />
                </div>
            ) : (
                <span className="selection-cell-display selection-field-select" onClick={(event) => onBeginEditing(condition.id, 'field', event)} aria-label="Редактировать поле">
                    {getFieldLabel(condition.field)}
                </span>
            )}

            {isEditing('comparison') ? (
                <div className="selection-editor-wrapper" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                    <Select style={{ width: '100%' }} options={comparisonListOptions} value={condition.comparison} variant="contained" resettable onChange={(val) => { onUpdate?.(condition.id, { comparison: (val ?? condition.comparison) as SelectionCondition['comparison'] }); onStopEditing() }} />
                </div>
            ) : (
                <span className="selection-cell-display selection-comparison-select" onClick={(event) => onBeginEditing(condition.id, 'comparison', event)} aria-label="Редактировать поле">
                    {SELECTION_COMPARISON_OPTIONS.find((o: { value: string; label: string }) => o.value === condition.comparison)?.label ?? condition.comparison}
                </span>
            )}

            {needsValue ? (
                <ValueEditor
                    condition={condition}
                    isEditing={isEditing('value')}
                    onBeginEditing={onBeginEditing}
                    onStopEditing={onStopEditing}
                    onUpdate={onUpdate}
                />
            ) : (
                <span className="selection-value-placeholder" />
            )}
        </li>
    )
}

export function CfrGroupRow({
    row,
    flatIndex,
    highlightedSet,
    logicMenuGroupId,
    onToggleHighlight,
    onToggleEnabled,
    onToggleLogicMenu,
    onSetGroupLogic,
}: CfrGroupRowProps): ReactNode {
    const group = row.node as SelectionGroup
    const isHighlighted = highlightedSet.has(group.id)
    const menuOpen = logicMenuGroupId === group.id

    return (
        <li
            key={group.id}
            className={[
                'selected-item',
                'selection-group',
                group.enabled ? '' : 'is-disabled',
                isHighlighted ? 'is-highlighted' : '',
            ].filter(Boolean).join(' ')}
            style={{ '--group-indent': `${8 + row.depth * 20}px` } as React.CSSProperties}
            onClick={(event) => onToggleHighlight(row, flatIndex, event)}
        >
            <input
                type="checkbox"
                className="checkbox"
                checked={group.enabled}
                onClick={(event) => event.stopPropagation()}
                onChange={() => onToggleEnabled(group.id)}
                aria-label={`Использовать группу: ${getGroupLogicLabel(group.logic)}`}
            />

            <div className="selection-group-label-wrap">
                <button
                    type="button"
                    className="selection-group-label"
                    onClick={(event) => onToggleLogicMenu(group.id, event)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                >
                    {getGroupLogicLabel(group.logic)}
                </button>

                {menuOpen && (
                    <div className="selection-logic-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                        {SELECTION_GROUP_LOGIC_OPTIONS.map((option: { value: SelectionGroupLogic; label: string }) => (
                            <button
                                key={option.value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={group.logic === option.value}
                                className={['selection-logic-menu__item', group.logic === option.value ? 'is-active' : ''].filter(Boolean).join(' ')}
                                onClick={() => onSetGroupLogic(group.id, option.value as SelectionGroupLogic)}
                            >
                                <span className="selection-logic-menu__check">{group.logic === option.value ? '✓' : ''}</span>
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </li>
    )
}

export function renderCfrRow({
    row,
    flatIndex,
    highlightedSet,
    editingCell,
    logicMenuGroupId,
    dragSource,
    draggingFields,
    isDropActive,
    dropIndex,
    onToggleHighlight,
    onToggleEnabled,
    onBeginEditing,
    onStopEditing,
    onUpdate,
    onToggleLogicMenu,
    onSetGroupLogic,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
}: Omit<CfrConditionRowProps, 'row' | 'flatIndex' | 'highlightedSet' | 'editingCell' | 'dragSource' | 'draggingFields' | 'isDropActive' | 'dropIndex' | 'onToggleLogicMenu' | 'onSetGroupLogic' | 'onUpdate'> & {
    row: SelectionFlatRow
    flatIndex: number
    highlightedSet: Set<string>
    editingCell: { conditionId: string; cell: 'field' | 'comparison' | 'value' } | null
    logicMenuGroupId: string | null
    dragSource: 'selected' | null
    draggingFields: Set<string>
    isDropActive: boolean
    dropIndex: number | null
    onUpdate: (conditionId: string, patch: Partial<SelectionCondition>) => void
    onToggleLogicMenu: (groupId: string, event: React.MouseEvent) => void
    onSetGroupLogic: (groupId: string, logic: SelectionGroupLogic) => void
}): ReactNode {
    if (row.node.kind === 'group') {
        return (
            <CfrGroupRow
                row={row as SelectionFlatRow & { node: SelectionCondition | SelectionGroup }}
                flatIndex={flatIndex}
                highlightedSet={highlightedSet}
                logicMenuGroupId={logicMenuGroupId}
                onToggleHighlight={onToggleHighlight}
                onToggleEnabled={onToggleEnabled}
                onToggleLogicMenu={onToggleLogicMenu}
                onSetGroupLogic={onSetGroupLogic}
            />
        )
    }

    return (
        <CfrConditionRow
            row={row as SelectionFlatRow & { node: SelectionCondition }}
            flatIndex={flatIndex}
            highlightedSet={highlightedSet}
            editingCell={editingCell}
            dragSource={dragSource}
            draggingFields={draggingFields}
            isDropActive={isDropActive}
            dropIndex={dropIndex}
            onToggleEnabled={onToggleEnabled}
            onToggleHighlight={onToggleHighlight}
            onBeginEditing={onBeginEditing}
            onStopEditing={onStopEditing}
            onUpdate={onUpdate}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
        />
    )
}
