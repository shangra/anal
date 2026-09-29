import type { ICell } from '../types';

export type TableRowCells = (ICell | ICell[])[];

export interface CellPatch {
    rowIndex: number;
    field: string;
    value: unknown;
}

function patchCell(cell: ICell, field: string, value: unknown): ICell {
    if (cell.columnName !== field) return cell;
    return {
        ...cell,
        value: {
            ...cell.value,
            originalData: value,
            viewedData: value,
        },
    };
}

function patchCellOrGroup(cellOrGroup: TableRowCells[number], field: string, value: unknown): TableRowCells[number] {
    if (Array.isArray(cellOrGroup)) {
        let changed = false;
        const next = cellOrGroup.map((cell) => {
            const patched = patchCell(cell, field, value);
            if (patched !== cell) changed = true;
            return patched;
        });
        return changed ? next : cellOrGroup;
    }

    return patchCell(cellOrGroup, field, value);
}

/**
 * Возвращает новый массив строк таблицы с обновлённым значением ячейки.
 * Строки и ячейки, которых изменение не касается, переносятся по ссылке —
 * так React перерисовывает только затронутую строку.
 * Если ячейка с таким `field` в строке не найдена, исходный массив возвращается без изменений.
 */
export function updateCellValueInTableData(rows: TableRowCells[], patch: CellPatch): TableRowCells[] {
    const { rowIndex, field, value } = patch;
    if (!Array.isArray(rows) || !field || rowIndex < 0 || rowIndex >= rows.length) return rows;

    const row = rows[rowIndex];
    if (!Array.isArray(row)) return rows;

    let changed = false;
    const nextRow = row.map((cellOrGroup) => {
        const next = patchCellOrGroup(cellOrGroup, field, value);
        if (next !== cellOrGroup) changed = true;
        return next;
    });

    if (!changed) return rows;

    const nextRows = [...rows];
    nextRows[rowIndex] = nextRow;
    return nextRows;
}
