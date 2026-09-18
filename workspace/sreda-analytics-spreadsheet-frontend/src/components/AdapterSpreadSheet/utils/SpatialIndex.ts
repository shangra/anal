// ============================================================================
// ПРОСТРАНСТВЕННЫЙ ИНДЕКС ДЛЯ БЫСТРОГО ПОИСКА
// ============================================================================

import { CellRange, StyledRange } from '../types';

export class SpatialIndex {
    private grid: Map<string, StyledRange[]> = new Map();

    private readonly GRID_SIZE: number; // размер ячейки сетки

    private maxRows: number;

    private maxCols: number;

    constructor(maxRows: number, maxCols: number) {
        this.maxRows = maxRows;
        this.maxCols = maxCols;
        this.GRID_SIZE = Math.max(50, Math.min(1000, Math.floor(Math.sqrt(maxRows * maxCols) / 100)));
    }

    /**
     * Добавить диапазон в индекс
     */
    insert(range: StyledRange): void {
        const cells = this.getRangeCells(range);

        for (const cell of cells) {
            const key = this.getGridKey(cell.row, cell.col);
            const list = this.grid.get(key) || [];
            list.push(range);
            this.grid.set(key, list);
        }
    }

    /**
     * Удалить диапазон из индекса
     */
    remove(range: StyledRange): void {
        const cells = this.getRangeCells(range);

        for (const cell of cells) {
            const key = this.getGridKey(cell.row, cell.col);
            const list = this.grid.get(key);

            if (list) {
                const index = list.findIndex((r) => r.id === range.id);
                if (index !== -1) {
                    list.splice(index, 1);
                }

                if (list.length === 0) {
                    this.grid.delete(key);
                }
            }
        }
    }

    /**
     * Найти все диапазоны, содержащие ячейку
     */
    query(row: number, col: number): StyledRange[] {
        const key = this.getGridKey(row, col);
        const candidates = this.grid.get(key) || [];

        // Фильтруем только те, которые действительно содержат ячейку
        return candidates.filter(
            (range) => row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol,
        );
    }

    /**
     * Найти все диапазоны, пересекающиеся с областью
     */
    queryRange(startRow: number, endRow: number, startCol: number, endCol: number): StyledRange[] {
        const result = new Map<string, StyledRange>();

        const startGridRow = Math.floor(startRow / this.GRID_SIZE);
        const endGridRow = Math.floor(endRow / this.GRID_SIZE);
        const startGridCol = Math.floor(startCol / this.GRID_SIZE);
        const endGridCol = Math.floor(endCol / this.GRID_SIZE);

        for (let gr = startGridRow; gr <= endGridRow; gr++) {
            for (let gc = startGridCol; gc <= endGridCol; gc++) {
                const key = `${gr}:${gc}`;
                const ranges = this.grid.get(key) || [];

                for (const range of ranges) {
                    // Проверяем реальное пересечение
                    if (
                        this.rangesIntersect(
                            range.startRow,
                            range.endRow,
                            range.startCol,
                            range.endCol,
                            startRow,
                            endRow,
                            startCol,
                            endCol,
                        )
                    ) {
                        result.set(range.id, range);
                    }
                }
            }
        }

        return Array.from(result.values());
    }

    /**
     * Пересобрать индекс
     */
    rebuild(ranges: StyledRange[]): void {
        this.grid.clear();
        // Вставляем в порядке timestamp: поздние диапазоны перекрывают ранние
        const sorted = [...ranges].sort((a, b) => a.timestamp - b.timestamp);
        for (const range of sorted) {
            this.insert(range);
        }
    }

    private getGridKey(row: number, col: number): string {
        const gridRow = Math.floor(row / this.GRID_SIZE);
        const gridCol = Math.floor(col / this.GRID_SIZE);
        return `${gridRow}:${gridCol}`;
    }

    private getRangeCells(range: CellRange): { row: number; col: number }[] {
        const cells: { row: number; col: number }[] = [];

        const startGridRow = Math.floor(range.startRow / this.GRID_SIZE);
        const endGridRow = Math.floor(range.endRow / this.GRID_SIZE);
        const startGridCol = Math.floor(range.startCol / this.GRID_SIZE);
        const endGridCol = Math.floor(range.endCol / this.GRID_SIZE);

        for (let gr = startGridRow; gr <= endGridRow; gr++) {
            for (let gc = startGridCol; gc <= endGridCol; gc++) {
                cells.push({
                    row: gr * this.GRID_SIZE,
                    col: gc * this.GRID_SIZE,
                });
            }
        }

        return cells;
    }

    private rangesIntersect(
        r1StartRow: number,
        r1EndRow: number,
        r1StartCol: number,
        r1EndCol: number,
        r2StartRow: number,
        r2EndRow: number,
        r2StartCol: number,
        r2EndCol: number,
    ): boolean {
        return !(r1EndRow < r2StartRow || r1StartRow > r2EndRow || r1EndCol < r2StartCol || r1StartCol > r2EndCol);
    }
}
