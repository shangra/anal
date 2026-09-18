import { Cell, Range } from '../models';
import { ICellStyles } from '../types';
import { RangeBasedManager } from './RangeBasedManager';
import { IMergeStrategy } from './RangeBasedManager/types';

const StyleMergeStrategy: IMergeStrategy<ICellStyles> = {
    merge(base, override) {
        const result = { ...base };
        for (const key in override) {
            if (override[key as keyof ICellStyles] !== undefined) {
                (result as any)[key] = (override as any)[key];
            } else {
                delete (result as any)[key];
            }
        }
        return result;
    },
    empty: () => ({}),
    equal: (a, b) => {
        if (a === b) return true;
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((k) => (a as any)[k] === (b as any)[k]);
    },
};

export default class StyleManager extends RangeBasedManager<ICellStyles> {
    constructor(maxRows?: number, maxCols?: number) {
        super(StyleMergeStrategy, maxRows, maxCols);
    }

    // Алиасы для обратной совместимости с существующим API
    setRangeStyle(range: Range, style: ICellStyles, merge = false) {
        return this.setRange(range, style, merge);
    }

    setCellStyle(row: number, col: number, style: ICellStyles, merge = false) {
        return this.setCell(row, col, style, merge);
    }

    getCellStyle(row: number, col: number) {
        return this.getCell(row, col);
    }

    getCellStylesForViewport(...args: Parameters<RangeBasedManager<ICellStyles>['getCellsForViewport']>) {
        return this.getCellsForViewport(...args);
    }

    setCellStylesBatch(cells: Array<{ row: number; col: number; data: ICellStyles }>): void {
        return this.setCellsBatch(cells);
    }

    removeCellStyle(row: number, col: number): void {
        return this.clearRangeStyles(new Range(new Cell({ rowIndex: row, columnIndex: col })));
    }

    clearRangeStyles(range: Range) {
        return this.clearRange(range);
    }
}
