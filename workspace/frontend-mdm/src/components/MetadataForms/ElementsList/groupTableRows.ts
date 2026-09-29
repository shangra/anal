import type { ITreeRow } from './ReactWindowWrapperCombined/types';
import type { ICell } from './types';

function getCellValue(row: ICell[], columnName: string): unknown {
    const cell = row.find((c) => c.columnName === columnName);
    return cell?.value.originalData;
}

function getViewedValue(row: ICell[], columnName: string): unknown {
    const cell = row.find((c) => c.columnName === columnName);
    return cell?.value.viewedData ?? cell?.value.originalData;
}

function toKey(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value);
}

function groupLevel(rows: ICell[][], groupByFields: string[], counterRef: { value: number } = { value: 0 }): ITreeRow[] {
    const [field, ...rest] = groupByFields;
    const buckets = new Map<string, { viewed: unknown; rows: ICell[][]; keyId: number }>();

    for (const row of rows) {
        const original = getCellValue(row, field);
        const key = toKey(original);
        const existing = buckets.get(key);
        if (existing) {
            existing.rows.push(row);
        } else {
        const keyId = counterRef.value++;
        buckets.set(key, {
            viewed: getViewedValue(row, field),
            rows: [row],
            keyId,
        });
        }
    }

    return Array.from(buckets.entries()).map(([key, bucket]) => {
        const children: ITreeRow[] =
            rest.length > 0
                ? groupLevel(bucket.rows, rest, counterRef)
                : bucket.rows.map((cells) => ({ cells }));

        const groupRow: ITreeRow = {
            cells: [],
            children,
            isGroup: true,
            groupField: field,
            groupValue: bucket.viewed ?? key,
            groupKey: `${key}--${bucket.keyId}`,
        };

        return groupRow;
    });
}

export function groupTableRows(
    rows: ICell[][],
    groupByFields: string[],
): ICell[][] | ITreeRow[] {
    if (groupByFields.length === 0) {
        return rows;
    }
    return groupLevel(rows, groupByFields, { value: 0 });
}

export function isTreeRow(item: unknown): item is ITreeRow {
    return (
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item) &&
        'cells' in item
    );
}

export function normalizeCells(cells: ICell | ICell[]): ICell[] {
    return Array.isArray(cells) ? cells : [cells];
}
