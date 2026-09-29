import { applyListViewToFlatRows, getActiveListView } from '../../../../helpers/listSettings';
import type { ICell } from '../../ElementsList/types';
import type { ITreeRow } from '../types';
import { isTreeRow, normalizeCells } from './treeRows';
import type { TableSource } from './fromDataManager';

function isCell(item: unknown): item is ICell {
    return Boolean(item && typeof item === 'object' && !Array.isArray(item) && 'columnName' in item && 'value' in item);
}

function flattenRowCells(row: unknown): ICell[] {
    if (isCell(row)) {
        return [row];
    }
    if (!Array.isArray(row)) {
        return [];
    }
    return row.flatMap((part) => flattenRowCells(part));
}

function isCellRowOrGroup(item: unknown): boolean {
    if (isCell(item)) {
        return true;
    }
    if (!Array.isArray(item) || item.length === 0) {
        return false;
    }
    return isCell(item[0]) || isCellRowOrGroup(item[0]);
}

function flattenItem(item: TableSource): ICell[][] {
    if (isTreeRow(item) && item.isGroup) {
        const children = (item.children ?? []) as TableSource[];
        return children.flatMap((child) => flattenItem(child));
    }
    if (isTreeRow(item)) {
        return [flattenRowCells(normalizeCells(item.cells as ICell | ICell[]))];
    }
    if (isCell(item)) {
        return [[item]];
    }
    if (Array.isArray(item)) {
        if (item.length === 0) {
            return [[]];
        }
        if (isCellRowOrGroup(item)) {
            return [flattenRowCells(item)];
        }
        return (item as TableSource[]).flatMap((child) => flattenItem(child));
    }
    return [];
}

export function flattenTableDataToCellRows(data: TableSource[]): ICell[][] {
    return data.flatMap((item) => flattenItem(item));
}

export function applyListViewToTableData(data: TableSource[], scope?: string): TableSource[] {
    const flatRows = flattenTableDataToCellRows(data);
    if (typeof applyListViewToFlatRows !== 'function') {
        return flatRows.length > 0 ? flatRows : data;
    }
    if (flatRows.length === 0) {
        return data;
    }
    const view = typeof getActiveListView === 'function' ? getActiveListView(scope) : undefined;
    const viewed = view ? applyListViewToFlatRows(flatRows, view) : applyListViewToFlatRows(flatRows);
    return Array.isArray(viewed) ? (viewed as TableSource[]) : data;
}
