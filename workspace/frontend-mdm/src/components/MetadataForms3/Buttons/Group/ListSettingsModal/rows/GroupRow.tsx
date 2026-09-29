import { type ReactNode } from 'react'
import { getGroupLogicLabel, SELECTION_GROUP_LOGIC_OPTIONS, type SelectionGroupLogic } from '../../../../../../helpers/listSettings'
import '../ListSettingsModal.css'
import type { SelectionGroupRowProps } from './types'

export function SelectionGroupRow({
    row,
    flatIndex,
    highlightedSet,
    logicMenuGroupId,
    onToggleHighlight,
    onToggleEnabled,
    onToggleLogicMenu,
    onSetGroupLogic,
}: SelectionGroupRowProps): ReactNode {
    const group = row.node
    const isHighlighted = highlightedSet.has(group.id)
    const menuOpen = logicMenuGroupId === group.id
    const toggleLogic = onToggleLogicMenu ?? (() => undefined)
    const setLogic = onSetGroupLogic ?? (() => undefined)

    return (
        <li
            key={group.id}
            className={[
                'selected-item',
                'selection-group',
                group.enabled ? '' : 'is-disabled',
                isHighlighted ? 'is-highlighted' : '',
            ].filter(Boolean).join(' ')}
            style={{ paddingLeft: `${8 + row.depth * 20}px` }}
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
                    onClick={(event) => toggleLogic(group.id, event)}
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
                                onClick={() => setLogic(group.id, option.value as SelectionGroupLogic)}
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
