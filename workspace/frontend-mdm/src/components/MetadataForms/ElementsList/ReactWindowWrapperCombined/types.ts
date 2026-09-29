import type { ReactNode, CSSProperties, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import type { IActiveCell, ICell, IColumnConfig } from '../types';

export interface IColumnData {
    name: string;
    label: string;
    order?: 'ASC' | 'DESC';
    /** Пользовательская ширина ячейки колонки в px. */
    cellWidth?: number;
    /** Растягивать колонку по горизонтали. */
    cellFlexGrow?: boolean;
    /** Пользовательская высота ячейки колонки в px. */
    cellHeight?: number;
    /** Растягивать колонку по вертикали. */
    cellExpandVertical?: boolean;
}

/**
 * Группа колонок в шапке таблицы: массив колонок плюс название родительской группы,
 * которое выводится как родительский столбец над дочерними колонками.
 * `orientation` — направление группировки: «vertical» группа сворачивается
 * в одну колонку с ячейками в порядке иерархии.
 */
export interface IColumnGroupData extends Array<IColumnData> {
    title?: string;
    orientation?: 'horizontal' | 'vertical';
}

export interface IColumnMetadata {
    x: number;
    width: number;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
    data: IColumnData | IColumnData[];
}

export interface InnerColumnMetadata {
    x: number;
    width: number;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
}

export interface InnerColumnMetadataProps {
    id: string;
    label: string;
    show: boolean;
    type: string;
    value: string;
    [key: string]: unknown;
}

export interface ITreeRow {
    cells: ICell | ICell[];
    children?: ITreeRow[] | Record<string, unknown>[];
    [key: string]: unknown;
}

export interface IInnerColumnMetadata {
    x: number;
    width: number;
}

export interface IInnerColumnMetadataProps {
    id: string;
    label: string;
    show: boolean;
    type: string;
    value: string;
    [key: string]: unknown;
}

export type TableRowData = (ICell | ICell[])[];

export interface CellInteractionPayload {
    columnIndex: number;
    rowIndex: number;
    groupIndex?: number;
    colInGroupIndex?: number;
}

export interface CellRenderMetadata {
    rowIndex: number;
    columnIndex: number;
}

export interface IReactWindowWrapperCombinedProps {
    data: TableRowData[];
    cols: (IColumnData | IColumnData[])[];
    isLoadingMore: boolean;
    loadNext: () => void;
    loadPrev: () => void;
    hasNext: boolean;
    hasPrev: boolean;
    activeCell?: IActiveCell | null;
    hasExpendedHierarchy?: boolean;
    selectedRows?: number[];
    hierarchy?: boolean;
    onHierarchyBack?: () => void;
    onHierarchyExpand?: (rowIndex: number) => void;
    onSort?: (columnName: string, value: 'ASC' | 'DESC') => void;
    onFilter?: (columnName: string) => void;
    onColumnConfigChange?: (config: (IColumnConfig | IColumnConfig[])[]) => void;
    onKeyDown?: (event: KeyboardEvent, cellData: ICell | ICell[] | null) => void;
    onCellClick?: (event: MouseEvent, payload: CellInteractionPayload) => void;
    onDoubleClick?: (event: MouseEvent, payload: Pick<CellInteractionPayload, 'columnIndex' | 'rowIndex'>) => void;
    renderMetaInput?: (cellData: ICell | ICell[], metadata: CellRenderMetadata) => ReactNode;
    width?: number;
    height?: number;
}

export interface IReactWindowWrapperCombined {
    data: (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[];
    columns?: InnerColumnMetadataProps[];
    [key: string]: unknown;
}

export interface IReactWindowWrapperCombinedState {
    scrollLeft: number;
    scrollTop: number;
    mergedLength: number;
    width: number;
    height: number;
    resizingIndex: number | null;
    startX: number;
    startWidth: number;
    columnsMetadata: InnerColumnMetadata[];
    hoveredRowIndex: number | null;
    desiredColumnWidth: number[];
}

export type TableContextValueType = Pick<IReactWindowWrapperCombinedProps, 'cols' | 'onSort' | 'onHierarchyBack'> &
    Pick<
        IReactWindowWrapperCombinedState,
        'resizingIndex' | 'startX' | 'startWidth' | 'columnsMetadata' | 'hoveredRowIndex'
    > & {
        hasColumnsHeader: boolean;
        mergedLength: number;
        hasHierarchy: boolean;
        handleResizeStart: (columnIndex: number, startX: number) => void;
        handleResize: (clientX: number) => void;
        handleResizeEnd: () => void;
        hasExpandedHierarchy: boolean;
        onRowHover: (rowIndex: number | null) => void;
    };

export interface IInnerGridElementProps {
    children: ReactElement[];
    style: CSSProperties;
}
