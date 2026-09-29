import { Component, type DragEvent, type MouseEvent, type ReactNode } from 'react';
import { DrawerIcon, Input, Select, CloseIcon, FolderIcon } from 'ui-kit';
import {
    childrenCountOf,
    collectColumnNodeIds,
    columnGroupingSettingsActions,
    getColumnGroupingSettingsState,
    getFlatColumnGroupRows,
    getUsedColumnFieldIds,
    indexOfNodeById,
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
    type ColumnGroupNode,
    type ColumnGroupFlatRow,
    type ColumnGroupOrientation,
} from '../../../../../../helpers/listSettings';
import { readGroupingDragPayload, writeGroupingDragPayload, type ColumnGroupingDragPayload } from '../dnd/colgroupDnd';
import { applyMultiSelect } from '../shared/multiSelect';
import { AddFieldsModal } from '../modals';
import { FacetsToolbar } from '../lists';
import { AvailableColumnsPanel } from '../panels';
import { CollapseIcon } from '../../Icon/collapse.icon';
import { DEFAULT_COLUMN_WIDTH, DEFAULT_ROW_HEIGHT } from '../../../../ElementsList/ReactWindowWrapperCombined/constants';
import type { ColumnGroupingTabState, ColumnGroupingDropTarget } from './types';
import '../ListSettingsModal.css';

const ROOT_ROW_ID = 'root';

const CELL_SIZE_STEP = 5;

function baseSizeFor(field: 'width' | 'height'): number {
    return field === 'width' ? DEFAULT_COLUMN_WIDTH : DEFAULT_ROW_HEIGHT;
}

const STRETCH_OPTIONS: { value: '0' | '1'; label: string }[] = [
    { value: '1', label: 'Авто' },
    { value: '0', label: 'Нет' },
];

function stretchToSelectValue(enabled: boolean | undefined): '0' | '1' {
    return enabled ? '1' : '0';
}

function selectValueToStretch(value: '0' | '1' | null): boolean | undefined {
    if (value === '1') return true;
    if (value === '0') return false;
    return undefined;
}

const GROUP_ORIENTATION_OPTIONS: { value: ColumnGroupOrientation; label: string }[] = [
    { value: 'horizontal', label: 'Горизонтальная' },
    { value: 'vertical', label: 'Вертикальная' },
];

function rootNode(): ColumnGroupNode {
    return getColumnGroupingSettingsState().root;
}

// ---- Row view ----

interface ColumnGroupRowViewProps {
    row: ColumnGroupFlatRow;
    highlighted: boolean;
    isDragging: boolean;
    expanding: boolean;
    isIntoDropTarget: boolean;
    isRenderLine: boolean;
    editingGroupId: string | null;
    onExpand: () => void;
    onSelect: (event: MouseEvent) => void;
    onToggleEnabled: () => void;
    onStartDrag: (event: DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
    onStartRename: () => void;
    onRenameCommit: (title: string) => void;
    onRenameCancel: () => void;
}

class ColumnGroupRowView extends Component<ColumnGroupRowViewProps> {
    render(): ReactNode {
        const { row, highlighted, isDragging, expanding, isIntoDropTarget, isRenderLine, editingGroupId } = this.props;

        const isEditing = editingGroupId === row.nodeId && row.kind === 'group';

        return (
            <div
                data-colgroup-node={row.nodeId}
                className={[
                    'grouping-row',
                    row.kind === 'group' ? 'is-group-node' : '',
                    row.kind === 'root' ? 'is-root-node' : '',
                    row.enabled ? '' : 'is-disabled',
                    highlighted ? 'is-highlighted' : '',
                    isDragging ? 'is-dragging' : '',
                    isIntoDropTarget ? 'drop-into' : '',
                    isRenderLine ? 'drop-before' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                draggable={row.kind !== 'root'}
                onClick={(event) => this.props.onSelect(event)}
                onDoubleClick={row.kind === 'group' ? this.props.onStartRename : undefined}
                onDragStart={this.props.onStartDrag}
                onDragEnd={this.props.onDragEnd}
                onDragOver={this.props.onDragOver}
                onDrop={this.props.onDrop}
            >
                <div className="grouping-cell grouping-cell--checkbox">
                    {row.hasChildren ? (
                        <span
                            className="toggle-btn"
                            onClick={(event) => {
                                event.stopPropagation();
                                this.props.onExpand();
                            }}
                            style={{ transform: expanding ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                            <CollapseIcon style={{ width: 16, height: 16, display: 'block' }} />
                        </span>
                    ) : null}

                    {row.kind === 'root' && <DrawerIcon style={{ width: 24, height: 24, display: 'inline-block' }} />}
                    {row.kind === 'group' && <FolderIcon style={{ width: 24, height: 24, display: 'inline-block'}} />}
                </div>
                <div
                    className="grouping-cell grouping-cell--value"
                    style={{ paddingLeft: `${row.depth * 16 + 12}px` }}
                    onDoubleClick={row.kind === 'group' ? this.props.onStartRename : undefined}
                >
                    {row.kind !== 'root' && (
                        <span className="item-grip" aria-hidden>
                            {'\u283F'}
                        </span>
                    )}
                    {isEditing ? (
                        <InlineRename
                            initialTitle={row.title}
                            onCommit={this.props.onRenameCommit}
                            onCancel={this.props.onRenameCancel}
                        />
                    ) : (
                        <span className={row.kind === 'group' ? 'item-label is-group-label' : 'item-label'}>{row.title}</span>
                    )}
                </div>
                <div className="grouping-cell grouping-cell--toggle">
                    {row.kind !== 'root' && (
                        <input
                            type="checkbox"
                            className="checkbox"
                            aria-label={`Участие в группировке: ${row.title}`}
                            checked={row.enabled}
                            onClick={(event) => event.stopPropagation()}
                            onChange={this.props.onToggleEnabled}
                        />
                    )}
                </div>
            </div>
        );
    }
}

class InlineRename extends Component<{
    initialTitle: string;
    onCommit: (title: string) => void;
    onCancel: () => void;
}> {
    private inputRef: HTMLInputElement | null = null;

    componentDidMount(): void {
        this.inputRef?.focus();
        this.inputRef?.select();
    }

    private handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Enter') {
            this.props.onCommit(this.inputRef?.value ?? '');
        } else if (event.key === 'Escape') {
            this.props.onCancel();
        }
    };

    render(): ReactNode {
        return (
            <input
                ref={(el) => {
                    this.inputRef = el;
                }}
                className="inline-rename-input"
                defaultValue={this.props.initialTitle}
                onBlur={(event) => this.props.onCommit(event.currentTarget.value)}
                onKeyDown={this.handleKeyDown}
            />
        );
    }
}

// ---- Tab ----

export class ColumnGroupingTab extends Component<object, ColumnGroupingTabState> {
    private static readonly SUBSCRIBER = 'ColumnGroupingTab';

    private seededColumns = false;

    constructor(props: object) {
        super(props);
        this.state = {
            highlightedNodeIds: [],
            selectionAnchor: null,
            draggingNodeIds: [],
            dragSource: null,
            dropTarget: null,
            expandedGroupIds: new Set([ROOT_ROW_ID]),
            isAddFieldsModalOpen: false,
            editingGroupId: null,
            draftWidth: '',
            draftHeight: '',
            stepDraftWidth: null,
            stepDraftHeight: null,
            draftFlexGrow: false,
            draftExpandVertical: false,
            draftGroupOrientation: undefined,
            openedAppearanceSelects: {},
        };
    }

    componentDidMount(): void {
        if (!this.seededColumns) {
            this.seededColumns = true;
            columnGroupingSettingsActions.seedColumnsFromCatalog();
        }
        subscribeListSettingsRevision(ColumnGroupingTab.SUBSCRIBER, () => {
            this.syncHighlightedNodes();
            this.forceUpdate();
        });
    }

    componentWillUnmount(): void {
        unsubscribeListSettingsRevision(ColumnGroupingTab.SUBSCRIBER);
    }

    private syncHighlightedNodes(): void {
        const liveIds = new Set(collectColumnNodeIds(rootNode()));
        const next = this.state.highlightedNodeIds.filter((id) => liveIds.has(id));
        if (next.length !== this.state.highlightedNodeIds.length) {
            this.setState({ highlightedNodeIds: next });
        }
    }

    private getFlatRows(): ColumnGroupFlatRow[] {
        const state = getColumnGroupingSettingsState();
        return getFlatColumnGroupRows(this.state.expandedGroupIds, state);
    }

    private getRowsById(): Map<string, ColumnGroupFlatRow> {
        const map = new Map<string, ColumnGroupFlatRow>();
        for (const row of this.getFlatRows()) map.set(row.nodeId, row);
        return map;
    }

    private clearDropState(): void {
        this.setState({ dropTarget: null, draggingNodeIds: [], dragSource: null });
    }

    private handleToggleExpand = (nodeId: string): void => {
        this.setState((prev) => {
            const next = new Set(prev.expandedGroupIds);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return { expandedGroupIds: next };
        });
    };

    private handleToggleEnabled = (row: ColumnGroupFlatRow): void => {
        if (row.nodeId === ROOT_ROW_ID) return;
        columnGroupingSettingsActions.toggleEnabled(row.nodeId, !row.enabled);
    };

    private getSelectableRows(): ColumnGroupFlatRow[] {
        return this.getFlatRows().filter((row) => row.nodeId !== ROOT_ROW_ID);
    }

    private handleSelectRow = (row: ColumnGroupFlatRow, event: MouseEvent): void => {
        if (row.nodeId === ROOT_ROW_ID) return;
        event.stopPropagation();

        const visibleRows = this.getSelectableRows();
        const clickedIndex = visibleRows.findIndex((r) => r.nodeId === row.nodeId);
        const anchorIndex = this.state.selectionAnchor
            ? visibleRows.findIndex((r) => r.nodeId === this.state.selectionAnchor)
            : -1;
        const result = applyMultiSelect(
            visibleRows.map((r) => r.nodeId),
            this.state.highlightedNodeIds,
            anchorIndex,
            clickedIndex,
            {
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
            },
        );

        const changed =
            result.selection.length !== this.state.highlightedNodeIds.length ||
            result.selection.some((id) => !this.state.highlightedNodeIds.includes(id));

        if (changed) {
            this.clearDrafts();
        }

        this.setState({
            highlightedNodeIds: result.selection,
            selectionAnchor: result.selection.length > 0 ? result.selection[result.selection.length - 1] : null,
        });
    };

    // Черновики настроек ячейки не должны переноситься на другие столбцы при смене выделения.
    private clearDrafts(): void {
        this.setState({
            draftWidth: '',
            draftHeight: '',
            stepDraftWidth: null,
            stepDraftHeight: null,
            draftFlexGrow: false,
            draftExpandVertical: false,
            draftGroupOrientation: undefined,
        });
    }

    // Родитель для «Создать группу» и добавления колонок: выделенная одиночная группа, иначе корень.
    private getDefaultTarget(): string {
        const { highlightedNodeIds } = this.state;
        if (highlightedNodeIds.length !== 1) return ROOT_ROW_ID;
        const nodeId = highlightedNodeIds[0];
        if (nodeId === ROOT_ROW_ID) return ROOT_ROW_ID;
        const row = this.getRowsById().get(nodeId);
        return row && row.kind === 'group' ? nodeId : ROOT_ROW_ID;
    }

    private handleCreateGroup = (): void => {
        columnGroupingSettingsActions.createGroup(this.getDefaultTarget());
    };

    private handleDeleteHighlighted = (): void => {
        const { highlightedNodeIds } = this.state;
        if (highlightedNodeIds.length === 0) return;
        const rowsById = this.getRowsById();
        // Удалять можно только группы. Удаление колонок в этом табе заблокировано.
        const groupIds = highlightedNodeIds.filter((id) => rowsById.get(id)?.kind === 'group');

        if (groupIds.length > 0) columnGroupingSettingsActions.removeGroups(groupIds);
        this.setState({ highlightedNodeIds: [], selectionAnchor: null });
    };

    private getCommonParent(): string | null {
        const { highlightedNodeIds } = this.state;
        if (highlightedNodeIds.length === 0) return null;
        const rowsById = this.getRowsById();
        const parents = new Set<string>();
        for (const id of highlightedNodeIds) {
            const row = rowsById.get(id);
            if (!row || row.nodeId === ROOT_ROW_ID) return null;
            parents.add(row.parentId ?? '');
        }
        return parents.size === 1 ? [...parents][0] : null;
    }

    private getSiblingIndexes(siblings: ColumnGroupFlatRow[]): number[] {
        return this.state.highlightedNodeIds
            .map((id) => siblings.findIndex((row) => row.nodeId === id))
            .filter((i) => i >= 0)
            .sort((a, b) => a - b);
    }

    private getSiblings(): ColumnGroupFlatRow[] {
        const parentId = this.getCommonParent();
        if (parentId === null) return [];
        return this.getFlatRows().filter((row) => row.parentId === parentId && row.nodeId !== ROOT_ROW_ID);
    }

    private canMove(direction: 'up' | 'down'): boolean {
        const siblings = this.getSiblings();
        const indexes = this.getSiblingIndexes(siblings);
        if (indexes.length === 0 || siblings.length === 0) return false;
        if (direction === 'up') return indexes[0] > 0;
        return indexes[indexes.length - 1] < siblings.length - 1;
    }

    private handleMoveHighlighted(direction: 'up' | 'down'): void {
        const parentId = this.getCommonParent();
        const siblings = this.getSiblings();
        const indexes = this.getSiblingIndexes(siblings);
        if (parentId === null || indexes.length === 0 || siblings.length === 0) return;

        const targetIndex = direction === 'up' ? indexes[0] - 1 : indexes[indexes.length - 1] + 2 - indexes.length;
        if (targetIndex < 0 || targetIndex > siblings.length) return;
        columnGroupingSettingsActions.reorderNodes(parentId, this.state.highlightedNodeIds, targetIndex);
        this.setState({ selectionAnchor: null });
    }

    private handleMoveHighlightedUp = (): void => this.handleMoveHighlighted('up');

    private handleMoveHighlightedDown = (): void => this.handleMoveHighlighted('down');

    private openAddModal = (): void => {
        this.setState({ isAddFieldsModalOpen: true });
    };

    private closeAddModal = (): void => {
        this.setState({ isAddFieldsModalOpen: false });
    };

    private startRowDrag = (event: DragEvent<HTMLDivElement>, row: ColumnGroupFlatRow): void => {
        if (row.nodeId === ROOT_ROW_ID) {
            event.preventDefault();
            return;
        }
        const { highlightedNodeIds } = this.state;
        const nodeIdsToDrag = highlightedNodeIds.includes(row.nodeId) ? highlightedNodeIds : [row.nodeId];
        if (!highlightedNodeIds.includes(row.nodeId)) {
            this.setState({ highlightedNodeIds: [row.nodeId], selectionAnchor: row.nodeId });
        }
        writeGroupingDragPayload(event, { source: 'tree', nodeIds: nodeIdsToDrag });
        this.setState({ draggingNodeIds: nodeIdsToDrag, dragSource: 'tree' });
    };

    private rowElement(nodeId: string): HTMLDivElement | null {
        return document.querySelector<HTMLDivElement>(`div[data-colgroup-node="${nodeId}"]`);
    }

    private computeRowDropTarget(row: ColumnGroupFlatRow, clientY: number): ColumnGroupingDropTarget {
        const root = rootNode();

        const el = this.rowElement(row.nodeId);
        const rect = el?.getBoundingClientRect();
        const height = rect?.height ?? 0;
        const relY = height > 0 ? (clientY - (rect?.top ?? 0)) / height : 0.5;

        if (row.nodeId === ROOT_ROW_ID) {
            return { parentId: root.id, index: root.children.length, zone: 'into' };
        }

        if (row.kind === 'group' && relY > 0.25 && relY < 0.75) {
            return { parentId: row.nodeId, index: childrenCountOf(root, row.nodeId), zone: 'into' };
        }

        const parentId = row.parentId ?? root.id;
        const baseIndex = indexOfNodeById(root, row.nodeId);
        const before = relY < 0.5;
        return {
            parentId,
            index: before ? baseIndex : baseIndex + 1,
            zone: before ? 'before' : 'after',
        };
    }

    private handleRowDragOver = (event: DragEvent<HTMLDivElement>, row: ColumnGroupFlatRow): void => {
        event.preventDefault();
        event.stopPropagation();
        const payload = readGroupingDragPayload(event);
        this.setState({
            dropTarget: this.computeRowDropTarget(row, event.clientY),
            dragSource: payload ? payload.source : this.state.dragSource,
        });
    };

    private handleRowDrop = (event: DragEvent<HTMLDivElement>, row: ColumnGroupFlatRow): void => {
        event.preventDefault();
        event.stopPropagation();
        const payload = readGroupingDragPayload(event);
        const target = this.state.dropTarget ?? this.computeRowDropTarget(row, event.clientY);
        this.clearDropState();
        if (!payload) return;
        this.applyDrop(payload, target);
    };

    private handleBodyDragOver = (event: DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        event.dataTransfer.dropEffect = this.state.dragSource === 'tree' ? 'move' : 'copy';
        if (!this.state.dropTarget) {
            this.setState({ dropTarget: this.rootAppendTarget() });
        }
    };

    private handleBodyDrop = (event: DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        const payload = readGroupingDragPayload(event);
        const target = this.state.dropTarget ?? this.rootAppendTarget();
        this.clearDropState();
        if (!payload) return;
        this.applyDrop(payload, target);
    };

    private rootAppendTarget(): ColumnGroupingDropTarget {
        const root = rootNode();
        return { parentId: root.id, index: root.children.length, zone: 'into' };
    }

    private applyDrop(payload: ColumnGroupingDragPayload, target: ColumnGroupingDropTarget): void {
        if (payload.source === 'available-panel') {
            columnGroupingSettingsActions.addColumns(target.parentId, payload.fieldIds, target.index);
            return;
        }
        if (payload.source === 'tree') {
            columnGroupingSettingsActions.moveNodes(payload.nodeIds, target.parentId, target.index);
        }
    }

    private handleStartGroupRename = (nodeId: string): void => {
        this.setState({ editingGroupId: nodeId });
    };

    private handleRenameCommit = (nodeId: string, title: string): void => {
        if (title.trim()) {
            columnGroupingSettingsActions.renameGroup(nodeId, title);
        }
        this.setState({ editingGroupId: null });
    };

    private handleRenameCancel = (): void => {
        this.setState({ editingGroupId: null });
    };

    // ---- Настройки внешнего вида ячеек выделенных колонок ----

    private getSelectedColumnRows(): ColumnGroupFlatRow[] {
        const rowsById = this.getRowsById();
        return this.state.highlightedNodeIds
            .map((id) => rowsById.get(id))
            .filter((row): row is ColumnGroupFlatRow => row !== undefined && row.kind === 'column');
    }

    private handleCellWidthChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const { value } = event.currentTarget;
        this.setState({ draftWidth: value, stepDraftWidth: null });
        const columns = this.getSelectedColumnRows();
        if (columns.length === 0) return;
        const offset = value.trim() === '' ? undefined : Math.max(Number(value), -DEFAULT_COLUMN_WIDTH);
        const patch = offset === undefined ? { width: undefined } : { width: DEFAULT_COLUMN_WIDTH + offset };
        columnGroupingSettingsActions.setColumnCellSettings(
            columns.map((c) => c.nodeId),
            patch,
        );
    };

    private handleCellHeightChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const { value } = event.currentTarget;
        this.setState({ draftHeight: value, stepDraftHeight: null });
        const columns = this.getSelectedColumnRows();
        if (columns.length === 0) return;
        const offset = value.trim() === '' ? undefined : Math.max(Number(value), -DEFAULT_ROW_HEIGHT);
        const patch = offset === undefined ? { height: undefined } : { height: DEFAULT_ROW_HEIGHT + offset };
        columnGroupingSettingsActions.setColumnCellSettings(
            columns.map((c) => c.nodeId),
            patch,
        );
    };

    private currentSizeDraft(field: 'width' | 'height'): number {
        const stepValue = field === 'width' ? this.state.stepDraftWidth : this.state.stepDraftHeight;
        if (stepValue !== null) {
            const numeric = Number(stepValue);
            return Number.isFinite(numeric) ? numeric : 0;
        }
        const columns = this.getSelectedColumnRows();
        if (columns.length > 0) {
            const first = columns[0];
            const allSame = columns.every((c) => c[field] === first[field]);
            return allSame && first[field] !== undefined ? Number(first[field]) - baseSizeFor(field) : 0;
        }
        const draft = field === 'width' ? this.state.draftWidth : this.state.draftHeight;
        const numeric = Number(draft);
        return draft.trim() !== '' && Number.isFinite(numeric) ? numeric : 0;
    }

    private handleCellSizeStep = (field: 'width' | 'height', dir: 1 | -1): void => {
        const current = this.currentSizeDraft(field);
        const base = baseSizeFor(field);
        const next = Math.round((current + dir * CELL_SIZE_STEP) * 100) / 100;
        // Не даём уменьшить ячейку ниже 0: отклонение не меньше -base.
        const clampedNext = Math.max(next, -base);
        const step = String(clampedNext);
        // Шаговое значение показываем в инпуте приоритетнее выбранной колонки.
        this.setState(
            field === 'width'
                ? {
                      stepDraftWidth: step,
                      draftWidth: step,
                      stepDraftHeight: this.state.stepDraftHeight,
                      draftHeight: this.state.draftHeight,
                  }
                : {
                      stepDraftHeight: step,
                      draftHeight: step,
                      stepDraftWidth: this.state.stepDraftWidth,
                      draftWidth: this.state.draftWidth,
                  },
        );
        const columns = this.getSelectedColumnRows();
        if (columns.length === 0) return;
        // В инпуте и шагах работаем с отклонением от базового размера, в стор сохраняем базу + отклонение.
        columnGroupingSettingsActions.setColumnCellSettings(
            columns.map((c) => c.nodeId),
            { [field]: base + clampedNext },
        );
    };

    private renderSizeStepperField(field: 'width' | 'height', label: string, value: string): ReactNode {
        const onChange = field === 'width' ? this.handleCellWidthChange : this.handleCellHeightChange;
        const noun = field === 'width' ? 'ширину' : 'высоту';
        return (
            <div className="cell-appearance__field">
                <span className="cell-appearance__label">{label}</span>
                <div className="cell-appearance__stepper">
                    <button
                        type="button"
                        className="cell-appearance__step-btn"
                        aria-label={`Уменьшить ${noun}`}
                        onClick={() => this.handleCellSizeStep(field, -1)}
                    >
                        −
                    </button>
                    <Input
                        className="cell-appearance__input"
                        variant="contained"
                        type="number"
                        value={value}
                        onChange={onChange}
                        suffix="px"
                        placeholder="0"
                        aria-label={`${label} ячейки колонки, px`}
                    />
                    <button
                        type="button"
                        className="cell-appearance__step-btn"
                        aria-label={`Увеличить ${noun}`}
                        onClick={() => this.handleCellSizeStep(field, 1)}
                    >
                        +
                    </button>
                </div>
            </div>
        );
    }

    private handleFlexGrowChange = (value: '0' | '1' | null): void => {
        const stretch = selectValueToStretch(value);
        this.setState({ draftFlexGrow: stretch === true });
        const columns = this.getSelectedColumnRows();
        if (columns.length === 0) return;
        columnGroupingSettingsActions.setColumnCellSettings(
            columns.map((c) => c.nodeId),
            { flexGrow: stretch },
        );
    };

    private handleExpandVerticalChange = (value: '0' | '1' | null): void => {
        const stretch = selectValueToStretch(value);
        this.setState({ draftExpandVertical: stretch === true });
        const columns = this.getSelectedColumnRows();
        if (columns.length === 0) return;
        columnGroupingSettingsActions.setColumnCellSettings(
            columns.map((c) => c.nodeId),
            { expandVertical: stretch },
        );
    };

    private handleAppearanceSelectOpened = (key: string, opened: boolean): void => {
        this.setState((prev) => ({
            openedAppearanceSelects: {
                ...prev.openedAppearanceSelects,
                [key]: opened,
            },
        }));
    };

    private handleGroupOrientationChange = (value: ColumnGroupOrientation | null): void => {
        const orientation = value ?? undefined;
        this.setState({ draftGroupOrientation: orientation });
        const rowsById = this.getRowsById();
        const groupIds = this.state.highlightedNodeIds.filter((id) => rowsById.get(id)?.kind === 'group');
        if (groupIds.length === 0 || orientation === undefined) return;
        columnGroupingSettingsActions.setGroupOrientation(groupIds, orientation);
    };

    /** Есть ли в выделении узел-группа (не корень). Для подгрупп настройки ячеек не показываем. */
    private hasSubgroupSelection(): boolean {
        const rowsById = this.getRowsById();
        return this.state.highlightedNodeIds.some((id) => id !== ROOT_ROW_ID && rowsById.get(id)?.kind === 'group');
    }

    /** Селект направления группировки для выделенной подгруппы. */
    private renderGroupAppearanceSettings(): ReactNode {
        const rowsById = this.getRowsById();
        const groupRows = this.state.highlightedNodeIds
            .map((id) => rowsById.get(id))
            .filter((row): row is ColumnGroupFlatRow => row !== undefined && row.kind === 'group');
        const [first] = groupRows;
        const selectedOrientation =
            groupRows.length > 0 && groupRows.every((r) => r.orientation === first.orientation)
                ? first.orientation
                : undefined;
        const orientation = selectedOrientation !== undefined ? selectedOrientation : this.state.draftGroupOrientation;

        return (
            <div className="group-appearance">
                <div className="cell-appearance__head">
                    <div className="column-title-wrapper">
                        <span>Заголовок</span>
                        <span className="cell-appearance__title">{first.title}</span>
                    </div>
                    <div className="column-title-wrapper">
                        <span>Подсказка</span>
                        <span className="cell-appearance__title">{first.kind}</span>
                    </div>
                </div>
                <div className="group-appearance__field">
                    <span className="group-appearance__label">Группировка</span>
                    <Select
                        className={[
                            'direction-select',
                            'cell-appearance__select',
                            this.state.openedAppearanceSelects.groupOrientation
                                ? 'direction-select--open'
                                : 'direction-select--closed',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        opened={!!this.state.openedAppearanceSelects.groupOrientation}
                        onSetOpen={(opened: boolean) => this.handleAppearanceSelectOpened('groupOrientation', opened)}
                        style={{ minWidth: 160 }}
                        variant="outlined"
                        options={GROUP_ORIENTATION_OPTIONS}
                        hasSearch={false}
                        resettable
                        value={orientation ?? 'horizontal'}
                        aria-label="Направление группировки"
                        onChange={this.handleGroupOrientationChange}
                    />
                </div>
            </div>
        );
    }

    private renderCellAppearanceSettings(): ReactNode {
        if (this.hasSubgroupSelection()) return null;
        const columns = this.getSelectedColumnRows();
        if (columns.length === 0) return null;
        const hasSelection = columns.length > 0;

        const [first] = columns;
        const selectedWidth =
            hasSelection && columns.every((c) => c.width === first.width)
                ? String((first.width ?? DEFAULT_COLUMN_WIDTH) - DEFAULT_COLUMN_WIDTH)
                : '';
        const selectedHeight =
            hasSelection && columns.every((c) => c.height === first.height)
                ? String((first.height ?? DEFAULT_ROW_HEIGHT) - DEFAULT_ROW_HEIGHT)
                : '';
        const selectedFlexGrow =
            hasSelection && columns.every((c) => c.flexGrow === first.flexGrow) && first.flexGrow === true;
        const selectedExpandVertical =
            hasSelection && columns.every((c) => c.expandVertical === first.expandVertical) && first.expandVertical === true;

        // Пока колонка не выбрана — держим введённые значения в черновике, чтобы инпуты оставались доступными.
        // Шаговое значение («±») приоритетнее и выбранной колонки, и черновика.
        const width =
            this.state.stepDraftWidth !== null
                ? this.state.stepDraftWidth
                : hasSelection
                ? selectedWidth
                : this.state.draftWidth;
        const height =
            this.state.stepDraftHeight !== null
                ? this.state.stepDraftHeight
                : hasSelection
                ? selectedHeight
                : this.state.draftHeight;
        const flexGrow = hasSelection ? selectedFlexGrow : this.state.draftFlexGrow;
        const expandVertical = hasSelection ? selectedExpandVertical : this.state.draftExpandVertical;

        return (
            <div className={`cell-appearance${hasSelection ? ' is-active' : ''}`}>
                <div className="cell-appearance__head">
                    <div className="column-title-wrapper">
                        <span>Заголовок</span>
                        <span className="cell-appearance__title">{first.title}</span>
                    </div>
                    <div className="column-title-wrapper">
                        <span>Подсказка</span>
                        <span className="cell-appearance__title">{first.kind}</span>
                    </div>
                </div>
                <div className="cell-appearance__fields">
                    {this.renderSizeStepperField('width', 'Ширина', width)}

                    <div className="cell-appearance__field">
                        <span className="cell-appearance__label">Растягивать по горизонтали</span>
                        <Select
                            className={[
                                'direction-select',
                                'cell-appearance__select',
                                this.state.openedAppearanceSelects.flexGrow
                                    ? 'direction-select--open'
                                    : 'direction-select--closed',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            opened={!!this.state.openedAppearanceSelects.flexGrow}
                            onSetOpen={(opened: boolean) => this.handleAppearanceSelectOpened('flexGrow', opened)}
                            style={{ minWidth: 88 }}
                            variant="outlined"
                            options={STRETCH_OPTIONS}
                            hasSearch={false}
                            value={stretchToSelectValue(flexGrow)}
                            resettable
                            aria-label="Растягивать ячейку по горизонтали"
                            onChange={this.handleFlexGrowChange}
                        />
                    </div>

                    <div className="close-icon">
                        <CloseIcon />
                    </div>

                    {this.renderSizeStepperField('height', 'Высота', height)}

                    <div className="cell-appearance__field">
                        <span className="cell-appearance__label">Растягивать по вертикали</span>
                        <Select
                            className={[
                                'direction-select',
                                'cell-appearance__select',
                                this.state.openedAppearanceSelects.expandVertical
                                    ? 'direction-select--open'
                                    : 'direction-select--closed',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            opened={!!this.state.openedAppearanceSelects.expandVertical}
                            onSetOpen={(opened: boolean) => this.handleAppearanceSelectOpened('expandVertical', opened)}
                            style={{ minWidth: 88 }}
                            variant="outlined"
                            options={STRETCH_OPTIONS}
                            hasSearch={false}
                            value={stretchToSelectValue(expandVertical)}
                            resettable
                            aria-label="Растягивать ячейку по вертикали"
                            onChange={this.handleExpandVerticalChange}
                        />
                    </div>
                </div>
            </div>
        );
    }

    render(): ReactNode {
        const { isAddFieldsModalOpen, highlightedNodeIds, dropTarget, editingGroupId, expandedGroupIds, draggingNodeIds } =
            this.state;
        const rows = this.getFlatRows();
        const highlightedSet = new Set(highlightedNodeIds);
        // Кнопка удаления активна только если в выделении есть группа (колонки удалять нельзя).
        const canDelete = highlightedNodeIds.some((id) => {
            const row = rows.find((r) => r.nodeId === id);
            return row?.kind === 'group';
        });

        const isIntoDrop = dropTarget !== null && dropTarget.zone === 'into';
        const isLineDrop = dropTarget !== null && dropTarget.zone !== 'into';

        return (
            <div className="settings-content settings-content--column">
                <section className="right-panel right-panel--column" aria-label="Колонки группировки">
                    <FacetsToolbar
                        onAdd={this.openAddModal}
                        onAddLabel="Добавить колонку"
                        onDelete={this.handleDeleteHighlighted}
                        onDeleteDisabled={!canDelete}
                        onMoveUp={this.handleMoveHighlightedUp}
                        onMoveUpDisabled={!this.canMove('up')}
                        onMoveDown={this.handleMoveHighlightedDown}
                        onMoveDownDisabled={!this.canMove('down')}
                        showGroupButton
                        groupActionLabel="Создать группу"
                        onGroupOrUngroup={this.handleCreateGroup}
                        groupActionDisabled={false}
                    />

                    <div className="selected-list-wrapper">
                        <div className="list-header">Дерево столбцов</div>
                        <div className="grouping-table column-grouping-table">
                            <div
                                className="grouping-body"
                                onDragOver={this.handleBodyDragOver}
                                onDragLeave={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                                        this.clearDropState();
                                    }
                                }}
                                onDrop={this.handleBodyDrop}
                            >
                                {rows.map((row) => {
                                    const rowIndex = indexOfNodeById(rootNode(), row.nodeId);
                                    const showLine =
                                        isLineDrop &&
                                        dropTarget.parentId === row.parentId &&
                                        ((dropTarget.zone === 'before' && rowIndex === dropTarget.index) ||
                                            (dropTarget.zone === 'after' && rowIndex === dropTarget.index - 1));
                                    return (
                                        <ColumnGroupRowView
                                            key={row.nodeId}
                                            row={row}
                                            highlighted={highlightedSet.has(row.nodeId)}
                                            isDragging={draggingNodeIds.includes(row.nodeId)}
                                            expanding={expandedGroupIds.has(row.nodeId)}
                                            isIntoDropTarget={isIntoDrop && dropTarget.parentId === row.nodeId}
                                            isRenderLine={showLine}
                                            editingGroupId={editingGroupId}
                                            onExpand={() => this.handleToggleExpand(row.nodeId)}
                                            onSelect={(event) => this.handleSelectRow(row, event)}
                                            onToggleEnabled={() => this.handleToggleEnabled(row)}
                                            onStartDrag={(event) => this.startRowDrag(event, row)}
                                            onDragEnd={this.clearDropState}
                                            onDragOver={(event) => this.handleRowDragOver(event, row)}
                                            onDrop={(event) => this.handleRowDrop(event, row)}
                                            onStartRename={() => this.handleStartGroupRename(row.nodeId)}
                                            onRenameCommit={(title) => this.handleRenameCommit(row.nodeId, title)}
                                            onRenameCancel={this.handleRenameCancel}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="left-panel left-panel--column" aria-label="Настройки">
                    <div className="tree-list">
                        {this.hasSubgroupSelection()
                            ? this.renderGroupAppearanceSettings()
                            : this.renderCellAppearanceSettings()}
                    </div>
                </section>

                <AddFieldsModal open={isAddFieldsModalOpen} title="Добавить колонки" onClose={this.closeAddModal}>
                    <AvailableColumnsPanel
                        enableDrag={false}
                        excludeFields={getUsedColumnFieldIds()}
                        targetParentId={this.getDefaultTarget()}
                    />
                </AddFieldsModal>
            </div>
        );
    }
}
