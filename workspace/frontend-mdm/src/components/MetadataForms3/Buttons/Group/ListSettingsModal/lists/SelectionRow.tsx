import { type ReactNode } from 'react'
import { SelectionConditionRow, SelectionGroupRow } from '../rows'
import type { SelectionRowRendererProps } from '../rows'
import '../ListSettingsModal.css'

export function renderSelectionRow({
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
}: SelectionRowRendererProps): ReactNode {
    if (row.type === 'group') {
        return (
            <SelectionGroupRow
                row={row}
                flatIndex={flatIndex}
                highlightedSet={highlightedSet}
                logicMenuGroupId={logicMenuGroupId}
                onToggleHighlight={onToggleHighlight}
                onToggleEnabled={onToggleEnabled}
                onToggleLogicMenu={onToggleLogicMenu ?? (() => undefined)}
                onSetGroupLogic={onSetGroupLogic ?? (() => undefined)}
            />
        )
    }

    return (
        <SelectionConditionRow
            row={row}
            flatIndex={flatIndex}
            highlightedSet={highlightedSet}
            editingCell={editingCell}
            onToggleEnabled={onToggleEnabled}
            onToggleHighlight={onToggleHighlight}
            onBeginEditing={onBeginEditing}
            onStopEditing={onStopEditing}
            onUpdate={onUpdate}
            dragSource={dragSource}
            draggingFields={draggingFields}
            isDropActive={isDropActive}
            dropIndex={dropIndex}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
        />
    )
}
