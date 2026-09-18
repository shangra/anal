import { Cell } from '../../../AdapterSpreadSheet/models';
import { JoinedCell } from '../../../TableAdapters/types';

/**
 * Индекс для быстрого поиска joined cells по координатам
 * Сложность поиска: O(1) вместо O(n)
 */
export class JoinedCellsIndex {
    private index: Map<string, JoinedCell>;

    constructor(joinedCells: JoinedCell[]) {
        this.index = new Map();
        this.buildIndex(joinedCells);
    }

    private buildIndex(joinedCells: JoinedCell[]): void {
        for (const jc of joinedCells) {
            const { topLeft, bottomRight } = jc;

            // Индексируем все ячейки в joined cell
            for (let row = topLeft.coordinates.rowIndex; row <= bottomRight.coordinates.rowIndex; row++) {
                for (let col = topLeft.coordinates.columnIndex; col <= bottomRight.coordinates.columnIndex; col++) {
                    const key = `${row}:${col}`;
                    this.index.set(key, jc);
                }
            }
        }
    }

    /**
     * Быстрый поиск joined cell по координатам O(1)
     */
    public get(rowIndex: number, columnIndex: number): JoinedCell | null {
        const key = `${rowIndex}:${columnIndex}`;
        return this.index.get(key) || null;
    }

    /**
     * Проверяет, является ли ячейка главной в joined cell
     */
    public isMainCell(rowIndex: number, columnIndex: number): boolean {
        const jc = this.get(rowIndex, columnIndex);
        if (!jc) return true;

        return jc.mainCell.coordinates.rowIndex === rowIndex && jc.mainCell.coordinates.columnIndex === columnIndex;
    }

    /**
     * Проверяет, входит ли ячейка в joined cell
     */
    public isJoined(rowIndex: number, columnIndex: number): boolean {
        return this.index.has(`${rowIndex}:${columnIndex}`);
    }
}
