import { ReactNode } from 'react';

export interface IColumn {
    groupIndex?: number | undefined;
    name: string;
    description: string;
    type: string;
    width?: number;
    order: {
        value: 'ASC' | 'DESC' | null;
    } | null;
}

export interface ICell {
    hierarchy: {
        parentId: string;
    } | null;
    columnName: string;
    value: {
        originalData: string;
        viewedData: string;
    };
    type?: string;
    rowIndex: number;
    columnIndex: number;
    editable: {
        render: () => ReactNode;
    } | null;
}

export const generateStringSortParams = (fieldName: string) => [
        {
            icon: 'bi-sort-alpha-up',
            label: 'По алфавиту',
            field: fieldName,
            order: 'ASC',
        },
        {
            icon: 'bi-sort-alpha-down-alt',
            label: 'По алфавиту',
            field: fieldName,
            order: 'DESC',
        },
    ];

export const generateNumberSortParams = (fieldName: string) => [
        {
            icon: 'bi-sort-numeric-up',
            label: 'По значению',
            field: fieldName,
            order: 'ASC',
        },
        {
            icon: 'bi-sort-numeric-down-alt',
            label: 'По значению',
            field: fieldName,
            order: 'DESC',
        },
    ];

export const generateDataSortParams = (fieldName: string) => [
        {
            icon: 'bi-sort-numeric-up',
            label: 'По дате',
            field: fieldName,
            order: 'ASC',
        },
        {
            icon: 'bi-sort-numeric-down-alt',
            label: 'По дате',
            field: fieldName,
            order: 'DESC',
        },
    ];
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
