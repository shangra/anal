// @ts-ignore
import { FormulaError, FormulaHelpers, Types } from 'fast-formula-parser';

export default {
    RANK: (number: number, ref: number[], order: number = 0) => {
        number = FormulaHelpers.accept(number, Types.NUMBER);
        ref = FormulaHelpers.flattenDeep(FormulaHelpers.accept(ref, Types.ARRAY, undefined, false, true));
        order = FormulaHelpers.accept(order, Types.NUMBER);
        const numbers = ref.filter((v) => typeof v === 'number' && !Number.isNaN(v));
        if (numbers.length === 0) return FormulaError.NA;
        const sorted = [...numbers].sort((a, b) => (order === 0 ? b - a : a - b));
        const rank = sorted.indexOf(number) + 1;
        if (rank === 0) return FormulaError.NA;
        return rank;
    },
    'RANK.AVG': (number: number, ref: number[], order: number = 0) => {
        number = FormulaHelpers.accept(number, Types.NUMBER);
        ref = FormulaHelpers.flattenDeep(FormulaHelpers.accept(ref, Types.ARRAY, undefined, false, true));
        order = FormulaHelpers.accept(order, Types.NUMBER);
        const numbers = ref.filter((v) => typeof v === 'number' && !Number.isNaN(v));
        if (numbers.length === 0) return FormulaError.NA;
        const sorted = [...numbers].sort((a, b) => (order === 0 ? b - a : a - b));
        const indices = [];
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i] === number) {
                indices.push(i); // сохраняем индексы (0-based)
            }
        }
        if (indices.length === 0) return FormulaError.NA;
        const sumRanks = indices.reduce((sum, idx) => sum + (idx + 1), 0);
        return sumRanks / indices.length;
    },
    'RANK.EQ': (number: number, ref: number[], order: number = 0) => {
        number = FormulaHelpers.accept(number, Types.NUMBER);
        ref = FormulaHelpers.flattenDeep(FormulaHelpers.accept(ref, Types.ARRAY, undefined, false, true));
        order = FormulaHelpers.accept(order, Types.NUMBER);
        const numbers = ref.filter((v) => typeof v === 'number' && !Number.isNaN(v));
        if (numbers.length === 0) return FormulaError.NA;
        const sorted = [...numbers].sort((a, b) => (order === 0 ? b - a : a - b));
        const rank = sorted.indexOf(number) + 1;
        if (rank === 0) return FormulaError.NA;
        return rank;
    },
};
