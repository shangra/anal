import type { ICell, IDataColumn } from '../../ElementsList/types';
import { transformStateForRender } from '../../ElementsList/utils/transformStateForRender';
import {
    applyColumnGroupingToCols,
    applyListViewToFlatRows,
    applySortToRows,
    flattenGroupedColumns,
    getActiveGroupFields,
    getActiveListView,
    getColumnGroupingSettingsState,
    getSortSettingsState,
    listSettingsScopeKey,
    type ColumnGroupNode,
    type GroupedColumnsOutput,
} from '../../../../helpers/listSettings';
import type { IColumnData } from '../types';
import { applyListViewToTableData } from './applyListView';
import type { TableSource } from './fromDataManager';

type MetaColumn = IDataColumn & { label?: string };

type DataManagerLike = {
    metaOwner?: string;
    data?: { list?: unknown };
    meta?: { list?: { cols?: MetaColumn[]; refs?: Record<string, Record<string, string>>; count?: number } };
    metadata?: { treeObject?: { Fields?: Record<string, Partial<MetaColumn> & { type?: string }> } };
};

type GroupedColumn = IColumnData | (GroupedColumn[] & { title?: string; orientation?: 'horizontal' | 'vertical' });

export type ListTableModel = {
    data: TableSource[];
    columns: GroupedColumn[];
    sourceColumns: GroupedColumn[];
};

function isRecordRow(item: unknown): item is Record<string, unknown> {
    return Boolean(
        item &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            !('columnName' in item) &&
            !('cells' in item)
    );
}

function cellColumnNames(rows: ICell[][]): Set<string> {
    const names = new Set<string>();
    for (const row of rows) {
        for (const cell of row) {
            if (cell?.columnName) {
                names.add(cell.columnName);
            }
        }
    }
    return names;
}

function resolveGroupFields(fields: string[], rows: ICell[][], cols: MetaColumn[]): string[] {
    const alias = aliasToField(cols);
    const names = cellColumnNames(rows);
    const resolved: string[] = [];
    for (const field of fields) {
        const mapped = alias.get(field) ?? field;
        let match = '';
        if (names.has(mapped)) {
            match = mapped;
        } else if (names.has(field)) {
            match = field;
        } else {
            const lower = mapped.toLowerCase();
            for (const name of names) {
                if (name.toLowerCase() === lower) {
                    match = name;
                    break;
                }
            }
        }
        const next = match || field;
        if (!resolved.includes(next)) {
            resolved.push(next);
        }
    }
    return resolved;
}

function groupFieldsForTable(scope: string | undefined, metaOwner?: string): string[] {
    const read = (key?: string): string[] => (typeof getActiveGroupFields === 'function' ? getActiveGroupFields(key) : []);
    const own = read(scope);
    if (own.length > 0) {
        return own;
    }
    if (metaOwner) {
        const listScope = listSettingsScopeKey({ metaOwner, name: 'list' });
        if (listScope !== scope) {
            const fromList = read(listScope);
            if (fromList.length > 0) {
                return fromList;
            }
        }
    }
    return own;
}

function applyView(rows: ICell[][], scope: string | undefined, cols: MetaColumn[], dm?: DataManagerLike): TableSource[] {
    if (typeof applyListViewToFlatRows !== 'function') {
        return rows;
    }
    const view = typeof getActiveListView === 'function' ? getActiveListView(scope) : undefined;
    const groupFields = resolveGroupFields(groupFieldsForTable(scope, dm?.metaOwner), rows, cols);
    const viewed = view
        ? applyListViewToFlatRows(rows, { ...view, activeGroupFields: groupFields })
        : applyListViewToFlatRows(rows);
    return Array.isArray(viewed) ? (viewed as TableSource[]) : rows;
}

function flattenPreparedRows(rows: (ICell | ICell[])[][]): ICell[][] {
    return rows.map((row) => row.flatMap((cellOrGroup) => (Array.isArray(cellOrGroup) ? cellOrGroup : [cellOrGroup])));
}

function aliasToField(cols: MetaColumn[]): Map<string, string> {
    const alias = new Map<string, string>();
    for (const col of cols) {
        if (!col?.field) {
            continue;
        }
        alias.set(col.field, col.field);
        if (col.name) {
            alias.set(col.name, col.field);
        }
        if (col.description) {
            alias.set(col.description, col.field);
        }
        if (col.label) {
            alias.set(col.label, col.field);
        }
    }
    return alias;
}

function remapTree(node: ColumnGroupNode, alias: Map<string, string>): ColumnGroupNode {
    if (node.kind === 'column') {
        const fieldId = node.fieldId ? (alias.get(node.fieldId) ?? node.fieldId) : node.fieldId;
        return { ...node, fieldId };
    }
    return {
        ...node,
        children: (node.children ?? []).map((child) => remapTree(child, alias)),
    };
}

function collectDisabledFieldIds(node: ColumnGroupNode, into: Set<string>, parentDisabled = false): void {
    const disabled = parentDisabled || node.enabled === false;
    if (node.kind === 'column') {
        if (disabled && node.fieldId) {
            into.add(node.fieldId);
        }
        return;
    }
    for (const child of node.children ?? []) {
        collectDisabledFieldIds(child, into, disabled);
    }
}

function groupColumns(cols: MetaColumn[], scope?: string): GroupedColumnsOutput {
    const state = getColumnGroupingSettingsState(scope);
    if (!state?.root || typeof applyColumnGroupingToCols !== 'function') {
        return cols;
    }
    const root = remapTree(state.root, aliasToField(cols));
    const grouped = applyColumnGroupingToCols(cols, {
        ...state,
        root,
    });
    if (typeof flattenGroupedColumns !== 'function' || flattenGroupedColumns(grouped).length === 0) {
        return cols;
    }
    const shown = new Set(flattenGroupedColumns(grouped).map((col) => col.field));
    const disabled = new Set<string>();
    collectDisabledFieldIds(root, disabled);
    const rest = cols.filter((col) => col.field && !shown.has(col.field) && !disabled.has(col.field));
    return rest.length > 0 ? [...grouped, ...rest] : grouped;
}

function visibleMetaColumns(cols: MetaColumn[], dm: DataManagerLike | undefined): MetaColumn[] {
    const visible = cols.filter((col) => col && col.field && col.show);
    const known = new Set(cols.map((col) => col.field).filter((field): field is string => Boolean(field)));
    const fields = dm?.metadata?.treeObject?.Fields;
    if (!fields) {
        return visible;
    }
    for (const field of Object.values(fields)) {
        if (!field?.show) {
            continue;
        }
        const id = field.field || field.name;
        if (!id || known.has(id)) {
            continue;
        }
        known.add(id);
        visible.push({
            ...field,
            field: id,
            name: field.name || field.description || id,
            description: field.description,
            show: true,
        });
    }
    return visible;
}

function hydrateRows(rows: Record<string, unknown>[], cols: MetaColumn[]): Record<string, unknown>[] {
    return rows.map((row) => {
        const next = { ...row };
        for (const col of cols) {
            if (!col?.field || (next[col.field] != null && next[col.field] !== '')) {
                continue;
            }
            const alias = next[col.name] ?? next[col.description] ?? (col.label ? next[col.label] : undefined);
            if (alias != null) {
                next[col.field] = alias;
            }
        }
        return next;
    });
}

function hydrateRefs(
    refs: Record<string, Record<string, string>> | undefined,
    cols: MetaColumn[]
): Record<string, Record<string, string>> {
    const next = { ...(refs ?? {}) };
    for (const col of cols) {
        if (!col?.field || next[col.field]) {
            continue;
        }
        const alias = next[col.name] ?? next[col.description] ?? (col.label ? next[col.label] : undefined);
        if (alias) {
            next[col.field] = alias;
        }
    }
    return next;
}

function applyRefLabels(rows: ICell[][], refs: Record<string, Record<string, string>>): void {
    for (const row of rows) {
        for (const cell of row) {
            const key = cell?.value?.viewedData == null ? '' : String(cell.value.viewedData);
            const label = refs[cell.columnName]?.[key];
            if (label == null || label === '' || label === key) {
                continue;
            }
            cell.value = {
                ...cell.value,
                viewedData: label,
            };
        }
    }
}

function toTableColumn(col: IColumnData | (IColumnData[] & { title?: string; orientation?: 'horizontal' | 'vertical' })): GroupedColumn {
    return col as GroupedColumn;
}

function fromRecords(rows: Record<string, unknown>[], cols: MetaColumn[], refs: Record<string, Record<string, string>> | undefined, dm: DataManagerLike | undefined, scope?: string): ListTableModel {
    const visible = visibleMetaColumns(cols, dm);
    const view = typeof getActiveListView === 'function' ? getActiveListView(scope) : undefined;
    const fieldTypes = typeof getSortSettingsState === 'function' ? getSortSettingsState(scope).fieldTypes : undefined;
    const sorted =
        typeof applySortToRows === 'function' && view
            ? applySortToRows(rows, view, fieldTypes)
            : rows;
    const groupedCols = groupColumns(visible, scope);
    const transformed = transformStateForRender({
        data: {
            cols: groupedCols as IDataColumn[],
            rows: hydrateRows(sorted, visible),
            refs: hydrateRefs(refs, visible),
            count: sorted.length,
        },
        getFieldType: (fieldName) => dm?.metadata?.treeObject?.Fields?.[fieldName]?.type ?? '',
    });
    const prepared = flattenPreparedRows(transformed.data);
    applyRefLabels(prepared, hydrateRefs(refs, visible));
    return {
        data: applyView(prepared, scope, visible, dm),
        columns: transformed.cols.map((col) => toTableColumn(col)),
        sourceColumns: visible.map((col) => ({
            name: col.field,
            label: col.name || col.description || col.field,
        })),
    };
}

export function buildListTableModel(options: {
    data?: TableSource[];
    columns?: (IColumnData | IColumnData[])[];
    dataManager?: DataManagerLike;
    scope?: string;
}): ListTableModel {
    const dm = options.dataManager;
    const metaCols = dm?.meta?.list?.cols;
    const list = dm?.data?.list;
    if (Array.isArray(list) && list.length > 0 && isRecordRow(list[0]) && Array.isArray(metaCols) && metaCols.length > 0) {
        return fromRecords(list as Record<string, unknown>[], metaCols, dm?.meta?.list?.refs, dm, options.scope);
    }

    const propData = options.data ?? [];
    if (propData.length > 0 && isRecordRow(propData[0]) && Array.isArray(metaCols) && metaCols.length > 0) {
        return fromRecords(propData as Record<string, unknown>[], metaCols, dm?.meta?.list?.refs, dm, options.scope);
    }

    const columns = (options.columns ?? []) as GroupedColumn[];
    return {
        data: applyListViewToTableData(propData, options.scope),
        columns,
        sourceColumns: columns,
    };
}
