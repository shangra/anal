import { ICellWithStyles } from '../../../../../AdapterSpreadSheet/types';

/**
 * Ensures that the given row index exists in the table map.
 * Shared across all renderers.
 */
export function ensureTableRow(table: Map<number, Map<number, ICellWithStyles>>, rowIdx: number): void {
    if (!table.has(rowIdx)) {
        table.set(rowIdx, new Map());
    }
}
