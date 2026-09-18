import { Range } from '../../../../AdapterSpreadSheet/models';
import { ICell, ICellPluginsConfig } from '../../../../AdapterSpreadSheet/types';
import { SparseMatrixHelper } from '../../../../AdapterSpreadSheet/utils';
import { AutoFillReadonlyError } from './errors';
import DateFillStrategy from './strategy/DateFill';
import NumericFillStrategy from './strategy/NumericFill';
import RepeatFillStrategy from './strategy/RepeatFill';
import { FillDirection, IAutoFillStrategy, StrategyEntry } from './types';

// Приоритеты дефолтных стратегий — все ниже 0,
// чтобы внешние плагины могли перехватить с priority > 0.
const DEFAULT_STRATEGIES: StrategyEntry[] = [
    { strategy: new DateFillStrategy(), priority: -10 },
    { strategy: new NumericFillStrategy(), priority: -20 },
    { strategy: new RepeatFillStrategy(), priority: -30 }, // fallback
];

/**
 * Менеджер для управления автозаполнением
 */
export class AutoFillManager {
    // Отсортированный список: больший приоритет — раньше проверяется.
    private _strategies: StrategyEntry[] = [...DEFAULT_STRATEGIES];

    /**
     * Регистрирует стратегию с явным приоритетом.
     * Стратегии с одинаковым приоритетом — в порядке регистрации.
     *
     * Рекомендуемые диапазоны:
     *   > 0   — плагины (FormulaFillStrategy: 100)
     *   -10   — DateFill
     *   -20   — NumericFill
     *   -30   — RepeatFill (fallback)
     */
    registerStrategy(strategy: IAutoFillStrategy, priority: number = 0): void {
        this._strategies.push({ strategy, priority });
        // Стабильная сортировка: больший priority — раньше в списке
        this._strategies.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Определяет направление заполнения
     */
    getFillDirection(sourceRange: Range, targetRange: Range): FillDirection | null {
        const source = {
            startRow: sourceRange.topLeft.coordinates.rowIndex,
            endRow: sourceRange.bottomRight.coordinates.rowIndex,
            startCol: sourceRange.topLeft.coordinates.columnIndex,
            endCol: sourceRange.bottomRight.coordinates.columnIndex,
        };
        const target = {
            startRow: targetRange.topLeft.coordinates.rowIndex,
            endRow: targetRange.bottomRight.coordinates.rowIndex,
            startCol: targetRange.topLeft.coordinates.columnIndex,
            endCol: targetRange.bottomRight.coordinates.columnIndex,
        };

        // Вертикальное заполнение
        if (source.startCol === target.startCol && source.endCol === target.endCol) {
            if (target.startRow < source.startRow) return 'up';
            if (target.endRow > source.endRow) return 'down';
        }

        // Горизонтальное заполнение
        if (source.startRow === target.startRow && source.endRow === target.endRow) {
            if (target.startCol < source.startCol) return 'left';
            if (target.endCol > source.endCol) return 'right';
        }

        return null;
    }

    /**
     * Извлекает данные из исходного диапазона
     */
    extractSourceData(
        matrix: Map<number, Map<number, ICell>>,
        sourceRange: Range,
        direction: FillDirection,
        getPluginsConfig?: (row: number, col: number) => ICellPluginsConfig,
    ): ICell[][] {
        const result: ICell[][] = [];

        const readCell = (row: number, col: number): ICell => {
            const cell = SparseMatrixHelper.getCell(matrix, row, col) ?? this.getEmptyCell();
            if (getPluginsConfig) {
                const pluginsConfig = getPluginsConfig(row, col);
                // Мержим pluginsConfig не мутируя оригинал
                return pluginsConfig ? { ...cell, pluginsConfig: { ...cell.pluginsConfig, ...pluginsConfig } } : cell;
            }
            return cell;
        };

        if (direction === 'up' || direction === 'down') {
            for (
                let col = sourceRange.topLeft.coordinates.columnIndex;
                col <= sourceRange.bottomRight.coordinates.columnIndex;
                col++
            ) {
                const column: ICell[] = [];
                for (
                    let row = sourceRange.topLeft.coordinates.rowIndex;
                    row <= sourceRange.bottomRight.coordinates.rowIndex;
                    row++
                ) {
                    column.push(readCell(row, col));
                }
                result.push(column);
            }
        } else {
            for (
                let row = sourceRange.topLeft.coordinates.rowIndex;
                row <= sourceRange.bottomRight.coordinates.rowIndex;
                row++
            ) {
                const rowData: ICell[] = [];
                for (
                    let col = sourceRange.topLeft.coordinates.columnIndex;
                    col <= sourceRange.bottomRight.coordinates.columnIndex;
                    col++
                ) {
                    rowData.push(readCell(row, col));
                }
                result.push(rowData);
            }
        }

        return result;
    }

    /**
     * Возвращает координаты первой readonly-ячейки в диапазоне,
     * либо null если все ячейки доступны для записи.
     */
    private findReadonlyCell(
        matrix: Map<number, Map<number, ICell>>,
        range: Range,
        getPluginsConfig?: (row: number, col: number) => ICellPluginsConfig,
    ): { row: number; col: number } | null {
        for (let row = range.topLeft.coordinates.rowIndex; row <= range.bottomRight.coordinates.rowIndex; row++) {
            for (let col = range.topLeft.coordinates.columnIndex; col <= range.bottomRight.coordinates.columnIndex; col++) {
                const cell = SparseMatrixHelper.getCell(matrix, row, col) ?? this.getEmptyCell();
                const pluginsConfig = getPluginsConfig?.(row, col);

                // Объединяем: pluginsConfig может переопределять config
                const effectiveConfig = pluginsConfig ? { ...cell.config, ...pluginsConfig } : cell.config;

                if (effectiveConfig?.readonly === true) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    /**
     * Выполняет автозаполнение
     */
    performFill(
        matrix: Map<number, Map<number, ICell>>,
        sourceRange: Range,
        targetRange: Range,
        getPluginsConfig?: (row: number, col: number) => ICellPluginsConfig,
    ): Map<number, Map<number, ICell>> {
        const direction = this.getFillDirection(sourceRange, targetRange);
        if (!direction) return new Map();

        const readonlyCell = this.findReadonlyCell(matrix, targetRange, getPluginsConfig);
        if (readonlyCell) {
            throw new AutoFillReadonlyError(readonlyCell.row, readonlyCell.col);
        }

        const sourceData = this.extractSourceData(matrix, sourceRange, direction, getPluginsConfig);
        const result = new Map<number, Map<number, ICell>>();
        const src = {
            top: sourceRange.topLeft.coordinates.rowIndex,
            left: sourceRange.topLeft.coordinates.columnIndex,
            bot: sourceRange.bottomRight.coordinates.rowIndex,
            right: sourceRange.bottomRight.coordinates.columnIndex,
        };

        sourceData.forEach((sequence, index) => {
            const entry = this._strategies.find(({ strategy }) => strategy.canHandle(sequence));
            if (!entry) return;

            // Вычисляем стартовую позицию первой заполняемой ячейки
            // и количество ячеек для заполнения
            let count = 0;
            let fillStartRow = 0;
            let fillStartCol = 0;

            switch (direction) {
                case 'down':
                    count = targetRange.bottomRight.coordinates.rowIndex - src.bot;
                    fillStartRow = src.bot + 1;
                    fillStartCol = src.left + index;
                    break;
                case 'up':
                    count = src.top - targetRange.topLeft.coordinates.rowIndex;
                    fillStartRow = src.top - 1;
                    fillStartCol = src.left + index;
                    break;
                case 'right':
                    count = targetRange.bottomRight.coordinates.columnIndex - src.right;
                    fillStartRow = src.top + index;
                    fillStartCol = src.right + 1;
                    break;
                case 'left':
                    count = src.left - targetRange.topLeft.coordinates.columnIndex;
                    fillStartRow = src.top + index;
                    fillStartCol = src.left - 1;
                    break;
            }

            if (count <= 0) return;

            // Передаём startRow/startCol — стратегия знает позицию первой ячейки
            const filledCells = entry.strategy.fill(sequence, count, direction, fillStartRow, fillStartCol);

            filledCells.forEach((cell, i) => {
                let row: number;
                let col: number;
                switch (direction) {
                    case 'down':
                        row = src.bot + i + 1;
                        col = src.left + index;
                        break;
                    case 'up':
                        row = src.top - i - 1;
                        col = src.left + index;
                        break;
                    case 'right':
                        row = src.top + index;
                        col = src.right + i + 1;
                        break;
                    case 'left':
                        row = src.top + index;
                        col = src.left - i - 1;
                        break;
                }
                if (!result.has(row)) result.set(row, new Map());
                result.get(row)!.set(col, cell);
            });
        });

        return result;
    }

    private getEmptyCell(): ICell {
        return { data: null, components: [], config: {} };
    }
}
