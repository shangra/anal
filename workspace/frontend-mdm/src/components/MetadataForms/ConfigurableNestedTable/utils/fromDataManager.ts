import type { ICell } from '../../ElementsList/types';
import type { IColumnData, ITreeRow } from '../types';
import { isTreeRow } from './treeRows';

type MetaColumn = {
    field?: string;
    name?: string;
    label?: string;
    description?: string;
    show?: boolean;
    type?: string;
    cellWidth?: number;
    cellFlexGrow?: boolean;
    cellHeight?: number;
    cellExpandVertical?: boolean;
};

type DataManagerLike = {
    data?: { list?: unknown };
    meta?: { list?: { cols?: MetaColumn[]; refs?: Record<string, Record<string, unknown>> } };
    metadata?: { treeObject?: { Fields?: Record<string, MetaColumn> } };
};

export type TableSource = ICell | ICell[] | ITreeRow | Record<string, unknown>[];

function isCell(item: unknown): item is ICell {
    return Boolean(item && typeof item === 'object' && !Array.isArray(item) && 'columnName' in item && 'value' in item);
}

function isCellRow(item: unknown): item is ICell[] {
    return Array.isArray(item) && (item.length === 0 || isCell(item[0]));
}

export function mapMetaColumns(cols: MetaColumn[] | undefined): IColumnData[] {
    if (!Array.isArray(cols)) {
        return [];
    }
    return cols
        .filter((col) => col && col.show !== false)
        .map((col) => {
            const name = String(col.field ?? col.name ?? '');
            return {
                name,
                label: String(col.label ?? col.description ?? col.name ?? name),
                cellWidth: col.cellWidth,
                cellFlexGrow: col.cellFlexGrow,
                cellHeight: col.cellHeight,
                cellExpandVertical: col.cellExpandVertical,
            };
        })
        .filter((col) => col.name);
}

function fieldsFromMetadata(dm: DataManagerLike | undefined): IColumnData[] {
    const fields = dm?.metadata?.treeObject?.Fields;
    if (!fields || typeof fields !== 'object') {
        return [];
    }
    return mapMetaColumns(Object.values(fields));
}

function formatValue(raw: unknown, refValue: unknown): unknown {
    if (raw !== null && typeof raw === 'object' && !Array.isArray(raw) && 'type' in raw && 'value' in raw) {
        const typed = raw as { type: unknown; value: unknown };
        return refValue ?? typed.value ?? '';
    }
    return refValue ?? raw ?? '';
}

function recordsToCellRows(
    rows: Record<string, unknown>[],
    columns: IColumnData[],
    refs: Record<string, Record<string, unknown>> | undefined
): ICell[][] {
    return rows.map((row, rowIndex) =>
        columns.map((column, columnIndex) => {
            const raw = row[column.name] ?? row[column.label];
            const key = raw == null ? '' : String(raw);
            const viewed = formatValue(raw, refs?.[column.name]?.[key]);
            return {
                columnIndex,
                rowIndex,
                columnName: column.name,
                type: 'string',
                value: { originalData: viewed, viewedData: viewed },
                hierarchy: null,
                editable: null,
            };
        })
    );
}

function isPlainRecord(item: unknown): item is Record<string, unknown> {
    return Boolean(item && typeof item === 'object' && !Array.isArray(item) && !isCell(item) && !isTreeRow(item));
}

export function resolveTableSource(options: {
    data?: TableSource[];
    columns?: (IColumnData | IColumnData[])[];
    dataManager?: DataManagerLike;
}): { data: TableSource[]; columns: (IColumnData | IColumnData[])[] } {
    const propColumns = options.columns ?? [];
    const dm = options.dataManager;
    const metaCols = mapMetaColumns(dm?.meta?.list?.cols);
    const columns = propColumns.length > 0 ? propColumns : metaCols.length > 0 ? metaCols : fieldsFromMetadata(dm);
    const leafColumns = columns.flatMap((col) => (Array.isArray(col) ? col : [col]));

    const propData = options.data;
    if (Array.isArray(propData) && propData.length > 0) {
        if (isPlainRecord(propData[0])) {
            return {
                data: recordsToCellRows(propData as Record<string, unknown>[], leafColumns, dm?.meta?.list?.refs),
                columns,
            };
        }
        return { data: propData, columns };
    }

    const list = dm?.data?.list;
    if (!Array.isArray(list) || list.length === 0) {
        return { data: Array.isArray(propData) ? propData : [], columns };
    }

    const first = list[0];
    if (isTreeRow(first) || isCellRow(first) || isCell(first)) {
        return { data: list as TableSource[], columns };
    }

    return {
        data: recordsToCellRows(list as Record<string, unknown>[], leafColumns, dm?.meta?.list?.refs),
        columns,
    };
}
