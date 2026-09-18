import { MetadataAPI } from 'components/Metadata/MetadataAPI';

// --- Domain types ---
export type ExtColumnTypes = 'string' | 'number' | 'integer' | 'timestamp' | 'datetime' | 'date' | 'boolean' | 'ref' | 'uuid';

export interface Column {
    id: string;
    field: string;
    name: string;
    description?: string;
    type?: ExtColumnTypes;
    ref?: boolean;
    show?: boolean;
}

export interface DataRow {
    id: string;
    [key: string]: unknown;
}

export interface TableData {
    rows: DataRow[];
    cols: Column[];
    refs: {
        [field: string]: {
            [value: string]: string;
        };
    };
    metadata?: {
        id: string;
        formId?: string;
    };
    query?: string;
    ddl?: string;
}

// --- Filter & Sort types ---

export type FilterOperator =
    | 'startsWith'
    | 'endsWith'
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'range'
    | 'greaterThan'
    | 'lessThan'
    | 'greaterThanOrEqual'
    | 'lessThanOrEqual'
    | 'refIn'
    | 'booleanEquals';

export interface FilterCondition {
    field: string;
    operator: FilterOperator;
    value: string;
    valueTo?: string;
}

export type SortDirection = 'ASC' | 'DESC';

export interface SortState {
    field: string;
    direction: SortDirection;
}

export type ColumnType = 'string' | 'number' | 'date' | 'boolean' | 'ref' | 'uuid';

export function detectColumnType(col: Column): ColumnType {
    if (col.ref) return 'ref';
    if (col.type === 'boolean') return 'boolean';
    if (col.type === 'timestamp' || col.type === 'datetime' || col.type === 'date') return 'date';
    if (col.type === 'uuid') return 'uuid';
    if (col.type === 'number' || col.type === 'integer') return 'number';
    return 'string';
}

export interface DataTableProps {
    id: string;
    data: TableData;
    route: string;
    server: string;
    metadataAPI: MetadataAPI;
}

export interface DataTableState {
    data: TableData;
    lastPropsData: TableData;
    filters: Record<string, FilterCondition>;
    sort: SortState | null;
    tab: number;
}

export interface DragState {
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    moved: boolean;
}

export interface RefOption {
    value: string;
    label: string;
}
