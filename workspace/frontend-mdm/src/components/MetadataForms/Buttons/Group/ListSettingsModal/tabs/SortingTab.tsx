import { Component, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import { Select } from 'ui-kit'
import {
    getSortSettingsState,
    sortSettingsActions,
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
} from '../../../../../../helpers/listSettings'
import { AvailableSortingFieldsPanel } from '../panels/AvailableSortingFieldsPanel'
import type { SortingFieldTreeNode } from '../panels/types'
import {
    readSortingDragPayload,
    writeSortingDragPayload,
    type SortingDragPayload,
    type SortingFieldItem,
} from '../dnd/sortingDnd'
import { applyMultiSelect } from '../shared/multiSelect'
import { AddFieldsModal } from '../modals'
import { FacetsToolbar } from '../lists'
import type { SortingTabState, SortTextFieldItem } from './types'
import '../ListSettingsModal.css'

const SORT_DIRECTION_OPTIONS: { value: 'asc' | 'desc'; label: string }[] = [
    { value: 'asc', label: 'По возрастанию' },
    { value: 'desc', label: 'По убыванию' },
]

export class SortingTab extends Component<object, SortingTabState> {
    private static readonly SUBSCRIBER = 'SortingTab'

    private static isValidFieldName(field: string): boolean {
        if (!field || typeof field !== 'string') return false
        const trimmed = field.trim()
        if (!trimmed) return false
        if (trimmed === 'undefined' || trimmed === 'null') return false
        if (trimmed.includes('undefined.') || trimmed.includes('null.')) return false
        return true
    }

    private getLabelMap = (): Map<string, string> => {
        const map = new Map<string, string>()
        const walk = (nodes: SortingFieldTreeNode[]): void => {
            for (const node of nodes) {
                if (!node.isGroupLevel) {
                    map.set(node.value, node.label)
                }
                if (node.children?.length) {
                    walk(node.children)
                }
            }
        }
        walk(getSortSettingsState().availableFields)
        return map
    }

    private getAllSortFields = (): SortTextFieldItem[] => {
        const state = getSortSettingsState()
        const labelMap = this.getLabelMap()
        const seen = new Set<string>()
        const result: SortTextFieldItem[] = []
        for (const rule of state.sortRules) {
            if (!SortingTab.isValidFieldName(rule.field) || seen.has(rule.field)) continue
            seen.add(rule.field)
            result.push({
                field: rule.field,
                label: labelMap.get(rule.field) || rule.field,
                direction: rule.direction.toLowerCase() as 'asc' | 'desc',
            })
        }
        return result
    }

    private getDisabledFields = (): Set<string> => {
        return new Set(
            getSortSettingsState().sortRules
                .filter((r) => !r.enabled)
                .map((r) => r.field),
        )
    }

    constructor(props: object) {
        super(props)
        this.state = {
            highlightedFields: [],
            selectionAnchorIndex: -1,
            draggingFields: new Set(),
            dragSource: null,
            dropIndex: null,
            isDropActive: false,
            addModalOpen: false,
            openedDirectionSelects: {},
        }
    }

    componentDidMount(): void {
        subscribeListSettingsRevision(SortingTab.SUBSCRIBER, () => {
            this.syncHighlightedFields()
        })
    }

    componentWillUnmount(): void {
        unsubscribeListSettingsRevision(SortingTab.SUBSCRIBER)
    }

    private syncHighlightedFields = (): void => {
        const existing = new Set(this.getAllSortFields().map((sf) => sf.field))
        const next = this.state.highlightedFields.filter((hf) => existing.has(hf.field))
        if (next.length !== this.state.highlightedFields.length) {
            this.setState({ highlightedFields: next })
        }
    }

    private clearDropState = (): void => {
        this.setState({
            dropIndex: null,
            isDropActive: false,
            draggingFields: new Set(),
            dragSource: null,
        })
    }

    private handleSelectRow = (
        field: string,
        label: string,
        direction: 'asc' | 'desc',
        index: number,
        event: MouseEvent,
        allFields: SortTextFieldItem[],
        highlighted: SortTextFieldItem[],
    ): void => {
        event.stopPropagation()

        const result = applyMultiSelect(
            allFields.map((sf) => sf.field),
            highlighted.map((hf) => hf.field),
            this.state.selectionAnchorIndex,
            index,
            {
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
            },
        )

        const allFieldMap = new Map(allFields.map((sf) => [sf.field, sf]))
        const selectedObjects: SortTextFieldItem[] = result.selection.map((fieldName: string) => {
            const existing = allFieldMap.get(fieldName)
            return existing || { field: fieldName, label: fieldName, direction: 'asc' }
        })

        this.setState({
            highlightedFields: selectedObjects,
            selectionAnchorIndex: result.anchorIndex,
        })
    }

    private openAddModal = (): void => {
        this.setState({ addModalOpen: true })
    }

    private closeAddModal = (): void => {
        this.setState({ addModalOpen: false })
    }

    private applyDrop = (payload: SortingDragPayload, targetIndex: number): void => {
        if (payload.source === 'available') {
            const existingFields = new Set(this.getAllSortFields().map((sf) => sf.field))
            const fieldNames = payload.fields as string[]
            const filteredFieldNames = fieldNames.filter((f) => !existingFields.has(f))
            if (filteredFieldNames.length === 0) return

            const labelMap = this.getLabelMap()
            const newItems: SortTextFieldItem[] = filteredFieldNames.map((f) => ({
                field: f,
                label: labelMap.get(f) || f,
                direction: 'asc' as const,
            }))

            sortSettingsActions.addSortFields(filteredFieldNames)
            sortSettingsActions.reorderSortRules(filteredFieldNames, targetIndex)
            this.setState({ highlightedFields: newItems })
            return
        }

        if (payload.source === 'sort') {
            const items = payload.fields as SortingFieldItem[]
            const fields = items.map((item) => item.field)
            sortSettingsActions.reorderSortRules(fields, targetIndex)
            this.setState({ highlightedFields: items })
        }
    }

    private handleDeleteHighlighted = (): void => {
        const { highlightedFields } = this.state
        if (highlightedFields.length === 0) return

        const fieldsToDelete = highlightedFields.map((hf) => hf.field)
        sortSettingsActions.removeSortFields(fieldsToDelete)
        this.setState({
            highlightedFields: [],
            selectionAnchorIndex: -1,
        })
    }

    private handleMoveHighlightedUp = (): void => {
        const { highlightedFields } = this.state
        if (highlightedFields.length === 0) return

        const fieldsToMove = highlightedFields.map((hf) => hf.field)
        sortSettingsActions.moveSortRules(fieldsToMove, 'up')
        this.setState({ highlightedFields, selectionAnchorIndex: -1 })
    }

    private handleMoveHighlightedDown = (): void => {
        const { highlightedFields } = this.state
        if (highlightedFields.length === 0) return

        const fieldsToMove = highlightedFields.map((hf) => hf.field)
        sortSettingsActions.moveSortRules(fieldsToMove, 'down')
        this.setState({ highlightedFields, selectionAnchorIndex: -1 })
    }

    private handleToggleEnabled = (field: string): void => {
        sortSettingsActions.toggleSortFieldEnabled(field)
    }

    private handleDirectionOpened = (field: string, opened: boolean): void => {
        this.setState((prev) => ({
            openedDirectionSelects: {
                ...prev.openedDirectionSelects,
                [field]: opened,
            },
        }))
    }

    private startRowDrag = (event: DragEvent<HTMLTableRowElement>, item: SortTextFieldItem, index: number): void => {
        const { highlightedFields } = this.state
        const key = `${item.field}`
        const highlightedSet = new Set(highlightedFields.map((hf) => `${hf.field}`))

        const itemsToDrag = highlightedSet.has(key) ? highlightedFields : [item]
        if (!highlightedSet.has(key)) {
            this.setState({ highlightedFields: [item], selectionAnchorIndex: index })
        }
        writeSortingDragPayload(event, { source: 'sort', fields: itemsToDrag })
        this.setState({
            draggingFields: new Set(itemsToDrag.map((i) => i.field)),
            dragSource: 'sort',
        })
    }

    private handleRowDragOver = (event: DragEvent<HTMLTableRowElement>, index: number): void => {
        event.preventDefault()
        event.stopPropagation()
        const rect = event.currentTarget.getBoundingClientRect()
        const before = event.clientY < rect.top + rect.height / 2
        this.setState({ dropIndex: before ? index : index + 1, isDropActive: true })
    }

    private handleRowDrop = (event: DragEvent<HTMLTableRowElement>, index: number): void => {
        event.preventDefault()
        event.stopPropagation()
        const payload = readSortingDragPayload(event)
        const rect = event.currentTarget.getBoundingClientRect()
        const before = event.clientY < rect.top + rect.height / 2
        const targetIndex = before ? index : index + 1
        this.clearDropState()
        if (!payload) return
        this.applyDrop(payload, targetIndex)
    }

    private renderSortList = () => {
        const { highlightedFields, draggingFields, dropIndex, openedDirectionSelects } = this.state
        const sortFields = this.getAllSortFields()
        const disabledFields = this.getDisabledFields()

        const highlightedSet = new Set(highlightedFields.map((hf) => hf.field))

        return (
            <div
                className={`selected-list-wrapper${this.state.isDropActive ? ' drop-active' : ''}`}
                onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = this.state.dragSource === 'available' ? 'copy' : 'move'
                    this.setState({ isDropActive: true })
                    if (e.target === e.currentTarget) {
                        this.setState({ dropIndex: sortFields.length })
                    }
                }}
                onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                        this.setState({ isDropActive: false, dropIndex: null })
                    }
                }}
                onDrop={(e) => {
                    e.preventDefault()
                    const payload = readSortingDragPayload(e)
                    const index = this.state.dropIndex ?? sortFields.length
                    this.clearDropState()
                    if (!payload) return
                    this.applyDrop(payload, index)
                }}
            >
                <div className="list-header">Сортировка полей</div>
                {sortFields.length === 0 ? (
                    <div className="sort-drop-zone">Перетащите поле сюда или нажмите «Выбрать»</div>
                ) : (
                        <table className="grouping-table">
                            <thead className="table-header">
                                <tr>
                                    <th aria-label="Колонка сортировки" />
                                    <th>Поле</th>
                                    <th>Направление сортировки</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortFields.map((sortItem, index) => {
                                    const { field, label, direction } = sortItem
                                    const enabled = !disabledFields.has(field)
                                    const showDropLine = dropIndex === index
                                    const isHighlighted = highlightedSet.has(field)
                                    const isDragging = draggingFields.has(field)

                                    return (
                                        <tr
                                            key={field}
                                            className={[
                                                enabled ? '' : 'is-disabled',
                                                isHighlighted ? 'is-highlighted' : '',
                                                isDragging ? 'is-dragging' : '',
                                                showDropLine ? 'drop-before' : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                            draggable
                                            onDragStart={(e) => this.startRowDrag(e, sortItem, index)}
                                            onDragEnd={this.clearDropState}
                                            onDragOver={(e) => this.handleRowDragOver(e, index)}
                                            onDrop={(e) => this.handleRowDrop(e, index)}
                                            onClick={(event) =>
                                                this.handleSelectRow(
                                                    field,
                                                    label,
                                                    direction,
                                                    index,
                                                    event,
                                                    sortFields,
                                                    highlightedFields,
                                                )
                                            }
                                        >
                                            <td className="td-checkbox">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    aria-label={`Участие в сортировке: ${label}`}
                                                    checked={enabled}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onChange={() => this.handleToggleEnabled(field)}
                                                />
                                            </td>
                                            <td className="td-value">
                                                <span className="item-label">{label}</span>
                                            </td>
                                            <td className="td-direction">
                                                <Select
                                                    className={[
                                                        'direction-select',
                                                        openedDirectionSelects[field]
                                                            ? 'direction-select--open'
                                                            : 'direction-select--closed',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                    opened={!!openedDirectionSelects[field]}
                                                    onSetOpen={(opened: boolean) =>
                                                        this.handleDirectionOpened(field, opened)
                                                    }
                                                    style={{ minWidth: 140 }}
                                                    variant="outlined"
                                                    options={SORT_DIRECTION_OPTIONS}
                                                    hasSearch={false}
                                                    value={direction}
                                                    resettable
                                                    aria-label={`Направление сортировки: ${label}`}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onChange={(val) => {
                                                        const newDirection = (val ?? direction).toLowerCase() as 'asc' | 'desc'
                                                        sortSettingsActions.changeSortDirection(
                                                            field,
                                                            newDirection.toUpperCase() as 'ASC' | 'DESC',
                                                        )
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}

                                {dropIndex === sortFields.length && sortFields.length > 0 && (
                                    <tr className="selected-list__drop-end" aria-hidden />
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
        )
    }

    render(): ReactNode {
        const { addModalOpen } = this.state
        const sortFields = this.getAllSortFields()
        const { highlightedFields } = this.state

        const canDeleteHighlighted = highlightedFields.length > 0
        const indices = highlightedFields
            .map((hf) => sortFields.findIndex((sf) => sf.field === hf.field))
            .filter((i) => i >= 0)
            .sort((a, b) => a - b)
        const canMoveUp = indices.length > 0 && indices[0] > 0
        const canMoveDown = indices.length > 0 && indices[indices.length - 1] < sortFields.length - 1

        return (
            <div className="settings-content">
                <AvailableSortingFieldsPanel
                    title="Доступные поля"
                    excludeFields={sortFields.map((sf) => sf.field)}
                    showDragHint
                />

                <section
                    className={`${this.state.isDropActive ? 'right-panel drop-active' : 'right-panel'}`}
                    aria-label="Поля сортировки"
                >
                    <FacetsToolbar
                        onAdd={this.openAddModal}
                        onAddLabel="Добавить поле"
                        onDelete={this.handleDeleteHighlighted}
                        onDeleteDisabled={!canDeleteHighlighted}
                        onMoveUp={this.handleMoveHighlightedUp}
                        onMoveUpDisabled={!canMoveUp}
                        onMoveDown={this.handleMoveHighlightedDown}
                        onMoveDownDisabled={!canMoveDown}
                    />

                    {this.renderSortList()}
                </section>

                <AddFieldsModal open={addModalOpen} title="Добавить поле сортировки" onClose={this.closeAddModal}>
                    <AvailableSortingFieldsPanel
                        enableDrag={false}
                        excludeFields={sortFields.map((sf) => sf.field)}
                    />
                </AddFieldsModal>
            </div>
        )
    }
}
