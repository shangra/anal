export interface FacetsToolbarProps {
    onAdd: () => void
    onAddLabel?: string
    onDelete: () => void
    onDeleteDisabled?: boolean
    onMoveUp: () => void
    onMoveUpDisabled?: boolean
    onMoveDown: () => void
    onMoveDownDisabled?: boolean
    onGroupOrUngroup?: () => void
    groupActionLabel?: string
    groupActionDisabled?: boolean
    showGroupButton?: boolean
    onProperties?: () => void
    propertiesDisabled?: boolean
    propertiesColorValue?: string
    onPropertiesColorChange?: (color: string | null) => void
    compact?: boolean
}
