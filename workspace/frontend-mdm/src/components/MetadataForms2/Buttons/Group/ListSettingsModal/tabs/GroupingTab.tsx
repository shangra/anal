import { Component, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import { getListSettingsState } from '../../../../../../helpers/grouping.helper'
import { getListSettingsRevision, groupingSettingsActions, subscribeListSettingsRevision, unsubscribeListSettingsRevision } from '../../../../../../helpers/listSettings'
import { AvailableGroupingFieldsPanel } from '../panels'
import { readDragPayload, writeDragPayload } from '../dnd/groupingDnd'
import type { GroupingDragPayload } from '../dnd/groupingDnd'
import { applyMultiSelect } from '../shared/multiSelect'
import { AddFieldsModal } from '../modals'
import { FacetsToolbar } from '../lists'
import type { GroupingTabState } from './types'

export class GroupingTab extends Component<object, GroupingTabState> {
    private static readonly SUBSCRIBER = 'GroupingTab'

    constructor(props: object) {
        super(props)
        const store = getListSettingsState()
        const catalogFields = store.availableFields
        this.state = {
            selectedGroupFields: store.selectedGroupFields,
            disabledGroupFields: store.disabledGroupFields,
            availableFields: catalogFields,
            addModalOpen: false,
            highlightedSelectedFields: [],
            selectionAnchorIndex: -1,
            draggingFields: new Set(),
            dragSource: null,
            dropIndex: null,
            isDropActive: false,
            listSettingsRevision: getListSettingsRevision(),
        }
    }

    componentDidMount(): void {
        subscribeListSettingsRevision(GroupingTab.SUBSCRIBER, () => {
            const store = getListSettingsState()
            const catalogFields = store.availableFields
            this.setState({
                selectedGroupFields: store.selectedGroupFields,
                disabledGroupFields: store.disabledGroupFields,
                availableFields: catalogFields,
                listSettingsRevision: getListSettingsRevision(),
            })
        })
    }

    componentWillUnmount(): void {
        unsubscribeListSettingsRevision(GroupingTab.SUBSCRIBER)
    }

    private clearDropState = (): void => {
        this.setState({
            dropIndex: null,
            isDropActive: false,
            draggingFields: new Set(),
            dragSource: null,
        })
    }

    private getSelectedFieldsToDrag = (field: string): string[] => {
        const { selectedGroupFields, highlightedSelectedFields } = this.state
        const highlightedSet = new Set(highlightedSelectedFields)
        if (highlightedSet.has(field)) {
            return selectedGroupFields.filter((f) => highlightedSet.has(f))
        }
        return [field]
    }

    private handleSelectRow = (_field: string, index: number, event: MouseEvent): void => {
        event.stopPropagation()
        const { selectedGroupFields, highlightedSelectedFields, selectionAnchorIndex } = this.state
        const result = applyMultiSelect(
            selectedGroupFields,
            highlightedSelectedFields,
            selectionAnchorIndex,
            index,
            { ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey },
        )
        this.setState({
            highlightedSelectedFields: result.selection,
            selectionAnchorIndex: result.anchorIndex,
        })
    }

    private clearSelectedHighlight = (): void => {
        this.setState({ highlightedSelectedFields: [], selectionAnchorIndex: -1 })
    }

    private handleSelectedBackgroundClick = (event: MouseEvent<HTMLElement>): void => {
        if (event.target === event.currentTarget) {
            this.clearSelectedHighlight()
        }
    }

    private handleDeleteHighlighted = (): void => {
        const { highlightedSelectedFields } = this.state
        if (highlightedSelectedFields.length === 0) return
        groupingSettingsActions.removeGroupFields(highlightedSelectedFields)
        this.setState({ highlightedSelectedFields: [], selectionAnchorIndex: -1 })
    }

    private handleMoveHighlightedUp = (): void => {
        const { highlightedSelectedFields, selectedGroupFields } = this.state
        const indices = highlightedSelectedFields
            .map((f) => selectedGroupFields.indexOf(f))
            .filter((i) => i >= 0)
            .sort((a, b) => a - b)
        if (indices.length === 0 || indices[0] === 0) return
        groupingSettingsActions.moveGroupFields(highlightedSelectedFields, 'up')
    }

    private handleMoveHighlightedDown = (): void => {
        const { highlightedSelectedFields, selectedGroupFields } = this.state
        const indices = highlightedSelectedFields
            .map((f) => selectedGroupFields.indexOf(f))
            .filter((i) => i >= 0)
            .sort((a, b) => a - b)
        if (indices.length === 0 || indices[indices.length - 1] >= selectedGroupFields.length - 1) return
        groupingSettingsActions.moveGroupFields(highlightedSelectedFields, 'down')
    }

    private applyDrop = (payload: GroupingDragPayload, targetIndex: number): void => {
        if (payload.source === 'available') {
            groupingSettingsActions.insertGroupFields(payload.fields, targetIndex)
            return
        }
        groupingSettingsActions.reorderGroupFields(payload.fields, targetIndex)
        this.setState({ highlightedSelectedFields: payload.fields })
    }

    private handleListDragOver = (event: DragEvent<HTMLUListElement>): void => {
        event.preventDefault()
        event.dataTransfer.dropEffect = this.state.dragSource === 'selected' ? 'move' : 'copy'
        this.setState({ isDropActive: true })
        if (event.target === event.currentTarget) {
            this.setState({ dropIndex: this.state.selectedGroupFields.length })
        }
    }

    private handleListDrop = (event: DragEvent<HTMLUListElement>): void => {
        event.preventDefault()
        const payload = readDragPayload(event)
        const index = this.state.dropIndex ?? this.state.selectedGroupFields.length
        this.clearDropState()
        if (!payload) return
        this.applyDrop(payload, index)
    }

    private handleItemDragOver = (event: DragEvent<HTMLLIElement>, index: number): void => {
        event.preventDefault()
        event.stopPropagation()
        const rect = event.currentTarget.getBoundingClientRect()
        const before = event.clientY < rect.top + rect.height / 2
        this.setState({ dropIndex: before ? index : index + 1, isDropActive: true })
    }

    private handleItemDrop = (event: DragEvent<HTMLLIElement>, index: number): void => {
        event.preventDefault()
        event.stopPropagation()
        const payload = readDragPayload(event)
        const rect = event.currentTarget.getBoundingClientRect()
        const before = event.clientY < rect.top + rect.height / 2
        const targetIndex = before ? index : index + 1
        this.clearDropState()
        if (!payload) return
        this.applyDrop(payload, targetIndex)
    }

    private openAddModal = (): void => { this.setState({ addModalOpen: true }) }
    private closeAddModal = (): void => { this.setState({ addModalOpen: false }) }

    render(): ReactNode {
        const { selectedGroupFields, disabledGroupFields, availableFields, addModalOpen, highlightedSelectedFields, draggingFields, dropIndex, isDropActive } = this.state
        const labelByValue = Object.fromEntries(availableFields.map((f) => [f.value, f.label]))
        const highlightedSet = new Set(highlightedSelectedFields)
        const canDeleteHighlighted = highlightedSelectedFields.length > 0
        const highlightedIndices = highlightedSelectedFields
            .map((f) => selectedGroupFields.indexOf(f))
            .filter((i) => i >= 0)
            .sort((a, b) => a - b)
        const canMoveHighlightedUp = highlightedIndices.length > 0 && highlightedIndices[0] > 0
        const canMoveHighlightedDown = highlightedIndices.length > 0 && highlightedIndices[highlightedIndices.length - 1] < selectedGroupFields.length - 1

        return (
            <div className="settings-content">
                <AvailableGroupingFieldsPanel showDragHint />

                <section className={isDropActive ? 'right-panel drop-active' : 'right-panel'} aria-label="Поля группировки">
                    <FacetsToolbar
                        onAdd={this.openAddModal}
                        onAddLabel="Добавить поле"
                        onDelete={this.handleDeleteHighlighted}
                        onDeleteDisabled={!canDeleteHighlighted}
                        onMoveUp={this.handleMoveHighlightedUp}
                        onMoveUpDisabled={!canMoveHighlightedUp}
                        onMoveDown={this.handleMoveHighlightedDown}
                        onMoveDownDisabled={!canMoveHighlightedDown}
                    />

                    <div className="selected-list-wrapper" onClick={this.handleSelectedBackgroundClick}>
                        <div className="list-header">Группировка полей</div>
                        <ul
                            className="selected-list"
                            onClick={this.handleSelectedBackgroundClick}
                            onDragOver={this.handleListDragOver}
                            onDragLeave={(event) => {
                                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                                    this.setState({ isDropActive: false, dropIndex: null })
                                }
                            }}
                            onDrop={this.handleListDrop}
                        >
                            {selectedGroupFields.length === 0 && (
                                <li className="empty-state">Перетащите поле слева, нажмите «Выбрать» или «Добавить»</li>
                            )}

                            {selectedGroupFields.map((field, index) => {
                                const enabled = !disabledGroupFields.includes(field)
                                const showDropLine = dropIndex === index
                                const isHighlighted = highlightedSet.has(field)
                                const isDragging = draggingFields.has(field)
                                return (
                                    <li
                                        key={field}
                                        className={[
                                            'selected-item',
                                            enabled ? '' : 'is-disabled',
                                            isHighlighted ? 'is-highlighted' : '',
                                            isDragging ? 'is-dragging' : '',
                                            showDropLine ? 'drop-before' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        draggable
                                        onClick={(event) => this.handleSelectRow(field, index, event)}
                                        onDragStart={(event) => {
                                            const fields = this.getSelectedFieldsToDrag(field)
                                            writeDragPayload(event, { source: 'selected', fields })
                                            if (highlightedSet.has(field)) {
                                                this.setState({ draggingFields: new Set(fields), dragSource: 'selected' })
                                            } else {
                                                this.setState({ draggingFields: new Set(fields), dragSource: 'selected', highlightedSelectedFields: [field], selectionAnchorIndex: index })
                                            }
                                        }}
                                        onDragEnd={this.clearDropState}
                                        onDragOver={(event) => this.handleItemDragOver(event, index)}
                                        onDrop={(event) => this.handleItemDrop(event, index)}
                                    >
                                        <span className="item-grip" aria-hidden>⠿</span>
                                        <input
                                            type="checkbox"
                                            className="checkbox"
                                            checked={enabled}
                                            onClick={(event) => event.stopPropagation()}
                                            onChange={() => groupingSettingsActions.toggleGroupFieldEnabled(field)}
                                            aria-label={`Участвует в группировке: ${labelByValue[field] ?? field}`}
                                        />
                                        <span className="item-label">{labelByValue[field] ?? field}</span>
                                    </li>
                                )
                            })}
                            {dropIndex === selectedGroupFields.length && selectedGroupFields.length > 0 && (
                                <li className="selected-list__drop-end" aria-hidden />
                            )}
                        </ul>
                    </div>
                </section>

                <AddFieldsModal open={addModalOpen} title="Добавить поле группировки" onClose={this.closeAddModal}>
                    <AvailableGroupingFieldsPanel enableDrag={false} />
                </AddFieldsModal>
            </div>
        )
    }
}
