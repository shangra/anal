import { CELL_REF_REGEXP } from '../constants';

export interface ToggleAnchorResult {
    // Обновлённый текст формулы
    value: string;
    // Новая позиция каретки (остаётся внутри изменённого операнда)
    caretPosition: number;
}

// Циклически переключает anchorage координаты под курсором в формуле в соответствии с excel-циклом:
//  A1   → $A$1 → A$1  → $A1  → A1
// Ищет координату, ближайшую к caretPosition (курсор внутри или сразу слева от операнда).
export function toggleAnchorInFormula(formula: string, caretPosition: number): ToggleAnchorResult | null {
    let best: {
        match: string;
        colAnchor: string;
        col: string;
        rowAnchor: string;
        row: string;
        index: number;
    } | null = null;

    for (const m of formula.matchAll(CELL_REF_REGEXP)) {
        const idx = m.index!;
        const end = idx + m[0].length;

        // Координата подходит, если курсор внутри неё или справа от нее
        if (caretPosition >= idx && caretPosition <= end) {
            // Выбираем самую длинную подходящую (чтобы не взять A1 внутри AA1)
            if (!best || m[0].length > best.match.length) {
                best = {
                    match: m[0],
                    colAnchor: m[1],
                    col: m[2],
                    rowAnchor: m[3],
                    row: m[4],
                    index: idx,
                };
            }
        }
    }

    if (!best) return null;

    const { colAnchor, rowAnchor } = best;

    // Excel-цикл: A1 -> $A$1 -> A$1 -> $A1 -> A1
    let newColAnchor: string;
    let newRowAnchor: string;

    if (!colAnchor && !rowAnchor) {
        // A1 -> $A$1
        newColAnchor = '$';
        newRowAnchor = '$';
    } else if (colAnchor && rowAnchor) {
        // $A$1 -> A$1
        newColAnchor = '';
        newRowAnchor = '$';
    } else if (!colAnchor && rowAnchor) {
        // A$1 -> $A1
        newColAnchor = '$';
        newRowAnchor = '';
    } else {
        // $A1 -> A1
        newColAnchor = '';
        newRowAnchor = '';
    }

    const replacement = `${newColAnchor}${best.col}${newRowAnchor}${best.row}`;
    const value = formula.slice(0, best.index) + replacement + formula.slice(best.index + best.match.length);

    // ставим каретку в конец изменённого операнда (чтобы не прыгала в начало)
    const caretPositionAfter = best.index + replacement.length;

    return { value, caretPosition: caretPositionAfter };
}
