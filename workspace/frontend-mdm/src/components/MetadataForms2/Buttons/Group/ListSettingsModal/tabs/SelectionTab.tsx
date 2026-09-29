import { Component, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import {
    canGroupSelectionNodes,
    canUngroupSelectionNodes,
    findNodeLocation,
    flattenSelectionForRender,
    getSelectionSettingsState,
    selectionSettingsActions,
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
    type SelectionCondition,
    type SelectionFlatRow,
} from '../../../../../../helpers/listSettings'
import { AvailableSelectionFieldsPanel } from '../panels'
import { readSelectionDragPayload, writeSelectionDragPayload } from '../dnd/selectionDnd'
import { AddFieldsModal } from '../modals'
import { FacetsToolbar, renderSelectionRow } from '../lists'
import type { SelectionEditableCell, SelectionTabState } from './types'
import '../ListSettingsModal.css'

export class SelectionTab extends Component<object, SelectionTabState> {
    private static readonly SUBSCRIBER = 'SelectionTab'

    constructor(props: object) {
        super(props)

        const store = getSelectionSettingsState()
        this.state = {
            selectionNodes: store.selectionNodes,
            availableSelectedFields: [],
            highlightedIds: [],
            selectionAnchorIndex: -1,
            addModalOpen: false,
            logicMenuGroupId: null,
            editingCell: null,
            draggingFields: new Set(),
            dragSource: null,
            dropIndex: null,
            isDropActive: false,
            availableDragFields: null,
        }
    }

    componentDidMount(): void {
        subscribeListSettingsRevision(SelectionTab.SUBSCRIBER, () => {
            this.setState({
                selectionNodes: getSelectionSettingsState().selectionNodes,
            })
        })
        document.addEventListener('mousedown', this.handleDocumentMouseDown)
        document.addEventListener('keydown', this.handleEscapeKey)
    }

    componentDidUpdate(_prevProps: object, prevState: SelectionTabState): void {
        if (prevState.selectionNodes !== this.state.selectionNodes) {
            const flatIds = new Set(
                flattenSelectionForRender(this.state.selectionNodes).map((row) => row.node.id),
            )
            const nextHighlighted = this.state.highlightedIds.filter((id) => flatIds.has(id))
            const editingGone =
                this.state.editingCell !== null && !flatIds.has(this.state.editingCell.conditionId)
            if (nextHighlighted.length !== this.state.highlightedIds.length || editingGone) {
                this.setState({
                    highlightedIds: nextHighlighted,
                    editingCell: editingGone ? null : this.state.editingCell,
                })
            }
        }
    }

    componentWillUnmount(): void {
        unsubscribeListSettingsRevision(SelectionTab.SUBSCRIBER)
        document.removeEventListener('mousedown', this.handleDocumentMouseDown)
        document.removeEventListener('keydown', this.handleEscapeKey)
    }

    private handleDragStart = (id: string, flatIndex: number, event: DragEvent): void => {
        event.dataTransfer.effectAllowed = 'move'
        const { highlightedIds } = this.state
        const fieldsToDrag = highlightedIds.includes(id) ? highlightedIds : [id]
        writeSelectionDragPayload(event, fieldsToDrag)
        this.setState({ draggingFields: new Set(fieldsToDrag), dragSource: 'selected', highlightedIds: fieldsToDrag })
    }

    private clearDragState = (): void => {
        this.setState({ draggingFields: new Set(), dragSource: null, dropIndex: null, isDropActive: false, availableDragFields: null })
    }

    private handleDragEnd = this.clearDragState

    private handleDragOver = (flatIndex: number, event: DragEvent): void => {
        event.preventDefault()
        this.setState({ dropIndex: flatIndex, isDropActive: true })
    }

    private handleDrop = (event: DragEvent): void => {
        event.preventDefault()
        const fields = this.state.availableDragFields
        if (fields && fields.length > 0) {
            selectionSettingsActions.addSelectionConditions(fields)
            this.setState({ availableDragFields: null })
            this.clearDragState()
            return
        }
        const payload = readSelectionDragPayload(event)
        if (!payload) return
        const { selectionNodes } = this.state
        const visibleIds = flattenSelectionForRender(selectionNodes).map((r) => r.node.id)
        const draggedSlice = visibleIds.slice(
            visibleIds.indexOf(payload.ids[0]),
            visibleIds.indexOf(payload.ids[payload.ids.length - 1]) + 1,
        )
        if (draggedSlice.length > 0) {
            selectionSettingsActions.moveSelectionNodes(draggedSlice, 'down')
        }
        this.clearDragState()
    }

    private handleDocumentMouseDown = (event: Event): void => {
        const target = event.target as HTMLElement | null
        const patch: Partial<SelectionTabState> = {}
        if (!target?.closest('.selection-logic-menu, .selection-group-label')) {
            if (this.state.logicMenuGroupId) patch.logicMenuGroupId = null
        }
        if (this.state.editingCell && !target?.closest('.selection-condition-editor, .selection-condition, .selection-editor-wrapper')) {
            patch.editingCell = null
        }
        if (Object.keys(patch).length > 0) this.setState(patch as Pick<SelectionTabState, keyof typeof patch>)
    }

    private handleEscapeKey = (event: Event): void => {
        const keyboardEvent = event as unknown as KeyboardEvent
        if (keyboardEvent.key !== 'Escape') return

        if (this.state.editingCell) {
            this.setState({ editingCell: null })
            return
        }
        if (this.state.logicMenuGroupId) {
            this.setState({ editingCell: null })
            return
        }
        if (this.state.addModalOpen) {
            this.closeAddModal()
        }
    }

    private stopEditing = (): void => {
        if (this.state.editingCell) {
            this.setState({ editingCell: null })
        }
    }

    private beginEditingCell = (conditionId: string, cell: SelectionEditableCell, event: MouseEvent): void => {
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
            return
        }
        event.stopPropagation()
        this.setState({ editingCell: { conditionId, cell }, highlightedIds: [conditionId], logicMenuGroupId: null })
    }

    private openAddModal = (): void => this.setState({ addModalOpen: true })
    private closeAddModal = (): void => this.setState({ addModalOpen: false })

    private handleAvailableSelectChange = (values: string[]): void => {
        this.setState({ availableSelectedFields: values })
    }

    private handleAddFromAvailable = (fields: string[]): void => {
        selectionSettingsActions.addSelectionConditions(fields)
        this.setState({ availableSelectedFields: [] })
    }

    private handleSelectRow = (row: SelectionFlatRow, flatIndex: number, event: MouseEvent): void => {
        event.stopPropagation()
        const target = event.target as HTMLElement
        if (target.closest('.selection-condition-editor, .selection-editor-wrapper')) return
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'BUTTON') return
        const { selectionNodes, highlightedIds, selectionAnchorIndex } = this.state
        const ids = flattenSelectionForRender(selectionNodes).map((item) => item.node.id)
        if (event.shiftKey && selectionAnchorIndex >= 0) {
            const from = Math.min(selectionAnchorIndex, flatIndex)
            const to = Math.max(selectionAnchorIndex, flatIndex)
            this.setState({ highlightedIds: ids.slice(from, to + 1), logicMenuGroupId: null, editingCell: null })
            return
        }
        if (event.ctrlKey || event.metaKey) {
            const set = new Set(highlightedIds)
            if (set.has(row.node.id)) set.delete(row.node.id)
            else set.add(row.node.id)
            this.setState({ highlightedIds: ids.filter((id) => set.has(id)), selectionAnchorIndex: flatIndex, logicMenuGroupId: null, editingCell: null })
            return
        }
        this.setState({ highlightedIds: [row.node.id], selectionAnchorIndex: flatIndex, logicMenuGroupId: null, editingCell: null })
    }

    private handleSelectedBackgroundClick = (): void => {
        this.setState({ highlightedIds: [], selectionAnchorIndex: -1, logicMenuGroupId: null, editingCell: null })
    }

    private handleListDragOver = (event: DragEvent): void => {
        event.preventDefault()
        this.setState({ isDropActive: true })
    }

    private handleListDrop = (event: DragEvent): void => {
        event.preventDefault()
        const fields = this.state.availableDragFields
        if (fields && fields.length > 0) {
            selectionSettingsActions.addSelectionConditions(fields)
            this.setState({ availableDragFields: null })
            this.clearDragState()
            return
        }
        const payload = readSelectionDragPayload(event)
        if (!payload) {
            this.clearDragState()
            return
        }
        const { selectionNodes } = this.state
        const visibleIds = flattenSelectionForRender(selectionNodes).map((r) => r.node.id)
        const draggedSlice = visibleIds.slice(
            visibleIds.indexOf(payload.ids[0]),
            visibleIds.indexOf(payload.ids[payload.ids.length - 1]) + 1,
        )
        if (draggedSlice.length > 0) {
            selectionSettingsActions.moveSelectionNodes(draggedSlice, 'down')
        }
        this.clearDragState()
    }

    private handleDeleteHighlighted = (): void => {
        const { highlightedIds } = this.state
        if (highlightedIds.length === 0) return
        selectionSettingsActions.removeSelectionNodes(highlightedIds)
        this.setState({ highlightedIds: [], selectionAnchorIndex: -1, logicMenuGroupId: null })
    }

    private handleMoveHighlightedUp = (): void => {
        selectionSettingsActions.moveSelectionNodes(this.state.highlightedIds, 'up')
    }

    private handleMoveHighlightedDown = (): void => {
        selectionSettingsActions.moveSelectionNodes(this.state.highlightedIds, 'down')
    }

    private handleGroupOrUngroup = (): void => {
        const { selectionNodes, highlightedIds } = this.state
        if (canUngroupSelectionNodes(selectionNodes, highlightedIds)) {
            selectionSettingsActions.ungroupSelectionNodes(highlightedIds)
            this.setState({ highlightedIds: [], selectionAnchorIndex: -1 })
            return
        }
        if (canGroupSelectionNodes(selectionNodes, highlightedIds)) {
            selectionSettingsActions.groupSelectionNodes(highlightedIds, 'and')
            this.setState({ highlightedIds: [], selectionAnchorIndex: -1 })
        }
    }

    private toggleLogicMenu = (groupId: string, event: MouseEvent): void => {
        event.stopPropagation()
        this.setState((state) => ({
            logicMenuGroupId: state.logicMenuGroupId === groupId ? null : groupId,
            highlightedIds: [groupId],
        }))
    }

    private handleSetGroupLogic = (groupId: string, logic: 'and' | 'or' | 'not'): void => {
        selectionSettingsActions.setSelectionGroupLogic(groupId, logic)
        this.setState({ logicMenuGroupId: null })
    }

    private getMoveFlags(highlightedIds: string[]): { canMoveUp: boolean; canMoveDown: boolean } {
        const { selectionNodes } = this.state
        if (highlightedIds.length === 0) return { canMoveUp: false, canMoveDown: false }
        const locations = highlightedIds.map((id) => findNodeLocation(selectionNodes, id)).filter((loc): loc is NonNullable<typeof loc> => loc !== null)
        if (locations.length === 0) return { canMoveUp: false, canMoveDown: false }
        const parentId = locations[0].parentId
        if (!locations.every((loc) => loc.parentId === parentId)) return { canMoveUp: false, canMoveDown: false }
        const indices = locations.map((loc) => loc.index).sort((a, b) => a - b)
        const siblings = locations[0].parentChildren
        return { canMoveUp: indices[0] > 0, canMoveDown: indices[indices.length - 1] < siblings.length - 1 }
    }

    render(): ReactNode {
        const { selectionNodes, availableSelectedFields, highlightedIds, addModalOpen, isDropActive } = this.state
        const highlightedSet = new Set(highlightedIds)
        const flatRows = flattenSelectionForRender(selectionNodes)
        const { canMoveUp, canMoveDown } = this.getMoveFlags(highlightedIds)
        const canDelete = highlightedIds.length > 0
        const canUngroup = canUngroupSelectionNodes(selectionNodes, highlightedIds)
        const canGroup = canGroupSelectionNodes(selectionNodes, highlightedIds)
        const groupActionEnabled = canUngroup || canGroup
        const groupActionLabel = canUngroup ? 'Разгруппировать условия' : 'Сгруппировать условия'

        return (
            <div className="settings-content">
                <AvailableSelectionFieldsPanel
                    selectedValues={availableSelectedFields}
                    onSelectChange={this.handleAvailableSelectChange}
                    onActivate={this.handleAddFromAvailable}
                    onDragEnter={(fields: string[]) => this.setState({ availableDragFields: fields })}
                />

                <section
                    className={isDropActive ? 'right-panel drop-active' : 'right-panel'}
                    aria-label="Условия отбора"
                    onDragOver={(event) => {
                        event.preventDefault()
                        this.setState({ isDropActive: true })
                    }}
                >
                    <FacetsToolbar
                        onAdd={this.openAddModal}
                        onAddLabel="Добавить"
                        onDelete={this.handleDeleteHighlighted}
                        onDeleteDisabled={!canDelete}
                        onMoveUp={this.handleMoveHighlightedUp}
                        onMoveUpDisabled={!canMoveUp}
                        onMoveDown={this.handleMoveHighlightedDown}
                        onMoveDownDisabled={!canMoveDown}
                        onGroupOrUngroup={this.handleGroupOrUngroup}
                        groupActionLabel={groupActionLabel}
                        groupActionDisabled={!groupActionEnabled}
                        showGroupButton
                    />

                    <div className="selected-list-wrapper" onClick={this.handleSelectedBackgroundClick}>
                        <div className="selection-table-header" aria-hidden>
                            <span className="selection-table-header__check" /><span>Поле</span><span>Вид сравнения</span><span>Значение</span>
                        </div>
                        <ul
                            className="selected-list selection-conditions-list"
                            onDragOver={this.handleListDragOver}
                            onDrop={this.handleListDrop}
                        >
                            {flatRows.length === 0 && <li className="empty-state">Выберите поле слева или нажмите «Добавить»</li>}
                            {flatRows.map((row: SelectionFlatRow, flatIndex: number) => renderSelectionRow({
                                row,
                                flatIndex,
                                highlightedSet,
                                editingCell: this.state.editingCell,
                                logicMenuGroupId: this.state.logicMenuGroupId,
                                dragSource: this.state.dragSource,
                                draggingFields: this.state.draggingFields,
                                isDropActive: this.state.isDropActive,
                                dropIndex: this.state.dropIndex,
                                onToggleHighlight: this.handleSelectRow,
                                onToggleEnabled: (id: string) => selectionSettingsActions.toggleSelectionNodeEnabled(id),
                                onBeginEditing: this.beginEditingCell,
                                onStopEditing: this.stopEditing,
                                onUpdate: (conditionId: string, patch: Partial<SelectionCondition>) => selectionSettingsActions.updateSelectionCondition(conditionId, patch),
                                onToggleLogicMenu: this.toggleLogicMenu,
                                onSetGroupLogic: this.handleSetGroupLogic,
                                onDragStart: this.handleDragStart,
                                onDragEnd: this.handleDragEnd,
                                onDragOver: this.handleDragOver,
                                onDrop: () => {},
                            }))}
                        </ul>
                    </div>
                </section>

                <AddFieldsModal
                    open={addModalOpen}
                    title="Добавить условие отбора"
                    onClose={this.closeAddModal}
                >
                    <AvailableSelectionFieldsPanel
                        selectedValues={availableSelectedFields}
                        onSelectChange={this.handleAvailableSelectChange}
                        onActivate={(fields: string[]) => { this.handleAddFromAvailable(fields); this.closeAddModal() }}
                    />
                </AddFieldsModal>
            </div>
        )
    }
}
