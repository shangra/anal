import { Component, type ReactNode, type DragEvent, type MouseEvent } from 'react'
import {
    flattenSelectionForRender,
    type SelectionFlatRow,
    type SelectionNode,
    type SelectionGroupLogic,
    type SelectionCondition,
    canGroupSelectionNodes,
    canUngroupSelectionNodes,
    createSelectionCondition,
    getFieldDataType,
    isComparisonAllowedForFieldType,
    defaultComparisonForFieldType,
    findNodeById,
} from '../../../../../../helpers/listSettings'
import { updateSelectionNodeById, setSelectionGroupLogic } from '../../../../../../helpers/listSettings/facets/selection/tree'
import { FacetsToolbar } from '../lists'
import { renderCfrRow } from './CfrRows'
import { listFieldCatalog } from '../../../../../../helpers/listSettings/fields/catalog'
import '../ListSettingsModal.css'
import type { CfConditionEditorProps, CfConditionEditorState } from './types'

type SelectionNodeWithKind = SelectionNode & { kind?: string }

export class CfConditionEditor extends Component<CfConditionEditorProps, CfConditionEditorState> {
    state: CfConditionEditorState = {
        highlightedIds: [],
        selectionAnchorIndex: -1,
        editingCell: null,
        logicMenuGroupId: null,
        dragSource: null,
        draggingFields: new Set<string>(),
        isDropActive: false,
        dropIndex: null,
    }

    private handleSelectRow = (row: SelectionFlatRow, flatIndex: number, event: MouseEvent): void => {
        event.stopPropagation()
        const target = event.target as HTMLElement
        if (target.closest('.selection-condition-editor, .selection-editor-wrapper')) return
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'BUTTON') return

        const { highlightedIds, selectionAnchorIndex } = this.state
        const flatRows = flattenSelectionForRender(this.props.nodes)
        const ids = flatRows.map((item: SelectionFlatRow) => item.node.id)

        if (event.shiftKey && selectionAnchorIndex >= 0) {
            const from = Math.min(selectionAnchorIndex, flatIndex)
            const to = Math.max(selectionAnchorIndex, flatIndex)
            this.setState({
                highlightedIds: ids.slice(from, to + 1),
                selectionAnchorIndex: flatIndex,
                logicMenuGroupId: null,
                editingCell: null,
            })
            return
        }
        if (event.ctrlKey || event.metaKey) {
            const set = new Set(highlightedIds)
            if (set.has(row.node.id)) set.delete(row.node.id)
            else set.add(row.node.id)
            this.setState({
                highlightedIds: ids.filter((id: string) => set.has(id)),
                selectionAnchorIndex: flatIndex,
                logicMenuGroupId: null,
                editingCell: null,
            })
            return
        }
        this.setState({
            highlightedIds: [row.node.id],
            selectionAnchorIndex: flatIndex,
            logicMenuGroupId: null,
            editingCell: null,
        })
    }

    private handleSelectedBackgroundClick = (): void => {
        this.setState({ highlightedIds: [], selectionAnchorIndex: -1, logicMenuGroupId: null, editingCell: null })
    }

    private stopEditing = (): void => {
        this.setState({ editingCell: null })
    }

    private beginEditingCell = (conditionId: string, cell: 'field' | 'comparison' | 'value', event: MouseEvent): void => {
        if (event.ctrlKey || event.metaKey || event.shiftKey) return
        event.stopPropagation()
        this.setState({ editingCell: { conditionId, cell }, highlightedIds: [conditionId], logicMenuGroupId: null })
    }

    private handleDragStart = (id: string, flatIndex: number, event: DragEvent): void => {
        event.dataTransfer.effectAllowed = 'move'
        const { highlightedIds } = this.state
        const fieldsToDrag = highlightedIds.includes(id) ? highlightedIds : [id]
        this.setState({ draggingFields: new Set(fieldsToDrag), dragSource: 'selected', highlightedIds: fieldsToDrag })
    }

    private clearDragState = (): void => {
        this.setState({ draggingFields: new Set<string>(), dragSource: null, dropIndex: null, isDropActive: false })
    }

    private handleDragEnd = this.clearDragState

    private handleDragOver = (flatIndex: number, event: DragEvent): void => {
        event.preventDefault()
        this.setState({ dropIndex: flatIndex, isDropActive: true })
    }

    private handleToggleEnabled = (id: string): void => {
        const nodes = this.props.nodes.map((n: SelectionNode) =>
            n.id === id ? { ...n, enabled: !n.enabled } : n,
        )
        this.props.onChange(nodes)
    }

    private handleAddCondition = (): void => {
        const catalog = listFieldCatalog()
        const field = catalog[0]?.value ?? ''
        const newCond = createSelectionCondition(field, { comparison: 'eq', value: '' })
        this.props.onChange([...this.props.nodes, newCond])
    }

    private handleDeleteHighlighted = (): void => {
        const { highlightedIds } = this.state
        if (highlightedIds.length === 0) return
        const updated = this.removeNodes(this.props.nodes, highlightedIds)
        this.props.onChange(updated)
        this.setState({ highlightedIds: [], selectionAnchorIndex: -1, logicMenuGroupId: null })
    }

    private handleMoveHighlightedUp = (): void => {
        const { highlightedIds } = this.state
        if (highlightedIds.length === 0) return
        this.props.onChange(this.moveNodes(this.props.nodes, highlightedIds, 'up'))
    }

    private handleMoveHighlightedDown = (): void => {
        const { highlightedIds } = this.state
        if (highlightedIds.length === 0) return
        this.props.onChange(this.moveNodes(this.props.nodes, highlightedIds, 'down'))
    }

    private handleGroupOrUngroup = (): void => {
        const nodes = this.props.nodes
        const highlightedIds = this.state.highlightedIds
        if (canUngroupSelectionNodes(nodes, highlightedIds)) {
            this.props.onChange(this.ungroupNodes(nodes, highlightedIds))
            this.setState({ highlightedIds: [], selectionAnchorIndex: -1 })
            return
        }
        if (canGroupSelectionNodes(nodes, highlightedIds)) {
            this.props.onChange(this.groupNodes(nodes, highlightedIds, 'and' as SelectionGroupLogic))
            this.setState({ highlightedIds: [], selectionAnchorIndex: -1 })
        }
    }

    private toggleLogicMenu = (groupId: string, event: MouseEvent): void => {
        event.stopPropagation()
        this.setState((state: CfConditionEditorState) => ({
            logicMenuGroupId: state.logicMenuGroupId === groupId ? null : groupId,
            highlightedIds: [groupId],
        }))
    }

    private handleSetGroupLogic = (groupId: string, logic: SelectionGroupLogic): void => {
        this.props.onChange(setSelectionGroupLogic(this.props.nodes, groupId, logic))
        this.setState({ logicMenuGroupId: null })
    }

    private removeNodes(nodes: SelectionNode[], ids: string[]): SelectionNode[] {
        const idSet = new Set(ids)
        return nodes.reduce<SelectionNode[]>((acc, node) => {
            if (idSet.has(node.id)) return acc
            if (node.kind === 'group' && node.children) {
                const filtered = this.removeNodes(node.children, ids)
                if (filtered.length === 0) return acc
                return [...acc, { ...node, children: filtered }]
            }
            return [...acc, node]
        }, [])
    }

    private moveNodes(nodes: SelectionNode[], ids: string[], direction: 'up' | 'down'): SelectionNode[] {
        const flat: SelectionNode[] = []
        const flatten = (ns: SelectionNode[]) => {
            for (const n of ns) {
                flat.push(n)
                if (n.kind === 'group' && n.children) flatten(n.children)
            }
        }
        flatten(nodes)

        const visibleIds = flat.map(n => n.id)
        const startIdx = visibleIds.indexOf(ids[0])
        const endIdx = visibleIds.indexOf(ids[ids.length - 1])
        const delta = direction === 'up' ? -1 : 1
        const newStart = startIdx + delta
        const newEnd = endIdx + delta
        if (newStart < 0 || newEnd >= visibleIds.length) return nodes

        const nonSelected = flat.filter((_, idx) => idx < startIdx || idx > endIdx)
        const selectedBlock = flat.slice(startIdx, endIdx + 1)

        if (direction === 'up') {
            return [...nonSelected.slice(0, delta), ...selectedBlock, ...nonSelected.slice(delta)]
        } else {
            return [...nonSelected.slice(0, nonSelected.length - delta), ...selectedBlock, ...nonSelected.slice(nonSelected.length - delta)]
        }
    }

    private groupNodes(nodes: SelectionNode[], ids: string[], logic: SelectionGroupLogic): SelectionNode[] {
        const idSet = new Set(ids)
        const children: SelectionNode[] = []
        const result: SelectionNode[] = []
        for (const node of nodes) {
            if (idSet.has(node.id)) children.push(node)
            else result.push(node)
        }
        if (children.length > 0) {
            result.push({ id: `cf-group-${Date.now()}`, kind: 'group', enabled: true, logic, children })
        }
        return result
    }

    private ungroupNodes(nodes: SelectionNode[], ids: string[]): SelectionNode[] {
        return nodes.map(node => {
            if (node.kind === 'group' && ids.includes(node.id) && node.children) return node.children
            if (node.kind === 'group' && node.children) return { ...node, children: this.ungroupNodes(node.children, ids) }
            return node
        }).flat()
    }

    private getMoveFlags(): { canMoveUp: boolean; canMoveDown: boolean } {
        const { highlightedIds } = this.state
        if (highlightedIds.length === 0) return { canMoveUp: false, canMoveDown: false }
        return { canMoveUp: true, canMoveDown: true }
    }

    private flatRows(): SelectionFlatRow[] {
        return flattenSelectionForRender(this.props.nodes)
    }

    private handleValueUpdate = (conditionId: string, patch: Partial<SelectionCondition>): void => {
        const existingNode = findNodeById(this.props.nodes, conditionId)
        if (!existingNode) return

        const nodeWithKind = existingNode as SelectionNodeWithKind
        if (nodeWithKind.kind === 'group') return

        const existingCondition = existingNode as SelectionCondition
        const updated: SelectionCondition = { ...existingCondition, ...patch }
        const oldDataType = getFieldDataType(existingCondition.field)
        const newDataType = updated.field ? getFieldDataType(updated.field) : oldDataType

        if (oldDataType !== newDataType) {
            const defaultComp = defaultComparisonForFieldType(newDataType)
            const currentComp = ('comparison' in patch && patch.comparison !== undefined)
                ? patch.comparison
                : existingCondition.comparison
            updated.comparison = isComparisonAllowedForFieldType(currentComp, newDataType)
                ? currentComp
                : defaultComp
            updated.value = ''
        }

        if (updated.comparison === 'filled' || updated.comparison === 'empty') {
            updated.value = ''
        }

        const oldNodes = this.props.nodes
        const newNodes = updateSelectionNodeById(oldNodes, conditionId, updated as SelectionCondition)
        if (oldNodes !== newNodes) {
            this.props.onChange(newNodes)
        }
    }

    render(): ReactNode {
        const nodes = this.props.nodes
        const { highlightedIds, editingCell, logicMenuGroupId, isDropActive, dropIndex } = this.state
        const flatRows = this.flatRows()
        const highlightedSet = new Set<string>(highlightedIds)
        const { canMoveUp, canMoveDown } = this.getMoveFlags()
        const canDelete = highlightedIds.length > 0
        const canUngroup = canUngroupSelectionNodes(nodes, highlightedIds)
        const groupActionEnabled = canUngroup || canGroupSelectionNodes(nodes, highlightedIds)
        const groupActionLabel = canUngroup ? 'Разгруппировать условия' : 'Сгруппировать условия'

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <FacetsToolbar
                    onAdd={this.handleAddCondition}
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
                    compact={this.props.compact}
                />

                <div className="cf-condition-editor-wrapper" onClick={this.handleSelectedBackgroundClick}>
                    <div className="selection-table-header" aria-hidden>
                        <span className="selection-table-header__check" />
                        <span>Поле</span>
                        <span>Вид сравнения</span>
                        <span>Значение</span>
                    </div>
                    <ul className="selected-list selection-conditions-list">
                        {flatRows.length === 0 && <li className="empty-state">Нажмите «Добавить»</li>}
                        {flatRows.map((row: SelectionFlatRow, flatIndex: number) => renderCfrRow({
                            row,
                            flatIndex,
                            highlightedSet,
                            editingCell,
                            logicMenuGroupId,
                            dragSource: this.state.dragSource,
                            draggingFields: this.state.draggingFields,
                            isDropActive,
                            dropIndex,
                            onToggleHighlight: this.handleSelectRow,
                            onToggleEnabled: this.handleToggleEnabled,
                            onBeginEditing: this.beginEditingCell,
                            onStopEditing: this.stopEditing,
                            onUpdate: this.handleValueUpdate,
                            onToggleLogicMenu: this.toggleLogicMenu,
                            onSetGroupLogic: this.handleSetGroupLogic,
                            onDragStart: this.handleDragStart,
                            onDragEnd: this.handleDragEnd,
                            onDragOver: this.handleDragOver,
                            onDrop: () => {},
                        }))}
                    </ul>
                </div>
            </div>
        )
    }
}
