import type { ICell } from '../../types';

export interface IColumnData {
    name: string;
    label: string;
    order?: 'ASC' | 'DESC';
    cellWidth?: number;
    cellFlexGrow?: boolean;
    cellHeight?: number;
    cellExpandVertical?: boolean;
}

export interface IColumnGroupData extends Array<IColumnData> {
    title?: string;
    orientation?: 'horizontal' | 'vertical';
}

export interface ITreeRow {
    cells: ICell | ICell[];
    children?: ITreeRow[] | Record<string, unknown>[];
    [key: string]: unknown;
}

export type ExtraTableProps = {
    onSort?: (payload: { column: string; direction: 'ASC' | 'DESC' | null }) => void;
    onSortRulesChange?: (rules: { field: string; direction: 'ASC' | 'DESC'; enabled: boolean }[]) => void;
    onColumnMove?: (fromIndex: number, toIndex: number) => void;
    onColumnResize?: (columnName: string, width: number) => void;
    onRowMove?: (fromId: string, toId: string) => void;
    onCellChange?: (rowId: string, field: string, value: string) => void;
    canEditCell?: (rowId: string, field: string) => boolean;
};

export interface DataTableProps extends ExtraTableProps {
    data: (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[];
    columns?: (IColumnData | IColumnData[])[];
    [key: string]: unknown;
}
