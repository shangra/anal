import {
    getColumnGroupingCatalog,
    getColumnGroupingSettingsState,
    getListSettingsState,
    getSortSettingsState,
    getUsedColumnFieldIds,
    listSettingsActions,
    setColumnGroupingCatalog,
    sortSettingsActions,
    columnGroupingSettingsActions,
    type ColumnGroupNode,
} from '../../../../helpers/listSettings';
import type { IColumnData } from '../types';

type TableColumn = IColumnData | (IColumnData | TableColumn)[];

type CatalogField = {
    id: string;
    label: string;
    value: string;
    isGroupLevel: boolean;
    children: CatalogField[];
};

function collectLeaves(columns: TableColumn[], target: IColumnData[]): void {
    for (const col of columns) {
        if (Array.isArray(col)) {
            collectLeaves(col, target);
        } else if (col?.name) {
            target.push(col);
        }
    }
}

function catalogKey(fields: { value: string; label: string }[]): string {
    return fields.map((field) => `${field.value}\t${field.label}`).join('\n');
}

export function fieldsFromTableColumns(columns: TableColumn[]): CatalogField[] {
    const leaves: IColumnData[] = [];
    collectLeaves(columns, leaves);
    return leaves.map((col) => ({
        id: col.name,
        label: col.label || col.name,
        value: col.name,
        isGroupLevel: false,
        children: [],
    }));
}

function mergeMissingColumnsIntoTree(fields: CatalogField[]): void {
    const used = new Set(getUsedColumnFieldIds());
    const missing = fields.map((field) => field.value).filter((value) => value && !used.has(value));
    if (missing.length === 0) {
        return;
    }
    columnGroupingSettingsActions.addColumns('root', missing);
}

function pruneToTableColumns(node: ColumnGroupNode, allowed: Set<string>, seen: Set<string> = new Set()): ColumnGroupNode | null {
    if (node.kind === 'column') {
        if (!node.fieldId || !allowed.has(node.fieldId) || seen.has(node.fieldId)) {
            return null;
        }
        seen.add(node.fieldId);
        return node;
    }
    const children: ColumnGroupNode[] = [];
    for (const child of node.children ?? []) {
        const next = pruneToTableColumns(child, allowed, seen);
        if (next) {
            children.push(next);
        }
    }
    if (node.kind === 'group' && (node.children?.length ?? 0) > 0 && children.length === 0) {
        return null;
    }
    return { ...node, children };
}

function dropColumnsFromOtherTables(fields: CatalogField[]): void {
    const allowed = new Set<string>();
    for (const field of fields) {
        if (field.value) {
            allowed.add(field.value);
        }
    }
    const state = getColumnGroupingSettingsState();
    if (!state?.root) {
        return;
    }
    const root = pruneToTableColumns(state.root, allowed);
    if (!root || JSON.stringify(root) === JSON.stringify(state.root)) {
        return;
    }
    columnGroupingSettingsActions.restoreSnapshot({ ...state, root });
}

export function syncListSettingsCatalogFromTable(columns: TableColumn[]): string {
    const fields = fieldsFromTableColumns(columns);
    const key = catalogKey(fields);
    if (fields.length === 0) {
        return key;
    }

    const grouping = getListSettingsState().availableFields ?? [];
    const sort = getSortSettingsState().availableFields ?? [];
    const columnGrouping = getColumnGroupingCatalog() ?? [];
    if ((grouping ?? []).length === 0) {
        listSettingsActions.setAvailableFields(fields);
    }
    if ((sort ?? []).length === 0) {
        sortSettingsActions.setAvailableFields(fields);
    }
    if (catalogKey(columnGrouping) !== key) {
        setColumnGroupingCatalog(fields);
    }
    dropColumnsFromOtherTables(fields);
    columnGroupingSettingsActions.seedColumnsFromCatalog();
    mergeMissingColumnsIntoTree(fields);
    return key;
}
