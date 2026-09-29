import type { ICell } from '../../../types';
import type { ITreeRow } from '../types';

export function isTreeRow(item: unknown): item is ITreeRow {
    return typeof item === 'object' && item !== null && !Array.isArray(item) && 'cells' in item;
}

export function normalizeCells(cells: ICell | ICell[]): ICell[] {
    return Array.isArray(cells) ? cells : [cells];
}
