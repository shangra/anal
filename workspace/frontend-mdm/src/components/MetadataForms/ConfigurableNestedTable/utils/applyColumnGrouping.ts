import type { IDataColumn } from '../../ElementsList/types';
import {
    applyColumnGroupingToCols,
    flattenGroupedColumns,
    getColumnGroupingSettingsState,
    type ColumnGroupEntry,
    type ColumnGroupNode,
    type ColumnGroupingSettingsState,
    type GroupedColumnsOutput,
} from '../../../../helpers/listSettings';
import type { IColumnData } from '../types';

type TableColumn = IColumnData | (TableColumn[] & { title?: string; orientation?: 'horizontal' | 'vertical' });

function collectLeaves(columns: TableColumn[], target: IColumnData[]): void {
    for (const col of columns) {
        if (Array.isArray(col)) {
            collectLeaves(col, target);
        } else if (col?.name) {
            target.push(col);
        }
    }
}

function toDataColumn(col: IColumnData): IDataColumn {
    return {
        field: col.name,
        type: 'string',
        name: col.label || col.name,
        description: col.label || col.name,
        len: 0,
        show: true,
        cellWidth: col.cellWidth,
        cellFlexGrow: col.cellFlexGrow,
        cellHeight: col.cellHeight,
        cellExpandVertical: col.cellExpandVertical,
    };
}

function fromDataColumn(col: IDataColumn, original?: IColumnData): IColumnData {
    return {
        name: col.field,
        label: col.name || original?.label || col.field,
        cellWidth: col.cellWidth ?? original?.cellWidth,
        cellFlexGrow: col.cellFlexGrow ?? original?.cellFlexGrow,
        cellHeight: col.cellHeight ?? original?.cellHeight,
        cellExpandVertical: col.cellExpandVertical ?? original?.cellExpandVertical,
    };
}

function fromGroupedEntry(entry: ColumnGroupEntry, originals: Map<string, IColumnData>): TableColumn {
    if (Array.isArray(entry)) {
        const nested = entry.map((child) => fromGroupedEntry(child, originals)) as TableColumn[] & {
            title?: string;
            orientation?: 'horizontal' | 'vertical';
        };
        nested.title = entry.title;
        nested.orientation = entry.orientation;
        return nested;
    }
    return fromDataColumn(entry, originals.get(entry.field));
}

function remapFieldId(fieldId: string, byName: Set<string>, labelToName: Map<string, string>): string {
    if (byName.has(fieldId)) {
        return fieldId;
    }
    return labelToName.get(fieldId) ?? fieldId;
}

function remapTree(node: ColumnGroupNode, byName: Set<string>, labelToName: Map<string, string>): ColumnGroupNode {
    if (node.kind === 'column') {
        return {
            ...node,
            fieldId: node.fieldId ? remapFieldId(node.fieldId, byName, labelToName) : node.fieldId,
        };
    }
    return {
        ...node,
        children: (node.children ?? []).map((child) => remapTree(child, byName, labelToName)),
    };
}

export function applyColumnGroupingToTableColumns(columns: TableColumn[]): TableColumn[] {
    const leaves: IColumnData[] = [];
    collectLeaves(columns, leaves);
    if (leaves.length === 0) {
        return columns;
    }
    const state = getColumnGroupingSettingsState();
    if (!state.root || state.root.children.length === 0) {
        return columns;
    }
    const byName = new Set(leaves.map((col) => col.name));
    const labelToName = new Map<string, string>();
    for (const col of leaves) {
        const label = (col.label || '').trim();
        if (label && !byName.has(label) && !labelToName.has(label)) {
            labelToName.set(label, col.name);
        }
    }
    const remapped: ColumnGroupingSettingsState = {
        ...state,
        root: remapTree(state.root, byName, labelToName),
    };
    const grouped: GroupedColumnsOutput = applyColumnGroupingToCols(leaves.map(toDataColumn), remapped);
    if (flattenGroupedColumns(grouped).length === 0) {
        return columns;
    }
    const originals = new Map(leaves.map((col) => [col.name, col]));
    return grouped.map((entry) => fromGroupedEntry(entry, originals));
}
