import { CellDataType, ICell } from '../../../AdapterSpreadSheet/types';
import { FillDirection, IAutoFillStrategy } from '../../PluginFill/utils/AutoFillManager/types';
import { CELL_REF_REGEXP, PLUGIN_FORMULAS_KEY } from '../constants';

function colLetterToIndex(letters: string): number {
    return letters.split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0);
}

function colIndexToLetter(index: number): string {
    let result = '';
    let n = index;
    while (n > 0) {
        const rem = (n - 1) % 26;
        result = String.fromCharCode(65 + rem) + result;
        n = Math.floor((n - 1) / 26);
    }
    return result;
}

export function shiftFormula(expression: string, colDelta: number, rowDelta: number): string {
    return expression.replace(
        CELL_REF_REGEXP,
        (_match, colAnchor: string, colLetters: string, rowAnchor: string, rowDigits: string) => {
            let newCol = colLetters;
            let newRow = rowDigits;

            if (!colAnchor) {
                const idx = colLetterToIndex(colLetters) + colDelta;
                if (idx < 1) return '#ССЫЛКА!'; // вышли за границу — ошибка
                newCol = colIndexToLetter(idx);
            }

            if (!rowAnchor) {
                const idx = parseInt(rowDigits, 10) + rowDelta;
                if (idx < 1) return '#ССЫЛКА!'; // вышли за границу — ошибка
                newRow = String(idx);
            }

            return `${colAnchor}${newCol}${rowAnchor}${newRow}`;
        },
    );
}

export class FormulaFillStrategy implements IAutoFillStrategy {
    constructor(
        private readonly computeFormula: (
            expression: string,
            row: number,
            col: number,
        ) => string | CellDataType[] | CellDataType[][],
    ) {}

    canHandle(data: ICell[]): boolean {
        return data.some((cell) => this._getExpression(cell) !== null);
    }

    fill(data: ICell[], count: number, direction: FillDirection, startRow: number, startCol: number): ICell[] {
        const result: ICell[] = [];
        const isDown = direction === 'down';
        const isUp = direction === 'up';
        const isRight = direction === 'right';
        const isLeft = direction === 'left';

        for (let i = 0; i < count; i++) {
            const srcIdx = i % data.length;
            const sourceCell = data[srcIdx];
            const expression = this._getExpression(sourceCell);

            // ── Позиция заполняемой ячейки ────────────────────────────────
            // eslint-disable-next-line no-nested-ternary
            const targetRow = isDown ? startRow + i : isUp ? startRow - i : startRow;
            // eslint-disable-next-line no-nested-ternary
            const targetCol = isRight ? startCol + i : isLeft ? startCol - i : startCol;

            // ── Позиция источника ─────────────────────────────────────────
            // startRow/startCol — первая заполняемая ячейка, источники расположены
            // «до» неё в направлении, противоположном fill.
            //
            // Для down:  data[0] находится на строке startRow - data.length + 0,
            //            data[srcIdx] -> startRow - data.length + srcIdx
            // Для up:    data[0] находится на строке startRow + 1,
            //            data[srcIdx] -> startRow + 1 + srcIdx
            // Аналогично для left/right.
            // eslint-disable-next-line no-nested-ternary
            const sourceRow = isDown ? startRow - data.length + srcIdx : isUp ? startRow + 1 + srcIdx : targetRow;
            // eslint-disable-next-line no-nested-ternary
            const sourceCol = isRight ? startCol - data.length + srcIdx : isLeft ? startCol + 1 + srcIdx : targetCol;

            const rowShift = targetRow - sourceRow;
            const colShift = targetCol - sourceCol;

            if (expression !== null) {
                const shifted = shiftFormula(expression, colShift, rowShift);
                const computedValue = this.computeFormula(shifted, targetRow, targetCol);

                if (Array.isArray(computedValue)) {
                    const arr = computedValue as unknown[];
                    // 2D-массив: SPILL вниз и вправо
                    if (arr.length > 0 && Array.isArray(arr[0])) {
                        const twoD = computedValue as CellDataType[][];
                        for (let r = 0; r < twoD.length; r++) {
                            const spillRow = isDown ? targetRow + r : isUp ? targetRow - r : targetRow;
                            for (let c = 0; c < twoD[r].length; c++) {
                                const spillCol = isRight ? targetCol + c : isLeft ? targetCol - c : targetCol;
                                result.push({
                                    ...sourceCell,
                                    data: twoD[r][c],
                                    pluginsConfig:
                                        r === 0 && c === 0
                                            ? {
                                                  ...(sourceCell.pluginsConfig ?? {}),
                                                  [PLUGIN_FORMULAS_KEY]: { expression: shifted },
                                              }
                                            : undefined,
                                });
                            }
                        }
                    } else {
                        // 1D-массив: SPILL вправо/влево
                        const oneD = computedValue as CellDataType[];
                        for (let j = 0; j < oneD.length; j++) {
                            const spillCol = isRight ? targetCol + j : isLeft ? targetCol - j : targetCol;
                            result.push({
                                ...sourceCell,
                                data: oneD[j],
                                pluginsConfig:
                                    j === 0
                                        ? {
                                              ...(sourceCell.pluginsConfig ?? {}),
                                              [PLUGIN_FORMULAS_KEY]: { expression: shifted },
                                          }
                                        : undefined,
                            });
                        }
                    }
                } else {
                    result.push({
                        ...sourceCell,
                        data: computedValue,
                        pluginsConfig: {
                            ...(sourceCell.pluginsConfig ?? {}),
                            [PLUGIN_FORMULAS_KEY]: { expression: shifted },
                        },
                    });
                }
            } else {
                result.push({ ...sourceCell });
            }
        }

        return result;
    }

    private _getExpression(cell: ICell): string | null {
        return (cell?.pluginsConfig?.[PLUGIN_FORMULAS_KEY]?.expression as string | undefined) ?? null;
    }
}
