import { Cell, JoinedCell, Range } from '../../../AdapterSpreadSheet/models';

export interface IFillHandleState {
    isDragging: boolean;
    sourceRange: Range | null;
    currentRange: Range | null;
    startCell: Cell | null;
}

/**
 * Менеджер для управления Fill Handle (квадратик для протягивания)
 */
export class FillHandleManager {
    private state: IFillHandleState = { isDragging: false, sourceRange: null, currentRange: null, startCell: null };

    private joinedCells: JoinedCell[];

    private rowsCount: number;

    private columnsCount: number;

    constructor(rowsCount: number, columnsCount: number, joinedCells: JoinedCell[] = []) {
        this.rowsCount = rowsCount;
        this.columnsCount = columnsCount;
        this.joinedCells = joinedCells;
    }

    /**
     * Обновляет параметры таблицы
     */
    updateTableParams(rowsCount: number, columnsCount: number, joinedCells: JoinedCell[]): void {
        this.rowsCount = rowsCount;
        this.columnsCount = columnsCount;
        this.joinedCells = joinedCells;
    }

    /**
     * Начинает операцию протягивания
     */
    startDrag(sourceRange: Range): void {
        this.state = {
            isDragging: true,
            sourceRange: sourceRange.clone(),
            currentRange: sourceRange.clone(),
            startCell: sourceRange.bottomRight,
        };
    }

    /**
     * Обновляет текущий диапазон при перемещении мыши
     */
    updateDrag(cell: Cell): {
        isChanged: boolean;
        range: Range | null;
    } {
        if (!this.state.isDragging || !this.state.sourceRange) {
            return { isChanged: false, range: null };
        }

        const { sourceRange } = this.state;

        // Определяем новый диапазон на основе направления
        let newRange = this.calculateFillRange(sourceRange, cell);

        // Расширяем для joined cells
        for (const joinedCell of this.joinedCells) {
            if (newRange.intersects(joinedCell.range)) {
                newRange = newRange.add(joinedCell.range);
            }
        }

        const isChanged = !this.state.currentRange?.isEqual(newRange);

        this.state.currentRange = newRange;

        return { isChanged, range: newRange };
    }

    /**
     * Завершает операцию протягивания
     */
    endDrag(): {
        sourceRange: Range | null;
        targetRange: Range | null;
    } {
        const result = { sourceRange: this.state.sourceRange, targetRange: this.state.currentRange };

        this.reset();

        return result;
    }

    /**
     * Отменяет операцию протягивания
     */
    cancelDrag(): void {
        this.reset();
    }

    /**
     * Проверяет, идет ли сейчас протягивание
     */
    isDragging(): boolean {
        return this.state.isDragging;
    }

    /**
     * Получает текущее состояние
     */
    getState(): Readonly<IFillHandleState> {
        return { ...this.state };
    }

    /**
     * Вычисляет диапазон заполнения на основе направления
     */
    private calculateFillRange(sourceRange: Range, targetCell: Cell): Range {
        const source = {
            startRow: sourceRange.topLeft.coordinates.rowIndex,
            endRow: sourceRange.bottomRight.coordinates.rowIndex,
            startCol: sourceRange.topLeft.coordinates.columnIndex,
            endCol: sourceRange.bottomRight.coordinates.columnIndex,
        };

        const target = {
            row: Math.max(0, Math.min(this.rowsCount - 1, targetCell.coordinates.rowIndex)),
            col: Math.max(0, Math.min(this.columnsCount - 1, targetCell.coordinates.columnIndex)),
        };

        // Определяем направление протягивания
        const verticalDistance = Math.abs(target.row - source.endRow);
        const horizontalDistance = Math.abs(target.col - source.endCol);

        // Вертикальное протягивание (приоритет, если равны)
        if (verticalDistance >= horizontalDistance) {
            if (target.row > source.endRow) {
                // Вниз
                return new Range(
                    new Cell({ rowIndex: source.startRow, columnIndex: source.startCol }),
                    new Cell({ rowIndex: target.row, columnIndex: source.endCol }),
                );
            }
            if (target.row < source.startRow) {
                // Вверх
                return new Range(
                    new Cell({ rowIndex: target.row, columnIndex: source.startCol }),
                    new Cell({ rowIndex: source.endRow, columnIndex: source.endCol }),
                );
            }
        } else {
            // Горизонтальное протягивание
            if (target.col > source.endCol) {
                // Вправо
                return new Range(
                    new Cell({ rowIndex: source.startRow, columnIndex: source.startCol }),
                    new Cell({ rowIndex: source.endRow, columnIndex: target.col }),
                );
            }
            if (target.col < source.startCol) {
                // Влево
                return new Range(
                    new Cell({ rowIndex: source.startRow, columnIndex: target.col }),
                    new Cell({ rowIndex: source.endRow, columnIndex: source.endCol }),
                );
            }
        }

        // Если не удалось определить направление, возвращаем исходный диапазон
        return sourceRange;
    }

    /**
     * Сбрасывает состояние
     */
    private reset(): void {
        this.state = { isDragging: false, sourceRange: null, currentRange: null, startCell: null };
    }

    /**
     * Проверяет, находится ли точка над fill handle
     */
    static isPointOnFillHandle(
        screenX: number,
        screenY: number,
        handleScreenX: number,
        handleScreenY: number,
        handleSize: number,
        tolerance: number = 2,
    ): boolean {
        const halfSize = handleSize / 2;
        return (
            screenX >= handleScreenX - halfSize - tolerance &&
            screenX <= handleScreenX + halfSize + tolerance &&
            screenY >= handleScreenY - halfSize - tolerance &&
            screenY <= handleScreenY + halfSize + tolerance
        );
    }
}
