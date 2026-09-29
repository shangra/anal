import {
    Component,
    createRef,
    type CSSProperties,
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from 'react';
import { ArrowLeftIcon, IconButton, PlusIcon } from 'ui-kit';
import HooksManager from '../../../helpers/lite-react-hooks';
import { createEditForm } from '../Buttons/Edit/edit.helper';
import $windows from '../../ui/windows.helper';
import $confirm from '../../ui/MyConfirmMDM/confirm';
import { HookKeyManager } from '../ElementsList/utils/HookKeyManager';
import { handleTableSelection } from '../ElementsList/ReactWindowWrapperCombined/utils/tableSelectionHelper';
import { transformRowsForHook } from '../ElementsList/ReactWindowWrapperCombined/utils/transformRowsForHook';
import './ConfigurableNestedTable.css';
import { isTreeRow } from './utils/treeRows';
import { buildListTableModel } from './utils/buildListTableModel';
import { syncListSettingsCatalogFromTable } from './utils/syncListSettingsCatalog';
import type { ICell } from '../ElementsList/types';
import { GroupMarkerDown } from './Icons/groupMarkerDown';
import { GroupMarkerRight } from './Icons/groupMarkerRight';
import type { ConfigurableNestedTableProps, ExtraTableProps, IColumnData, ITreeRow } from './types';
import * as ListSettings from '../../../helpers/listSettings';
import {
    getConditionalFormattingSettingsState,
    listSettingsScopeKey,
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
    getListSettingsRevision,
    withListSettingsScope,
} from '../../../helpers/listSettings';
import {
    resolveConditionalCellDecoration,
    resolveSubstringAppearance,
    ruleMatchesCondition,
} from '../../../helpers/listSettings/facets/conditionalFormatting/apply';

type GroupedColumn = IColumnData | (GroupedColumn[] & { title?: string; orientation?: 'horizontal' | 'vertical' });

type CfRule = {
    enabled: boolean;
    applyToSubstrings?: boolean;
};

function substringGroupStyle(rules: CfRule[]): CSSProperties {
    const apply = resolveSubstringAppearance as unknown as (appearance: object, extra: unknown) => CSSProperties;
    return apply({}, rules) ?? {};
}

type SortDirection = 'ASC' | 'DESC';

interface SortRule {
    field: string;
    direction: SortDirection;
    enabled: boolean;
}

interface LeafTrack {
    id: string;
    rootId: string;
    title: string;
    width: number;
    flexGrow: boolean;
    kind: 'field' | 'stack';
    field?: string;
    stackLeaves?: IColumnData[];
}

interface DisplayRow {
    id: string;
    kind: 'group' | 'leaf';
    depth: number;
    cells: ICell[];
    groupField?: string;
    groupValue?: unknown;
    groupKey?: string;
    leafCount?: number;
    expanded?: boolean;
    substringHit?: boolean;
    recordId?: string;
}

interface RowGeometry {
    top: number;
    height: number;
}

interface TableLayout {
    rows: DisplayRow[];
    leaves: LeafTrack[];
    geometry: { rows: RowGeometry[]; totalHeight: number };
}

type DragState =
    | { kind: 'row'; fromId: string; overId: string; x: number; y: number; label: string }
    | { kind: 'col'; fromRootId: string; overRootId: string; x: number; y: number; label: string };

/** Адрес ячейки для выделения и инлайн-редактирования. */
interface CellRef {
    rowId: string;
    field: string;
}

interface ConfigurableNestedTableState {
    expandedGroups: Set<string> | 'all';
    listSettingsRevision: number;
    scrollTop: number;
    viewportHeight: number;
    viewportWidth: number;
    scrolling: boolean;
    afterCreated: boolean;
    drag: DragState | null;
    widthOverrides: Record<string, number>;
    rootOrder: string[] | null;
    activeCell: CellRef | null;
    editingCell: CellRef | null;
    draft: string;
    listEpoch: number;
    hierarchyHistory: string[];
    hierarchyLoading: boolean;
    selectedRecordIds: string[];
    lastSelectedRecordId: string | null;
}

const ROW_BUFFER = 10;
const DRAG_START_PIXELS = 4;
const CHECK_WIDTH = 28;
const HIERARCHY_COLUMN_WIDTH = 150;
const ROOT_PARENT_UUID = '00000000-0000-0000-0000-000000000000';
const RELOAD_LOCAL_KEY = 'reloadElementsList';

function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'boolean') {
        return value ? 'Да' : 'Нет';
    }
    return String(value);
}

function isVerticalGroup(col: GroupedColumn): boolean {
    return Array.isArray(col) && (col as GroupedColumn[] & { orientation?: string }).orientation === 'vertical';
}

function flattenCellList(item: ICell | ICell[] | unknown): ICell[] {
    if (Array.isArray(item)) {
        return item.flatMap((child) => flattenCellList(child));
    }
    if (item && typeof item === 'object' && 'columnName' in item && 'value' in item) {
        return [item as ICell];
    }
    return [];
}

function getLeafCells(item: ICell | ICell[] | ITreeRow | Record<string, unknown>[]): ICell[] | null {
    if (isTreeRow(item)) {
        if (item.isGroup) {
            return null;
        }
        return flattenCellList(item.cells);
    }
    if (Array.isArray(item)) {
        return flattenCellList(item);
    }
    if (item && typeof item === 'object' && 'columnName' in item && 'value' in item) {
        return [item as ICell];
    }
    return null;
}

function collectLeafColumns(group: GroupedColumn[], target: IColumnData[]): void {
    for (const col of group) {
        if (Array.isArray(col)) {
            collectLeafColumns(col, target);
        } else {
            target.push(col as IColumnData);
        }
    }
}

function collapsedGroupTitle(group: GroupedColumn[], leaves: IColumnData[]): string {
    const { title } = group as GroupedColumn[] & { title?: string };
    if (title && title.trim()) {
        return title.trim();
    }
    return leaves.map((column) => column.label ?? column.name).join(' / ');
}

function buildLeaves(columns: GroupedColumn[]): { leaves: LeafTrack[]; hasGroupHeader: boolean } {
    const leaves: LeafTrack[] = [];
    let hasGroupHeader = false;

    columns.forEach((col, colIndex) => {
        const rootId = Array.isArray(col) ? `group:${colIndex}` : `col:${(col as IColumnData).name}`;
        if (!Array.isArray(col)) {
            leaves.push({
                id: col.name,
                rootId,
                title: col.label ?? col.name,
                width: col.cellWidth ?? 140,
                flexGrow: col.cellFlexGrow !== false,
                kind: 'field',
                field: col.name,
            });
            return;
        }
        if (isVerticalGroup(col)) {
            const stacked: IColumnData[] = [];
            collectLeafColumns(col, stacked);
            leaves.push({
                id: `stack:${colIndex}`,
                rootId,
                title: collapsedGroupTitle(col, stacked),
                width: stacked[0]?.cellWidth ?? 180,
                flexGrow: stacked[0]?.cellFlexGrow !== false,
                kind: 'stack',
                stackLeaves: stacked,
            });
            hasGroupHeader = true;
            return;
        }
        const title = (col as GroupedColumn[] & { title?: string }).title ?? '';
        if (title.trim()) {
            hasGroupHeader = true;
        }
        for (const child of col) {
            if (Array.isArray(child)) {
                const nested: IColumnData[] = [];
                collectLeafColumns(child as GroupedColumn[], nested);
                nested.forEach((leaf) => {
                    leaves.push({
                        id: leaf.name,
                        rootId,
                        title: leaf.label ?? leaf.name,
                        width: leaf.cellWidth ?? 140,
                        flexGrow: leaf.cellFlexGrow !== false,
                        kind: 'field',
                        field: leaf.name,
                    });
                });
            } else {
                const leaf = child as IColumnData;
                leaves.push({
                    id: leaf.name,
                    rootId,
                    title: leaf.label ?? leaf.name,
                    width: leaf.cellWidth ?? 140,
                    flexGrow: leaf.cellFlexGrow !== false,
                    kind: 'field',
                    field: leaf.name,
                });
            }
        }
    });

    return { leaves, hasGroupHeader };
}

function bandTitleByRoot(columns: GroupedColumn[]): Map<string, string> {
    const map = new Map<string, string>();
    columns.forEach((col, colIndex) => {
        if (!Array.isArray(col)) {
            return;
        }
        const title = (col as GroupedColumn[] & { title?: string }).title ?? '';
        if (title.trim()) {
            map.set(`group:${colIndex}`, title.trim());
        }
    });
    return map;
}

function prefixOffsets(widths: number[]): number[] {
    const lefts: number[] = [];
    let x = 0;
    for (const width of widths) {
        lefts.push(x);
        x += width;
    }
    return lefts;
}

function allocateColumnWidths(leaves: LeafTrack[], available: number, overrides: Record<string, number>): number[] {
    const min = leaves.map((leaf) => overrides[leaf.id] ?? leaf.width);
    const fixed = min.reduce((sum, width) => sum + width, 0);
    if (available <= fixed || leaves.length === 0) {
        return min;
    }
    let flexIndexes = leaves
        .map((leaf, index) => (leaf.flexGrow && overrides[leaf.id] == null ? index : -1))
        .filter((index) => index >= 0);
    if (flexIndexes.length === 0) {
        flexIndexes = leaves.map((_, index) => index);
    }
    const extra = (available - fixed) / flexIndexes.length;
    return min.map((width, index) => (flexIndexes.includes(index) ? width + extra : width));
}

function buildRowGeometry(heights: number[]): { rows: RowGeometry[]; totalHeight: number } {
    const rows: RowGeometry[] = [];
    let top = 0;
    for (const height of heights) {
        rows.push({ top, height });
        top += height;
    }
    return { rows, totalHeight: top };
}

function isRowInPixel(row: RowGeometry, pixelToMatch: number): boolean {
    return row.top <= pixelToMatch && row.top + row.height > pixelToMatch;
}

function getRowIndexAtPixel(rows: RowGeometry[], pixelToMatch: number): number {
    const len = rows.length;
    if (len === 0) {
        return -1;
    }
    if (pixelToMatch <= 0) {
        return 0;
    }
    const last = rows[len - 1];
    if (last.top <= pixelToMatch) {
        return len - 1;
    }
    let bottom = 0;
    let top = len - 1;
    while (bottom <= top) {
        const mid = Math.floor((bottom + top) / 2);
        const current = rows[mid];
        if (isRowInPixel(current, pixelToMatch)) {
            return mid;
        }
        if (current.top < pixelToMatch) {
            bottom = mid + 1;
        } else {
            top = mid - 1;
        }
    }
    return Math.max(0, Math.min(len - 1, bottom));
}

function firstAndLastRowsToRender(
    rows: RowGeometry[],
    scrollTop: number,
    viewportHeight: number,
    defaultRowHeight: number
): { first: number; last: number } {
    if (rows.length === 0) {
        return { first: 0, last: -1 };
    }
    const bufferPixels = ROW_BUFFER * defaultRowHeight;
    const pageLastPixel = rows[rows.length - 1].top + rows[rows.length - 1].height;
    const firstPixel = Math.max(scrollTop - bufferPixels, 0);
    const lastPixel = Math.min(scrollTop + viewportHeight + bufferPixels, pageLastPixel);
    let first = getRowIndexAtPixel(rows, firstPixel);
    let last = getRowIndexAtPixel(rows, Math.max(0, lastPixel - 1));
    if (first < 0) {
        first = 0;
    }
    if (last < first) {
        last = first;
    }
    return { first, last };
}

function countLeaves(node: ITreeRow): number {
    if (!node.isGroup) {
        return 1;
    }
    return (node.children ?? []).reduce((sum, child) => sum + countLeaves(child as ITreeRow), 0);
}

function getConfigCellHeight(columns: GroupedColumn[]): number {
    let height = 36;
    const collect = (list: GroupedColumn[]): void => {
        for (const col of list) {
            if (Array.isArray(col)) {
                collect(col);
            } else if (col.cellHeight && col.cellHeight > height) {
                height = col.cellHeight;
            }
        }
    };
    collect(columns);
    return height;
}

function rowDataFromCells(cells: ICell[]): Record<string, unknown> {
    const rowData: Record<string, unknown> = {};
    for (const cell of cells) {
        rowData[cell.columnName] = cell.value.viewedData ?? cell.value.originalData;
    }
    return rowData;
}

function collectAncestorGroupKeys(
    children: (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[],
    rules: CfRule[],
    matchedKeys: Set<string>,
    parentPath: string[]
): void {
    for (const child of children) {
        if (isTreeRow(child) && child.isGroup) {
            const childKey = String(child.groupKey ?? 'unknown');
            const newPath = [...parentPath, childKey];
            const childChildren = (child.children ?? []) as typeof children;
            collectAncestorGroupKeys(childChildren, rules, matchedKeys, newPath);

            const childRowData: Record<string, unknown>[] = [];
            for (const gc of childChildren) {
                const leaf = getLeafCells(gc);
                if (leaf) {
                    childRowData.push(rowDataFromCells(leaf));
                }
            }
            for (const rule of rules) {
                if (!rule.enabled || !rule.applyToSubstrings) {
                    continue;
                }
                if (childRowData.some((data) => ruleMatchesCondition(rule as never, data))) {
                    for (const key of newPath) {
                        matchedKeys.add(key);
                    }
                }
            }
        } else {
            const leaf = getLeafCells(child);
            if (!leaf) {
                continue;
            }
            const rowData = rowDataFromCells(leaf);
            for (const parentKeyItem of parentPath) {
                for (const rule of rules) {
                    if (!rule.enabled || !rule.applyToSubstrings) {
                        continue;
                    }
                    if (ruleMatchesCondition(rule as never, rowData)) {
                        matchedKeys.add(parentKeyItem);
                    }
                }
            }
        }
    }
}

function isExpandedKey(expanded: Set<string> | 'all', id: string): boolean {
    return expanded === 'all' || expanded.has(id);
}

function collectGroupKeys(data: (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[]): string[] {
    const keys: string[] = [];
    const walk = (rows: typeof data) => {
        for (const item of rows) {
            if (isTreeRow(item) && item.isGroup) {
                keys.push(String(item.groupKey ?? 'unknown'));
                walk((item.children ?? []) as typeof data);
            }
        }
    };
    walk(data);
    return keys;
}

type TableItem = ICell | ICell[] | ITreeRow | Record<string, unknown>[];

function isSameCell(cell: CellRef | null, rowId: string, field: string): boolean {
    return Boolean(cell && cell.rowId === rowId && cell.field === field);
}

function columnDragging(drag: DragState | null, rootId: string): boolean {
    return drag?.kind === 'col' && drag.fromRootId === rootId;
}

function entityId(value: unknown): string {
    if (value == null || value === '') {
        return '';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
        return String(value);
    }
    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if ('value' in record) {
            return entityId(record.value);
        }
        if ('id' in record) {
            return entityId(record.id);
        }
    }
    return '';
}

function recordIdOf(cells: ICell[]): string {
    for (const cell of cells) {
        const recordId = cell?.recordId;
        if (recordId != null && recordId !== '') {
            return String(recordId);
        }
    }
    return '';
}

function leafRowId(item: TableItem, cells: ICell[], depth: number, index: number): string {
    const recordId = recordIdOf(cells);
    if (recordId) {
        return recordId;
    }
    const { sourceId } = item as { sourceId?: string };
    if (sourceId) {
        return String(sourceId);
    }
    if (cells[0]?.rowIndex !== undefined) {
        return String(cells[0].rowIndex);
    }
    return `row-${depth}-${index}`;
}

function flattenRows(
    data: (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[],
    expandedGroups: Set<string> | 'all',
    rules: CfRule[]
): DisplayRow[] {
    const into: DisplayRow[] = [];
    const matchedKeys = new Set<string>();
    for (const item of data) {
        if (isTreeRow(item) && item.isGroup) {
            collectAncestorGroupKeys(
                (item.children ?? []) as (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[],
                rules,
                matchedKeys,
                [String(item.groupKey ?? 'unknown')]
            );
        }
    }

    const walk = (rows: typeof data, depth: number) => {
        rows.forEach((item, index) => {
            if (isTreeRow(item) && item.isGroup) {
                const groupKey = String(item.groupKey ?? `group-${depth}-${index}`);
                const isExpanded = isExpandedKey(expandedGroups, groupKey);
                into.push({
                    id: groupKey,
                    kind: 'group',
                    depth,
                    cells: [],
                    groupField: typeof item.groupField === 'string' ? item.groupField : undefined,
                    groupValue: item.groupValue,
                    groupKey,
                    leafCount: countLeaves(item),
                    expanded: isExpanded,
                    substringHit: matchedKeys.has(groupKey),
                });
                if (isExpanded) {
                    walk((item.children ?? []) as typeof data, depth + 1);
                }
                return;
            }
            const cells = getLeafCells(item) ?? [];
            const recordId = recordIdOf(cells);
            into.push({
                id: leafRowId(item, cells, depth, index),
                kind: 'leaf',
                depth,
                cells,
                recordId: recordId || undefined,
            });
        });
    };

    walk(data, 0);
    return into;
}

function cycleSortRules(rules: SortRule[], field: string): SortRule[] {
    const index = rules.findIndex((rule) => rule.field === field);
    if (index < 0) {
        return [...rules, { field, direction: 'ASC', enabled: true }];
    }
    const current = rules[index];
    if (!current.enabled) {
        return rules.map((rule, itemIndex) => (itemIndex === index ? { ...rule, enabled: true, direction: 'ASC' } : rule));
    }
    if (current.direction === 'ASC') {
        return rules.map((rule, itemIndex) => (itemIndex === index ? { ...rule, direction: 'DESC' } : rule));
    }
    return rules.filter((_, itemIndex) => itemIndex !== index);
}

function readSortRules(scope?: string): SortRule[] {
    const helpers = ListSettings as typeof ListSettings & {
        getActiveListView?: (scope?: string) => { activeSortRules?: SortRule[] };
        getSortSettingsState?: (scope?: string) => { sortRules?: SortRule[] };
    };
    return helpers.getSortSettingsState?.(scope)?.sortRules ?? helpers.getActiveListView?.(scope)?.activeSortRules ?? [];
}

function commitSortRules(rules: SortRule[]): void {
    const helpers = ListSettings as typeof ListSettings & {
        getSortSettingsState?: () => Record<string, unknown>;
        replaceSortSettingsState?: (state: unknown) => void;
        sortSettingsActions?: { replace?: (state: unknown) => void; commit?: (state: unknown) => void };
    };
    const current = helpers.getSortSettingsState?.() ?? {};
    const next = { ...current, sortRules: rules };
    helpers.replaceSortSettingsState?.(next);
    helpers.sortSettingsActions?.replace?.(next);
    helpers.sortSettingsActions?.commit?.(next);
}

function moveLeavesByRoot(leaves: LeafTrack[], fromRootId: string, toRootId: string): LeafTrack[] {
    if (fromRootId === toRootId) {
        return leaves;
    }
    const block = leaves.filter((leaf) => leaf.rootId === fromRootId);
    const rest = leaves.filter((leaf) => leaf.rootId !== fromRootId);
    const insertAt = rest.findIndex((leaf) => leaf.rootId === toRootId);
    if (block.length === 0 || insertAt < 0) {
        return leaves;
    }
    return [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
}

function moveRow(rows: DisplayRow[], fromId: string, overId: string): DisplayRow[] {
    if (fromId === overId) {
        return rows;
    }
    const next = [...rows];
    const from = next.findIndex((row) => row.id === fromId);
    const to = next.findIndex((row) => row.id === overId);
    if (from < 0 || to < 0) {
        return rows;
    }
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}

function leafIdForTarget(rows: DisplayRow[], overId: string, fromId: string): string | null {
    const overIndex = rows.findIndex((row) => row.id === overId);
    if (overIndex < 0) {
        return null;
    }
    if (rows[overIndex].kind === 'leaf') {
        return rows[overIndex].id;
    }
    for (let index = overIndex + 1; index < rows.length; index++) {
        if (rows[index].kind === 'leaf' && rows[index].id !== fromId) {
            return rows[index].id;
        }
    }
    for (let index = overIndex - 1; index >= 0; index--) {
        if (rows[index].kind === 'leaf' && rows[index].id !== fromId) {
            return rows[index].id;
        }
    }
    return null;
}

function reorderColumns(columns: GroupedColumn[], fromRootId: string, toRootId: string): GroupedColumn[] {
    const ids = columns.map((col, index) => (Array.isArray(col) ? `group:${index}` : `col:${(col as IColumnData).name}`));
    const from = ids.indexOf(fromRootId);
    const to = ids.indexOf(toRootId);
    if (from < 0 || to < 0 || from === to) {
        return columns;
    }
    const next = [...columns];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}

function withoutEmptyMark(style: CSSProperties | undefined): CSSProperties | undefined {
    if (!style || style.borderBottom !== '2px solid #ef4444') {
        return style;
    }
    const next = { ...style };
    delete next.borderBottom;
    return Object.keys(next).length > 0 ? next : undefined;
}

function cellText(row: DisplayRow, field: string, rules: CfRule[]): { text: string; style?: CSSProperties; empty: boolean } {
    const cell =
        row.cells.find((item) => item.columnName === field) ??
        row.cells.find((item) => item.columnName?.toLowerCase() === field.toLowerCase());
    const raw = cell?.value.viewedData ?? cell?.value.originalData;
    const fallback = formatCellValue(raw);
    const rowData = rowDataFromCells(row.cells);
    const decoration = resolveConditionalCellDecoration(rowData, field, rules as never);
    const text = String(decoration?.text ?? decoration?.formattedValue ?? fallback);
    const empty = text.trim() === '';
    return {
        text,
        style: empty ? withoutEmptyMark(decoration?.style as CSSProperties | undefined) : (decoration?.style as CSSProperties | undefined),
        empty,
    };
}

let nestedTableSubscriberSeq = 0;

export class ConfigurableNestedTable extends Component<ConfigurableNestedTableProps, ConfigurableNestedTableState> {
    private readonly subscriberName = `ConfigurableNestedTable-${++nestedTableSubscriberSeq}`;

    DataManager: unknown;

    private scrollerRef = createRef<HTMLDivElement>();
    private headerRef = createRef<HTMLDivElement>();

    private inputRef = createRef<HTMLInputElement>();

    private resizeObserver: ResizeObserver | null = null;
    private reloadWithResetKey = '';
    private reloadWithoutResetKey = '';
    /** После загрузки данных выделить первую строку, как ElementsList.setDefaultSelection. */
    private preferFirstSelection = false;
    private createdTimer = 0;
    private scrollTimer = 0;
    private frame = 0;
    /** Снимок разметки последнего рендера — нужен обработчикам клавиатуры и автопрокрутки. */
    private layout: TableLayout | null = null;

    constructor(props: ConfigurableNestedTableProps) {
        super(props);
        this.DataManager = props.DataManager;
        const dataManager = props.DataManager as
            | { hookChangeFieldData?: (path: string, instance: unknown) => void }
            | undefined;
        dataManager?.hookChangeFieldData?.(String(props.name ?? 'list'), this);
        if (props.name && props.name !== 'list') {
            dataManager?.hookChangeFieldData?.('list', this);
        }
        this.state = {
            expandedGroups: 'all',
            listSettingsRevision: getListSettingsRevision(),
            scrollTop: 0,
            viewportHeight: 400,
            viewportWidth: 800,
            scrolling: false,
            afterCreated: false,
            drag: null,
            widthOverrides: {},
            rootOrder: null,
            activeCell: null,
            editingCell: null,
            draft: '',
            listEpoch: 0,
            hierarchyHistory: [ROOT_PARENT_UUID],
            hierarchyLoading: false,
            selectedRecordIds: [],
            lastSelectedRecordId: null,
        };
        subscribeListSettingsRevision(this.subscriberName, () => {
            this.setState({
                listSettingsRevision: getListSettingsRevision(),
                expandedGroups: 'all',
            });
        });
    }

    settingsScope = (): string => {
        const dataManager = (this.props.DataManager ?? this.DataManager) as { metaOwner?: string } | undefined;
        return listSettingsScopeKey({
            metaOwner: dataManager?.metaOwner,
            name: this.props.name == null ? undefined : String(this.props.name),
        });
    };

    changeMasterData = (_value?: unknown): void => {
        this.preferFirstSelection = true;
        this.setState((prev) => ({ listEpoch: prev.listEpoch + 1 }));
    };

    private dataManagerInstance(): {
        metadata?: { manifest?: { settings?: { hierarchical?: boolean } } };
        options?: {
            where?: Record<string, unknown>;
            limit?: number;
            offset?: number;
            withHierarchy?: boolean;
            order?: unknown;
        };
        currentSort?: { column: string; direction: 'ASC' | 'DESC' } | null;
        modalUUID?: string;
        formId?: string;
        primaryKey?: string;
        data?: { list?: unknown };
        selectedRows?: Record<string, unknown>[];
        ReloadData?: () => Promise<unknown>;
        Delete?: () => Promise<unknown>;
    } | undefined {
        return (this.props.DataManager ?? this.DataManager) as ReturnType<ConfigurableNestedTable['dataManagerInstance']>;
    }

    private isHierarchical(): boolean {
        return Boolean(this.dataManagerInstance()?.metadata?.manifest?.settings?.hierarchical);
    }

    private loadHierarchyLevel = async (parentId: string): Promise<void> => {
        const dataManager = this.dataManagerInstance();
        if (!dataManager?.ReloadData) {
            return;
        }
        const where = { ...(dataManager.options?.where ?? {}) };
        delete where.id;
        where.parent = parentId;
        dataManager.currentSort = null;
        dataManager.options = {
            ...dataManager.options,
            where,
            limit: dataManager.options?.limit ?? 200,
            offset: 0,
            withHierarchy: true,
            order: undefined,
        };
        await dataManager.ReloadData();
    };

    private listRecords(): Record<string, unknown>[] {
        const list = this.dataManagerInstance()?.data?.list;
        if (!Array.isArray(list)) {
            return [];
        }
        return list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
    }

    private rowKey(row: DisplayRow): string {
        return row.recordId || row.id;
    }

    private publishSelection(ids: string[]): void {
        const dataManager = this.dataManagerInstance();
        if (!dataManager) {
            return;
        }
        const primaryKey = dataManager.primaryKey ?? 'id';
        const byId = new Map<string, Record<string, unknown>>();
        for (const row of this.listRecords()) {
            const id = entityId(row[primaryKey]) || entityId(row.id);
            if (id) {
                byId.set(id, row);
            }
        }
        const selected = ids
            .map((id) => {
                const found = byId.get(id);
                if (!found) {
                    return null;
                }
                const recordId = entityId(found[primaryKey]) || entityId(found.id);
                return recordId ? { ...found, id: recordId } : null;
            })
            .filter((row): row is Record<string, unknown> => row != null);
        dataManager.selectedRows = selected;
        const modalUUID = dataManager.modalUUID ?? 'list';
        const formId = dataManager.formId ?? '';
        HooksManager.setHook(HookKeyManager.selectRows(modalUUID, formId, transformRowsForHook(selected)));
    }

    private clearSelection(): void {
        this.preferFirstSelection = false;
        this.setState({ selectedRecordIds: [], lastSelectedRecordId: null });
        this.publishSelection([]);
    }

    private selectFirstLeaf(): void {
        const first = this.layout?.rows.find((row) => row.kind === 'leaf');
        const field =
            this.layout?.leaves.find((leaf) => leaf.field)?.field ??
            this.layout?.leaves.find((leaf) => leaf.stackLeaves?.[0]?.name)?.stackLeaves?.[0]?.name;
        if (!first) {
            this.clearSelection();
            return;
        }
        const key = this.rowKey(first);
        this.setState({
            selectedRecordIds: [key],
            lastSelectedRecordId: key,
            ...(field ? { activeCell: { rowId: first.id, field } } : {}),
        });
        this.publishSelection([key]);
    }

    private leafRows(): DisplayRow[] {
        return (this.layout?.rows ?? []).filter((row) => row.kind === 'leaf');
    }

    handleRowSelect = (event: ReactMouseEvent<HTMLElement>, row: DisplayRow, field?: string): void => {
        if (row.kind !== 'leaf') {
            return;
        }
        const leaves = this.leafRows();
        const index = leaves.findIndex((item) => this.rowKey(item) === this.rowKey(row));
        if (index < 0) {
            return;
        }
        const indexById = new Map<string, number>();
        leaves.forEach((item, itemIndex) => {
            indexById.set(this.rowKey(item), itemIndex);
        });
        const selectedIndexes = this.state.selectedRecordIds
            .map((id) => indexById.get(id))
            .filter((value): value is number => value != null);
        const lastIndex = this.state.lastSelectedRecordId == null ? null : indexById.get(this.state.lastSelectedRecordId) ?? null;
        const next = handleTableSelection(
            index,
            { selectedRows: selectedIndexes, lastSelectedRow: lastIndex },
            { ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey },
        );
        const ids = next.selectedRows.map((itemIndex) => (leaves[itemIndex] ? this.rowKey(leaves[itemIndex]) : '')).filter(Boolean);
        const lastId = next.lastSelectedRow == null || !leaves[next.lastSelectedRow] ? null : this.rowKey(leaves[next.lastSelectedRow]);
        const activeField = field ?? this.state.activeCell?.field ?? this.layout?.leaves.find((leaf) => leaf.field)?.field;
        this.setState({
            selectedRecordIds: ids,
            lastSelectedRecordId: lastId,
            activeCell: activeField ? { rowId: row.id, field: activeField } : this.state.activeCell,
        });
        this.publishSelection(ids);
        this.scrollerRef.current?.focus({ preventScroll: true });
    };

    openRowEditor = (row: DisplayRow): void => {
        if (row.kind !== 'leaf') {
            return;
        }
        const key = this.rowKey(row);
        this.setState({
            selectedRecordIds: [key],
            lastSelectedRecordId: key,
        });
        this.publishSelection([key]);
        const dataManager = this.dataManagerInstance();
        if (!dataManager?.selectedRows?.length) {
            console.warn('ElementsList: нет выбранной строки, форма элемента не открыта');
            return;
        }
        try {
            const formConfig = createEditForm(dataManager);
            $windows.open(formConfig.title, formConfig.content, formConfig.options);
        } catch (error) {
            console.error('Error opening edit form:', error);
        }
    };

    deleteSelectedRows = (): void => {
        const dataManager = this.dataManagerInstance();
        if (!dataManager || typeof dataManager.Delete !== 'function') {
            return;
        }
        if (!dataManager.selectedRows?.length && this.state.selectedRecordIds.length) {
            this.publishSelection(this.state.selectedRecordIds);
        }
        if (!dataManager.selectedRows?.length) {
            return;
        }
        $confirm('Удалить?', (isYes: boolean) => {
            if (!isYes) {
                return;
            }
            void dataManager
                .Delete?.()
                .then(() => this.handleReload(true))
                .catch((error: unknown) => {
                    console.error(error);
                });
        });
    };

    openSelectedEditor = (): void => {
        const dataManager = this.dataManagerInstance();
        if (!dataManager?.selectedRows?.length) {
            console.warn('No rows selected for editing');
            return;
        }
        try {
            const formConfig = createEditForm(dataManager);
            $windows.open(formConfig.title, formConfig.content, formConfig.options);
        } catch (error) {
            console.error('Error opening edit form:', error);
        }
    };

    onHierarchyExpand = async (recordId: string): Promise<void> => {
        if (!recordId || this.state.hierarchyLoading) {
            return;
        }
        this.setState({ hierarchyLoading: true });
        try {
            await this.loadHierarchyLevel(recordId);
            this.preferFirstSelection = false;
            this.publishSelection([]);
            this.setState((prev) => ({
                hierarchyHistory: [...prev.hierarchyHistory, recordId],
                hierarchyLoading: false,
                listEpoch: prev.listEpoch + 1,
                scrollTop: 0,
                activeCell: null,
                editingCell: null,
                selectedRecordIds: [],
                lastSelectedRecordId: null,
            }));
        } catch (error) {
            console.error(error);
            this.setState({ hierarchyLoading: false });
        }
    };

    private renderHierarchyHeader(drilled: boolean): ReactNode {
        return (
            <span className="data-table__hierarchy">
                {drilled ? (
                    <IconButton
                        variant="outlined"
                        icon={ArrowLeftIcon}
                        size="small"
                        onClick={(event: { stopPropagation: () => void }) => {
                            event.stopPropagation();
                            void this.onHierarchyBack();
                        }}
                    />
                ) : null}
                <span className="data-table__hierarchy-label">Иерархия</span>
            </span>
        );
    }

    handleReload = async (resetPagination = false): Promise<void> => {
        const dataManager = this.dataManagerInstance();
        if (!dataManager?.ReloadData) {
            return;
        }
        try {
            const hierarchical = this.isHierarchical();
            if (hierarchical) {
                const parentId = this.state.hierarchyHistory[this.state.hierarchyHistory.length - 1] ?? ROOT_PARENT_UUID;
                await this.loadHierarchyLevel(parentId);
                this.preferFirstSelection = false;
                this.publishSelection([]);
            } else {
                dataManager.options = {
                    ...dataManager.options,
                    offset: resetPagination ? 0 : dataManager.options?.offset,
                };
                await dataManager.ReloadData();
            }
            this.setState((prev) => ({
                listEpoch: prev.listEpoch + 1,
                scrollTop: resetPagination ? 0 : prev.scrollTop,
                activeCell: null,
                editingCell: null,
                ...(hierarchical ? { selectedRecordIds: [], lastSelectedRecordId: null } : {}),
            }));
        } catch (error) {
            console.error(error);
        }
    };

    onHierarchyBack = async (): Promise<void> => {
        if (this.state.hierarchyHistory.length < 2 || this.state.hierarchyLoading) {
            return;
        }
        const hierarchyHistory = this.state.hierarchyHistory.slice(0, -1);
        const parentId = hierarchyHistory[hierarchyHistory.length - 1] ?? ROOT_PARENT_UUID;
        this.setState({ hierarchyLoading: true });
        try {
            await this.loadHierarchyLevel(parentId);
            this.preferFirstSelection = false;
            this.publishSelection([]);
            this.setState((prev) => ({
                hierarchyHistory,
                hierarchyLoading: false,
                listEpoch: prev.listEpoch + 1,
                scrollTop: 0,
                activeCell: null,
                editingCell: null,
                selectedRecordIds: [],
                lastSelectedRecordId: null,
            }));
        } catch (error) {
            console.error(error);
            this.setState({ hierarchyLoading: false });
        }
    };

    publishColumnCatalog = (columns: GroupedColumn[]): void => {
        const scope = this.settingsScope();
        queueMicrotask(() => {
            withListSettingsScope(scope, () => {
                syncListSettingsCatalogFromTable(columns);
            });
        });
    };

    componentDidMount(): void {
        const modalUUID = this.dataManagerInstance()?.modalUUID;
        if (modalUUID) {
            this.reloadWithResetKey = `${modalUUID}__reload_with_pagination_reset`;
            this.reloadWithoutResetKey = `${modalUUID}__reload_without_pagination_reset`;
            HooksManager.subscribeHook({
                [this.reloadWithResetKey]: {
                    [RELOAD_LOCAL_KEY]: () => this.handleReload(true),
                },
            });
            HooksManager.subscribeHook({
                [this.reloadWithoutResetKey]: {
                    [RELOAD_LOCAL_KEY]: () => this.handleReload(false),
                },
            });
        }
        this.createdTimer = window.setTimeout(() => this.setState({ afterCreated: true }), 1000);
        const el = this.scrollerRef.current;
        if (!el) {
            return;
        }
        const onScroll = () => {
            this.setState({ scrolling: true });
            window.clearTimeout(this.scrollTimer);
            this.scrollTimer = window.setTimeout(() => this.setState({ scrolling: false }), 120);
            if (this.frame) {
                return;
            }
            this.frame = window.requestAnimationFrame(() => {
                this.frame = 0;
                const scroller = this.scrollerRef.current;
                if (!scroller) {
                    return;
                }
                if (this.headerRef.current) {
                    this.headerRef.current.scrollLeft = scroller.scrollLeft;
                }
                this.setState({ scrollTop: scroller.scrollTop });
            });
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        this.resizeObserver = new ResizeObserver(() => {
            const height = Math.max(el.clientHeight, 180);
            const width = Math.max(el.clientWidth, 1);
            this.setState({ viewportHeight: height, viewportWidth: width });
        });
        this.resizeObserver.observe(el);
        this.setState({
            viewportHeight: Math.max(el.clientHeight, 180),
            viewportWidth: Math.max(el.clientWidth, 1),
        });
        (this as unknown as { _onScroll: () => void })._onScroll = onScroll;
    }

    componentWillUnmount(): void {
        if (this.reloadWithResetKey) {
            HooksManager.unsubscribeHook({
                [this.reloadWithResetKey]: [RELOAD_LOCAL_KEY],
            });
        }
        if (this.reloadWithoutResetKey) {
            HooksManager.unsubscribeHook({
                [this.reloadWithoutResetKey]: [RELOAD_LOCAL_KEY],
            });
        }
        unsubscribeListSettingsRevision(this.subscriberName);
        window.clearTimeout(this.createdTimer);
        window.clearTimeout(this.scrollTimer);
        if (this.frame) {
            window.cancelAnimationFrame(this.frame);
        }
        const el = this.scrollerRef.current;
        const onScroll = (this as unknown as { _onScroll?: () => void })._onScroll;
        if (el && onScroll) {
            el.removeEventListener('scroll', onScroll);
        }
        this.resizeObserver?.disconnect();
    }

    extra(): ExtraTableProps {
        return this.props;
    }

    componentDidUpdate(_prevProps: ConfigurableNestedTableProps, prevState: ConfigurableNestedTableState): void {
        if (prevState.listEpoch !== this.state.listEpoch && this.preferFirstSelection) {
            this.preferFirstSelection = false;
            this.selectFirstLeaf();
        }
        if (this.state.editingCell && !prevState.editingCell) {
            const input = this.inputRef.current;
            if (input) {
                input.focus();
                input.select();
            }
            return;
        }

        if (this.state.editingCell) {
            this.commitIfScrolledAway();
        }
    }

    isCellEditable(rowId: string, field: string): boolean {
        const extra = this.extra();
        if (typeof extra.onCellChange !== 'function') {
            return false;
        }
        return extra.canEditCell ? extra.canEditCell(rowId, field) : true;
    }

    rawCellValue(rowId: string, field: string): string {
        const row = this.layout?.rows.find((item) => item.id === rowId);
        const cell = row?.cells.find((item) => item.columnName === field);
        return formatCellValue(cell?.value.viewedData ?? cell?.value.originalData);
    }

    /**
     * Значение живёт только в props: таблица ничего не хранит локально, поэтому родитель
     * волен и зафиксировать правку, и откатить её, если сохранение на сервере не удалось.
     */
    writeCellValue(rowId: string, field: string, value: string): void {
        if (this.rawCellValue(rowId, field) === value) {
            return;
        }
        this.extra().onCellChange?.(rowId, field, value);
    }

    activateCell = (rowId: string, field: string): void => {
        if (this.state.editingCell) {
            this.commitEditing();
        }
        this.setState({ activeCell: { rowId, field } });
        this.scrollerRef.current?.focus({ preventScroll: true });
    };

    startEditing = (rowId: string, field: string): void => {
        if (!this.isCellEditable(rowId, field)) {
            this.setState({ activeCell: { rowId, field } });
            return;
        }
        this.setState({
            activeCell: { rowId, field },
            editingCell: { rowId, field },
            draft: this.rawCellValue(rowId, field),
        });
    };

    commitEditing = (): void => {
        const editing = this.state.editingCell;
        if (!editing) {
            return;
        }
        const { draft } = this.state;
        this.setState({ editingCell: null, draft: '' });
        this.writeCellValue(editing.rowId, editing.field, draft);
    };

    cancelEditing = (): void => {
        if (!this.state.editingCell) {
            return;
        }
        this.setState({ editingCell: null, draft: '' });
    };

    handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            this.commitEditing();
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.cancelEditing();
            return;
        }
        if (event.key === 'Tab') {
            event.preventDefault();
            event.stopPropagation();
            const active = this.state.activeCell;
            this.commitEditing();
            if (active) {
                this.moveActiveCell(0, event.shiftKey ? -1 : 1);
            }
        }
    };

    handleTableKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
        // Пока открыт редактор, клавиши обрабатывает он.
        if (this.state.editingCell) {
            return;
        }
        if (event.key === 'Delete') {
            event.preventDefault();
            this.deleteSelectedRows();
            return;
        }
        const active = this.state.activeCell;
        if (!active) {
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            const leaves = this.leafRows();
            const ids = leaves.map((row) => this.rowKey(row));
            this.setState({
                selectedRecordIds: ids,
                lastSelectedRecordId: ids[ids.length - 1] ?? null,
            });
            this.publishSelection(ids);
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            this.openSelectedEditor();
            return;
        }
        if (event.key === 'F2') {
            event.preventDefault();
            this.startEditing(active.rowId, active.field);
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.moveActiveCell(-1, 0);
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.moveActiveCell(1, 0);
            return;
        }
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.moveActiveCell(0, -1);
            return;
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.moveActiveCell(0, 1);
            return;
        }
    };

    moveActiveCell = (deltaRow: number, deltaCol: number): void => {
        const { layout } = this;
        const active = this.state.activeCell;
        if (!layout || !active) {
            return;
        }

        const { rows, leaves } = layout;
        const rowIndex = rows.findIndex((row) => row.id === active.rowId);
        if (rowIndex < 0) {
            return;
        }

        let targetRow = rowIndex;
        if (deltaRow !== 0) {
            let cursor = rowIndex + deltaRow;
            while (cursor >= 0 && cursor < rows.length && rows[cursor].kind !== 'leaf') {
                cursor += deltaRow;
            }
            if (cursor < 0 || cursor >= rows.length) {
                return;
            }
            targetRow = cursor;
        }

        const row = rows[targetRow];
        if (row.kind !== 'leaf') {
            return;
        }

        const fields = leaves.map((leaf) => leaf.field).filter((field): field is string => Boolean(field));
        if (fields.length === 0) {
            return;
        }
        let colIndex = fields.indexOf(active.field);
        colIndex = colIndex < 0 ? 0 : Math.max(0, Math.min(fields.length - 1, colIndex + deltaCol));

        const key = this.rowKey(row);
        this.setState({
            activeCell: { rowId: row.id, field: fields[colIndex] },
            selectedRecordIds: [key],
            lastSelectedRecordId: key,
        });
        this.publishSelection([key]);
        this.scrollRowIntoView(targetRow);
    };

    scrollRowIntoView = (index: number): void => {
        const scroller = this.scrollerRef.current;
        const geometry = this.layout?.geometry.rows[index];
        if (!scroller || !geometry) {
            return;
        }
        const bottom = geometry.top + geometry.height;
        if (geometry.top < scroller.scrollTop) {
            scroller.scrollTop = geometry.top;
        } else if (bottom > scroller.scrollTop + scroller.clientHeight) {
            scroller.scrollTop = bottom - scroller.clientHeight;
        }
    };

    /** Строка с открытым редактором ушла за пределы вьюпорта — фиксируем значение, как в Excel. */
    commitIfScrolledAway = (): void => {
        const editing = this.state.editingCell;
        if (!editing || !this.layout) {
            return;
        }
        const index = this.layout.rows.findIndex((row) => row.id === editing.rowId);
        if (index < 0) {
            return;
        }
        const geometry = this.layout.geometry.rows[index];
        if (!geometry) {
            return;
        }
        const { scrollTop, viewportHeight } = this.state;
        if (geometry.top + geometry.height < scrollTop || geometry.top > scrollTop + viewportHeight) {
            this.commitEditing();
        }
    };

    tableModel() {
        void this.state.listEpoch;
        void this.state.listSettingsRevision;
        const built = buildListTableModel({
            data: this.props.data,
            columns: this.props.columns as (IColumnData | IColumnData[])[] | undefined,
            dataManager: (this.props.DataManager ?? this.DataManager) as Parameters<typeof buildListTableModel>[0]['dataManager'],
            scope: this.settingsScope(),
        });
        const columns = this.state.rootOrder
            ? reorderByRootOrder(built.columns, this.state.rootOrder)
            : built.columns;
        return {
            data: built.data,
            columns,
            sourceColumns: built.sourceColumns,
        };
    }

    handleToggleGroup = (groupKey: string) => {
        this.setState((prev) => {
            const { data } = this.tableModel();
            const next = new Set(prev.expandedGroups === 'all' ? collectGroupKeys(data) : prev.expandedGroups);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            return { expandedGroups: next };
        });
    };

    handleColumnSort = (field: string) => {
        const scope = this.settingsScope();
        const current = readSortRules(scope);
        const next = cycleSortRules(current, field);
        const last = next.find((rule) => rule.field === field);
        withListSettingsScope(scope, () => {
            commitSortRules(next);
        });
        this.extra().onSortRulesChange?.(next);
        this.extra().onSort?.({ column: field, direction: last && last.enabled ? last.direction : null });
        this.setState({ listSettingsRevision: getListSettingsRevision() });
    };

    handleColumnMove = (fromRootId: string, toRootId: string) => {
        const { columns } = this.tableModel();
        const ids = columns.map((col, index) => (Array.isArray(col) ? `group:${index}` : `col:${(col as IColumnData).name}`));
        const from = ids.indexOf(fromRootId);
        const to = ids.indexOf(toRootId);
        const next = reorderColumns(columns, fromRootId, toRootId);
        const nextIds = next.map((col, index) => (Array.isArray(col) ? `group:${index}` : `col:${(col as IColumnData).name}`));
        this.setState({ rootOrder: nextIds });
        if (from >= 0 && to >= 0) {
            this.extra().onColumnMove?.(from, to);
        }
    };

    handleColumnResize = (leaf: LeafTrack, width: number) => {
        this.setState((prev) => ({
            widthOverrides: { ...prev.widthOverrides, [leaf.id]: width },
        }));
        if (leaf.field) {
            this.extra().onColumnResize?.(leaf.field, width);
        }
    };

    startRowDrag = (event: ReactPointerEvent<HTMLButtonElement>, row: DisplayRow, rows: DisplayRow[], geometry: { rows: RowGeometry[] }) => {
        if (row.kind !== 'leaf') {
            return;
        }
        event.stopPropagation();
        const handle = event.currentTarget;
        handle.setPointerCapture(event.pointerId);
        const origin = { x: event.clientX, y: event.clientY };
        let started = false;
        const label = cellText(row, 'name', []).text || cellText(row, 'code', []).text || row.id;

        const onMove = (move: PointerEvent) => {
            if (!started && Math.hypot(move.clientX - origin.x, move.clientY - origin.y) < DRAG_START_PIXELS) {
                return;
            }
            started = true;
            this.autoScroll(move.clientY);
            const over = this.rowAtClientY(move.clientY, rows, geometry);
            this.setState({
                drag: {
                    kind: 'row',
                    fromId: row.id,
                    overId: over?.id ?? row.id,
                    x: move.clientX,
                    y: move.clientY,
                    label,
                },
            });
        };
        const onUp = (up: PointerEvent) => {
            handle.releasePointerCapture(up.pointerId);
            handle.removeEventListener('pointermove', onMove);
            handle.removeEventListener('pointerup', onUp);
            const over = this.rowAtClientY(up.clientY, rows, geometry);
            const targetId = over ? leafIdForTarget(rows, over.id, row.id) : null;
            this.setState({ drag: null });
            if (started && targetId && targetId !== row.id) {
                this.extra().onRowMove?.(row.id, targetId);
            }
        };
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
    };

    startColDrag = (event: ReactPointerEvent<HTMLDivElement>, leaf: LeafTrack, leaves: LeafTrack[], colWidths: number[], treeWidth: number) => {
        event.preventDefault();
        event.stopPropagation();
        const handle = event.currentTarget;
        handle.setPointerCapture(event.pointerId);
        const origin = { x: event.clientX, y: event.clientY };
        let started = false;
        const onMove = (move: PointerEvent) => {
            if (!started && Math.hypot(move.clientX - origin.x, move.clientY - origin.y) < DRAG_START_PIXELS) {
                return;
            }
            started = true;
            const over = this.leafAtClientX(move.clientX, leaves, colWidths, treeWidth);
            this.setState({
                drag: {
                    kind: 'col',
                    fromRootId: leaf.rootId,
                    overRootId: over?.rootId ?? leaf.rootId,
                    x: move.clientX,
                    y: move.clientY,
                    label: leaf.title,
                },
            });
        };
        const onUp = (up: PointerEvent) => {
            handle.releasePointerCapture(up.pointerId);
            handle.removeEventListener('pointermove', onMove);
            handle.removeEventListener('pointerup', onUp);
            const over = this.leafAtClientX(up.clientX, leaves, colWidths, treeWidth);
            this.setState({ drag: null });
            if (started && over && over.rootId !== leaf.rootId) {
                this.handleColumnMove(leaf.rootId, over.rootId);
            }
        };
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
    };

    startResize = (event: ReactPointerEvent<HTMLSpanElement>, leaf: LeafTrack, startWidth: number) => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const onMove = (move: PointerEvent) => {
            this.handleColumnResize(leaf, Math.max(60, startWidth + move.clientX - startX));
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    autoScroll = (clientY: number) => {
        const scroller = this.scrollerRef.current;
        if (!scroller) {
            return;
        }
        const rect = scroller.getBoundingClientRect();
        if (clientY < rect.top + 28) {
            scroller.scrollTop -= 16;
        } else if (clientY > rect.bottom - 28) {
            scroller.scrollTop += 16;
        }
    };

    rowAtClientY(clientY: number, rows: DisplayRow[], geometry: { rows: RowGeometry[] }): DisplayRow | null {
        const scroller = this.scrollerRef.current;
        if (!scroller || rows.length === 0) {
            return null;
        }
        const pixel = scroller.scrollTop + clientY - scroller.getBoundingClientRect().top;
        const index = getRowIndexAtPixel(geometry.rows, pixel);
        return rows[index] ?? null;
    }

    leafAtClientX(clientX: number, leaves: LeafTrack[], colWidths: number[], treeWidth: number): LeafTrack | null {
        const scroller = this.scrollerRef.current;
        if (!scroller) {
            return null;
        }
        const x = clientX - scroller.getBoundingClientRect().left + scroller.scrollLeft - treeWidth;
        let cursor = 0;
        for (let i = 0; i < leaves.length; i++) {
            const width = colWidths[i] ?? leaves[i].width;
            if (x < cursor + width) {
                return leaves[i];
            }
            cursor += width;
        }
        return leaves[leaves.length - 1] ?? null;
    }

    render(): ReactNode {
        const { data, columns } = this.tableModel();
        this.publishColumnCatalog(columns);
        const scope = this.settingsScope();
        const rules = (getConditionalFormattingSettingsState(scope).conditionalFormattingRules ?? []) as CfRule[];
        const grouping = data.length > 0 && isTreeRow(data[0]) && Boolean((data[0] as ITreeRow).isGroup);
        const hierarchy = this.isHierarchical();
        const hierarchyWidth = hierarchy ? HIERARCHY_COLUMN_WIDTH : 0;
        const drilledHierarchy = hierarchy && this.state.hierarchyHistory.length > 1;
        const treeWidth = hierarchyWidth + (grouping ? 260 : 32) + CHECK_WIDTH;
        const leafHeight = Math.max(36, getConfigCellHeight(columns));
        const built = buildLeaves(columns);
        const sortRules = readSortRules(scope);
        const enabledSort = sortRules.filter((rule) => rule.enabled);
        const sortState = new Map(enabledSort.map((rule, index) => [rule.field, { direction: rule.direction, index, count: enabledSort.length }]));

        const drag = this.state.drag;
        const rowDrag = drag?.kind === 'row' ? drag : null;
        const colDrag = drag?.kind === 'col' ? drag : null;
        let leaves = built.leaves;
        if (colDrag) {
            leaves = moveLeavesByRoot(leaves, colDrag.fromRootId, colDrag.overRootId);
        }
        const bodyWidth = Math.max(0, this.state.viewportWidth - treeWidth);
        const colWidths = allocateColumnWidths(leaves, bodyWidth, this.state.widthOverrides);
        const paintedLefts = prefixOffsets(colWidths);
        const totalWidth = treeWidth + colWidths.reduce((sum, width) => sum + width, 0);
        const titles = bandTitleByRoot(columns);

        const rows = flattenRows(data, this.state.expandedGroups, rules);
        const paintedRows = rowDrag ? moveRow(rows, rowDrag.fromId, rowDrag.overId) : rows;
        const heights = paintedRows.map((row) => (row.kind === 'group' ? 42 : leafHeight));
        const geometry = buildRowGeometry(heights);
        const range = firstAndLastRowsToRender(geometry.rows, this.state.scrollTop, this.state.viewportHeight, leafHeight);
        const visible = paintedRows.slice(Math.max(0, range.first), range.last + 1);
        const dropOverIndex = rowDrag ? paintedRows.findIndex((row) => row.id === rowDrag.overId) : -1;
        const dropTop = dropOverIndex >= 0 ? geometry.rows[dropOverIndex]?.top : undefined;

        const className = [
            'data-table',
            'cnt-nested-table',
            'is-row-animation',
            this.state.afterCreated ? 'is-after-created' : '',
            this.state.scrolling && !drag ? 'is-prevent-animation' : '',
            colDrag ? 'is-column-moving' : '',
        ]
            .filter(Boolean)
            .join(' ');

        this.layout = { rows: paintedRows, leaves, geometry };

        const tableHeight = typeof this.props.height === 'number' && this.props.height > 0 ? this.props.height : undefined;

        return (
            <div className={className} style={tableHeight ? { height: tableHeight } : undefined}>
                <div className="data-table__header" ref={this.headerRef}>
                    {built.hasGroupHeader && (
                        <div className="data-table__header-row" style={{ width: totalWidth, height: 36 }}>
                            <div className={`data-table__hcell data-table__pinned${hierarchy ? ' has-hierarchy' : ''}`} style={{ left: 0, width: treeWidth }}>
                                {hierarchy ? this.renderHierarchyHeader(drilledHierarchy) : null}
                                {grouping ? 'Группа' : ''}
                            </div>
                            {renderBands(leaves, colWidths, paintedLefts, treeWidth, titles, this.state.drag, this.startColDrag, this.startResize)}
                        </div>
                    )}
                    <div className="data-table__header-row" style={{ width: totalWidth, height: 36 }}>
                        <div className={`data-table__hcell data-table__pinned${hierarchy ? ' has-hierarchy' : ''}`} style={{ left: 0, width: treeWidth }}>
                            {hierarchy ? (built.hasGroupHeader ? <span className="data-table__hierarchy" /> : this.renderHierarchyHeader(drilledHierarchy)) : null}
                            {grouping ? (built.hasGroupHeader ? '' : 'Группа') : ''}
                        </div>
                        {leaves.map((leaf, index) => {
                            const field = leaf.field ?? leaf.stackLeaves?.[0]?.name;
                            const sort = field ? sortState.get(field) : undefined;
                            const headerText = leaf.kind === 'stack' && built.hasGroupHeader ? '' : leaf.title;
                            const dragging = this.state.drag?.kind === 'col' && this.state.drag.fromRootId === leaf.rootId;
                            const over = this.state.drag?.kind === 'col' && this.state.drag.overRootId === leaf.rootId;
                            return (
                                <div
                                    key={leaf.id}
                                    className={`data-table__hcell${over ? ' is-drop' : ''}${dragging ? ' is-col-dragging' : ''}${sort ? ' is-sorted' : ''}`}
                                    style={{ left: treeWidth + paintedLefts[index], width: colWidths[index] }}
                                    title={headerText || leaf.title}
                                    onPointerDown={(event) => this.startColDrag(event, leaf, built.leaves, colWidths, treeWidth)}
                                >
                                    <span className="data-table__hlabel">{headerText}</span>
                                    {field && (
                                        <button
                                            type="button"
                                            className="data-table__sort"
                                            title="Сортировка"
                                            onPointerDown={(event) => event.stopPropagation()}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                this.handleColumnSort(field);
                                            }}
                                        >
                                            <span className={`data-table__sort-arrow${sort?.direction === 'ASC' ? ' is-active' : ''}`}>▲</span>
                                            <span className={`data-table__sort-arrow${sort?.direction === 'DESC' ? ' is-active' : ''}`}>▼</span>
                                            {sort && sort.count > 1 && <span className="data-table__sort-index">{sort.index + 1}</span>}
                                        </button>
                                    )}
                                    <span className="data-table__resize" onPointerDown={(event) => this.startResize(event, leaf, colWidths[index])} />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div
                    className="data-table__scroll"
                    ref={this.scrollerRef}
                    tabIndex={0}
                    role="grid"
                    onKeyDown={this.handleTableKeyDown}
                >
                    {data.length === 0 ? (
                        <div className="data-table__empty">Нет данных</div>
                    ) : (
                        <div className="data-table__body" style={{ minHeight: geometry.totalHeight, width: totalWidth }}>
                            {dropTop != null && <div className="data-table__drop-line" style={{ transform: `translateY(${dropTop}px)` }} />}
                            {visible.map((row, offset) => {
                                const index = range.first + offset;
                                const geo = geometry.rows[index];
                                if (!geo) {
                                    return null;
                                }
                                const dragging = Boolean(rowDrag && rowDrag.fromId === row.id);
                                const selected = row.kind === 'leaf' && this.state.selectedRecordIds.includes(this.rowKey(row));
                                const groupStyle = row.substringHit ? substringGroupStyle(rules) : {};
                                return (
                                    <div
                                        key={row.id}
                                        className={[
                                            'data-table__row',
                                            row.kind === 'group' ? 'is-group-row' : '',
                                            selected ? 'is-selected' : '',
                                            dragging ? 'is-dragging' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        style={{
                                            height: geo.height,
                                            width: totalWidth,
                                            transform: `translateY(${geo.top}px)`,
                                            ...(row.kind === 'group' ? groupStyle : {}),
                                        }}
                                        onClick={(event) => {
                                            if (row.kind === 'group' && row.groupKey) {
                                                this.handleToggleGroup(row.groupKey);
                                                return;
                                            }
                                            const target = event.target;
                                            if (target instanceof Element && target.closest('button')) {
                                                return;
                                            }
                                            this.handleRowSelect(event, row);
                                        }}
                                        onDoubleClick={(event) => {
                                            const target = event.target;
                                            if (target instanceof Element && target.closest('button')) {
                                                return;
                                            }
                                            this.openRowEditor(row);
                                        }}
                                    >
                                        <div className={`data-table__cell data-table__pinned${hierarchy ? ' has-hierarchy' : ''}`} style={{ left: 0, width: treeWidth, ...(row.kind === 'group' ? groupStyle : {}) }}>
                                            {hierarchy ? (
                                                <span className="data-table__hierarchy">
                                                    {row.kind === 'leaf' ? (
                                                        <IconButton
                                                            variant="outlined"
                                                            icon={PlusIcon}
                                                            size="small"
                                                            onClick={(event: { stopPropagation: () => void }) => {
                                                                event.stopPropagation();
                                                                if (row.recordId) {
                                                                    void this.onHierarchyExpand(row.recordId);
                                                                }
                                                            }}
                                                            onDoubleClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
                                                        />
                                                    ) : null}
                                                </span>
                                            ) : null}
                                            {row.kind === 'leaf' && (
                                                <button
                                                    type="button"
                                                    className="data-table__row-drag"
                                                    onPointerDown={(event) => this.startRowDrag(event, row, rows, geometry)}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onDoubleClick={(event) => event.stopPropagation()}
                                                >
                                                    <RowDragIcon />
                                                </button>
                                            )}
                                            {row.kind === 'group' ? (
                                                <span className="data-table__group-cell" style={{ paddingLeft: row.depth * 16 }}>
                                                    <span className="data-table__group-marker">
                                                        {row.expanded ? <GroupMarkerDown /> : <GroupMarkerRight />}
                                                    </span>
                                                    <strong className="data-table__group-value">{formatCellValue(row.groupValue)}</strong>
                                                    <span className="data-table__group-count">{row.leafCount}</span>
                                                </span>
                                            ) : grouping ? (
                                                <span className="data-table__leaf-cell">
                                                    {cellText(row, 'name', rules).text || cellText(row, 'code', rules).text}
                                                </span>
                                            ) : null}
                                        </div>
                                        {leaves.map((leaf, leafIndex) => {
                                            if (row.kind === 'group') {
                                                return (
                                                    <div
                                                        key={leaf.id}
                                                        className="data-table__cell"
                                                        style={{
                                                            left: treeWidth + paintedLefts[leafIndex],
                                                            width: colWidths[leafIndex],
                                                            ...groupStyle,
                                                        }}
                                                    />
                                                );
                                            }
                                            if (leaf.kind === 'stack') {
                                                const stackField = leaf.stackLeaves?.[0]?.name;
                                                return (
                                                    <div
                                                        key={leaf.id}
                                                        className="data-table__cell"
                                                        style={{ left: treeWidth + paintedLefts[leafIndex], width: colWidths[leafIndex] }}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            this.handleRowSelect(event, row, stackField);
                                                        }}
                                                        onDoubleClick={(event) => {
                                                            event.stopPropagation();
                                                            this.openRowEditor(row);
                                                        }}
                                                    >
                                                        <div className="data-table__stack">
                                                            {(leaf.stackLeaves ?? []).map((column) => {
                                                                const painted = cellText(row, column.name, rules);
                                                                if (!painted.text) {
                                                                    return null;
                                                                }
                                                                return (
                                                                    <div key={column.name} className="data-table__stack-line" style={painted.style}>
                                                                        <span className="data-table__stack-label">{column.label ?? column.name}</span>
                                                                        <span>{painted.text}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            const field = leaf.field!;
                                            const painted = cellText(row, field, rules);
                                            const editable = this.isCellEditable(row.id, field);
                                            const isActive = isSameCell(this.state.activeCell, row.id, field);
                                            const isEditing = isSameCell(this.state.editingCell, row.id, field);
                                            const cellClassName = [
                                                'data-table__cell',
                                                columnDragging(this.state.drag, leaf.rootId) ? 'is-col-dragging' : '',
                                                editable ? 'is-editable' : '',
                                                isActive ? 'is-active' : '',
                                                isEditing ? 'is-editing' : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ');

                                            return (
                                                <div
                                                    key={leaf.id}
                                                    className={cellClassName}
                                                    data-row-id={row.id}
                                                    data-field={field}
                                                    title={painted.empty ? 'Нет значения' : painted.text || leaf.title}
                                                    style={{
                                                        left: treeWidth + paintedLefts[leafIndex],
                                                        width: colWidths[leafIndex],
                                                        ...painted.style,
                                                    }}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        this.handleRowSelect(event, row, field);
                                                    }}
                                                    onDoubleClick={(event) => {
                                                        event.stopPropagation();
                                                        this.openRowEditor(row);
                                                    }}
                                                >
                                                    {isEditing ? (
                                                        <input
                                                            ref={this.inputRef}
                                                            className="data-table__cell-input"
                                                            value={this.state.draft}
                                                            onChange={(event) => this.setState({ draft: event.target.value })}
                                                            onKeyDown={this.handleEditorKeyDown}
                                                            onBlur={this.commitEditing}
                                                            onClick={(event) => event.stopPropagation()}
                                                            onDoubleClick={(event) => event.stopPropagation()}
                                                        />
                                                    ) : painted.empty ? (
                                                        <span className="data-table__empty-value">—</span>
                                                    ) : (
                                                        <span className="data-table__value">{painted.text}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                {this.state.drag && (
                    <div className="data-table__ghost" style={{ left: this.state.drag.x + 12, top: this.state.drag.y + 12 }}>
                        {this.state.drag.label}
                    </div>
                )}
            </div>
        );
    }
}

function reorderByRootOrder(columns: GroupedColumn[], order: string[]): GroupedColumn[] {
    const currentIds = columns.map((col, index) => (Array.isArray(col) ? `group:${index}` : `col:${(col as IColumnData).name}`));
    if (currentIds.length !== order.length) {
        return columns;
    }
    const byOld = new Map(currentIds.map((id, index) => [id, columns[index]]));
    const next = order.map((id) => byOld.get(id)).filter((item): item is GroupedColumn => item != null);
    return next.length === columns.length ? next : columns;
}

function renderBands(
    leaves: LeafTrack[],
    colWidths: number[],
    paintedLefts: number[],
    treeWidth: number,
    titles: Map<string, string>,
    drag: DragState | null,
    onDragStart: (event: ReactPointerEvent<HTMLDivElement>, leaf: LeafTrack, leaves: LeafTrack[], colWidths: number[], treeWidth: number) => void,
    onResize: (event: ReactPointerEvent<HTMLSpanElement>, leaf: LeafTrack, startWidth: number) => void
): ReactNode {
    const bands: { title: string; start: number; span: number; rootId: string }[] = [];
    let index = 0;
    while (index < leaves.length) {
        const rootId = leaves[index].rootId;
        let span = 1;
        while (index + span < leaves.length && leaves[index + span].rootId === rootId) {
            span += 1;
        }
        bands.push({ title: titles.get(rootId) ?? '', start: index, span, rootId });
        index += span;
    }
    return bands.map((band) => {
        const owner = leaves[band.start];
        const width = colWidths.slice(band.start, band.start + band.span).reduce((sum, value) => sum + value, 0);
        const dragging = drag?.kind === 'col' && drag.fromRootId === band.rootId;
        const over = drag?.kind === 'col' && drag.overRootId === band.rootId;
        return (
            <div
                key={band.rootId}
                className={`data-table__hcell data-table__hband${dragging ? ' is-col-dragging' : ''}${over ? ' is-drop' : ''}`}
                style={{ left: treeWidth + paintedLefts[band.start], width }}
                title={band.title}
                onPointerDown={(event) => owner && onDragStart(event, owner, leaves, colWidths, treeWidth)}
            >
                <span className="data-table__hlabel">{band.title}</span>
                {owner && (
                    <span className="data-table__resize" onPointerDown={(event) => onResize(event, owner, width)} />
                )}
            </div>
        );
    });
}

function RowDragIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="6" cy="4" r="1.2" fill="currentColor" />
            <circle cx="10" cy="4" r="1.2" fill="currentColor" />
            <circle cx="6" cy="8" r="1.2" fill="currentColor" />
            <circle cx="10" cy="8" r="1.2" fill="currentColor" />
            <circle cx="6" cy="12" r="1.2" fill="currentColor" />
            <circle cx="10" cy="12" r="1.2" fill="currentColor" />
        </svg>
    );
}

export type { ExtraTableProps, ConfigurableNestedTableProps } from './types';

export default ConfigurableNestedTable;