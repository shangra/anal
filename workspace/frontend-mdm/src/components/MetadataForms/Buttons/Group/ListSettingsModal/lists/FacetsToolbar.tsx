import { type ReactNode } from 'react'
import { IconButton, ArrowDownIcon, ArrowUpIcon, PlusIcon, DeleteIcon, Button } from 'ui-kit'
import { ObjectUngroupIcon } from '../../Icon/objectUngroup.icon.js'
import type { FacetsToolbarProps } from './types'
import '../ListSettingsModal.css'

export function FacetsToolbar({
    onAdd,
    onAddLabel = 'Добавить',
    onDelete,
    onDeleteDisabled = false,
    onMoveUp,
    onMoveUpDisabled = false,
    onMoveDown,
    onMoveDownDisabled = false,
    onGroupOrUngroup,
    groupActionLabel = 'Сгруппировать условия',
    groupActionDisabled = false,
    showGroupButton = false,
    onProperties,
    propertiesDisabled = false,
    compact = false,
}: FacetsToolbarProps): ReactNode {
    return (
        <div
            className={`toolbar${compact ? ' toolbar--compact' : ''}`}
            onClick={(event) => event.stopPropagation()}
        >
            <Button
                variant="outlined"
                color="success"
                onClick={onAdd}
                leftIcon={PlusIcon}
                size={compact ? 'small' : 'medium'}
                title={onAddLabel}
            >
                {compact ? '' : onAddLabel}
            </Button>

            {showGroupButton && onGroupOrUngroup && (
                <Button
                    variant="outlined"
                    color="secondary"
                    disabled={groupActionDisabled}
                    onClick={onGroupOrUngroup}
                    leftIcon={ObjectUngroupIcon}
                    size={compact ? 'small' : 'medium'}
                    title={groupActionLabel}
                >
                    {compact ? '' : groupActionLabel}
                </Button>
            )}

            {onProperties && (
                <Button
                    variant="outlined"
                    color="primary"
                    disabled={propertiesDisabled}
                    onClick={onProperties}
                    leftIcon={PlusIcon}
                    size={compact ? 'small' : 'medium'}
                >
                    Свойства элемента
                </Button>
            )}

            <Button
                variant="outlined"
                color="error"
                disabled={onDeleteDisabled}
                onClick={onDelete}
                leftIcon={DeleteIcon}
                size={compact ? 'small' : 'medium'}
                title="Удалить"
            />

            <IconButton
                size={compact ? 'small' : 'medium'}
                color="secondary"
                disabled={onMoveUpDisabled}
                onClick={onMoveUp}
                icon={ArrowUpIcon}
                variant='outlined'
                aria-label="Переместить вверх"
            />

            <IconButton
                size={compact ? 'small' : 'medium'}
                color="secondary"
                disabled={onMoveDownDisabled}
                onClick={onMoveDown}
                variant='outlined'
                icon={ArrowDownIcon}
                aria-label="Переместить вниз"
            />
            <span className="spacer" />
        </div>
    )
}
