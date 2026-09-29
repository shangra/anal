import type { ReactNode } from 'react'
import type { SelectedEntityData } from '../../../helpers/selected-entity.helper'
import type { IColumnData } from './ReactWindowWrapperCombined/types'
import type DataManager from '../DataManager'

export interface IColumn {
    groupIndex?: number;
    name: string;
    description: string;
    type: string;
    width?: number;
    order: {
        value: 'ASC' | 'DESC' | null;
    } | null;
}

export interface ICellList {
    hierarchy: {
        parentId: string;
    } | null;
    columnName: string;
    value: {
        originalData: string;
        viewedData: string;
    };
    type: string;
    rowIndex: number;
    columnIndex: number;
    editable: boolean;
    render: () => ReactNode;
    parentId?: string | null;
    [key: string]: unknown;
}

export interface ICell {
    columnName: string;
    value: {
        originalData: unknown;
        viewedData: unknown;
    };
    type: string;
    rowIndex: number;
    columnIndex: number;
    editable: unknown;
    hierarchy: unknown;
    [key: string]: unknown;
}

export interface IColumnConfig {
    width: number;
    resizable?: boolean; // false means fixed width
    minWidth?: number;
    maxWidth?: number;
}

export interface IMergedColumnConfig {
    positionIndex?: number;
    sourceFields: string[];
}
export interface IMergedColumns {
    [targetField: string]: IMergedColumnConfig;
}

export interface IActiveCell {
    rowIndex: number;
    columnIndex: number;
    groupIndex?: number;
    colInGroupIndex?: number;
    sourceEvent?:
        | {
              type: 'mouse';
          }
        | {
              type: 'keyboard';
              direction: 'left' | 'right' | 'up' | 'down';
          };
    isEditing?: boolean;
}

export interface IDataColumn {
    field: string;
    type: string;
    name: string;
    description: string;
    len: number;
    hasSorting?: boolean;
    show: boolean;
}

export interface IData {
    rows: DataRow[];
    cols: IDataColumn[];
    refs: Record<string, Record<string, string>>;
    count: number;
}

export type DataRow = Record<string, unknown>

export interface IElementsListProps {
    data: IData;
    tableId: string;
    width: number;
    height: number;
    columns?: string[];
    DataManager: DataManager;
    name: string;
    mergedColumns?: IMergedColumns;
}

export interface ITableState {
    rowCount: number;
    columnsCount: number;
    data: (ICell | ICellList | ICell[])[][];
    cols: (IColumnData | IColumnData[])[];
    activeCell: IActiveCell | null;
    columnConfig?: (IColumnConfig | IColumnConfig[])[];
    meta: {
        prevEditableCell: { rowIndex: number; columnIndex: number } | null;
    } | null
}

export interface IInfiniteScrollState {
    limit: number;
    offset: number;
    pages: number;
    currentPage: number;
    hasPrev?: boolean;
    hasNext?: boolean;
}

export interface IElementsListState {
    data: IData | null;
    table: ITableState | null;
    hierarchyHistory: string[];
    infiniteScroll: IInfiniteScrollState;
    selectRows: number[];
    lastSelectedRow: number | null;
    loading: boolean;
    editableCell: string | null;
    rowIndexToId: Record<string, string>;
    selectedEntity: SelectedEntityData;
    listSettingsRevision: number;
    originalOrder: Record<number, string> | null;
}

export const generateStringSortParams = (fieldName: string) => {
    return [
        {
            icon: 'bi-sort-alpha-up',
            label: 'По алфавиту',
            field: fieldName,
            order: 'ASC' as const,
        },
        {
            icon: 'bi-sort-alpha-down-alt',
            label: 'По алфавиту',
            field: fieldName,
            order: 'DESC' as const,
        },
    ];
};

export const generateNumberSortParams = (fieldName: string) => {
    return [
        {
            icon: 'bi-sort-numeric-up',
            label: 'По значению',
            field: fieldName,
            order: 'ASC' as const,
        },
        {
            icon: 'bi-sort-numeric-down-alt',
            label: 'По значению',
            field: fieldName,
            order: 'DESC' as const,
        },
    ];
};

export const generateDataSortParams = (fieldName: string) => {
    return [
        {
            icon: 'bi-sort-numeric-up',
            label: 'По дате',
            field: fieldName,
            order: 'ASC' as const,
        },
        {
            icon: 'bi-sort-numeric-down-alt',
            label: 'По дате',
            field: fieldName,
            order: 'DESC' as const,
        },
    ];
};