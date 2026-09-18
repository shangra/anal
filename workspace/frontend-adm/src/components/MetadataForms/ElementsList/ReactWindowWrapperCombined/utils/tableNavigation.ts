import { ICell, IActiveCell, IColumn } from "components/MetadataForms/ElementsList/types";
import { IColumnData } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types";

export const getCellAt = (rowIndex: number, colIndex: number, data: (ICell | ICell[])[]): ICell | ICell[] | undefined => {
    if (rowIndex >= 0 && rowIndex < data.length) {
        const row = data[rowIndex];
        if (Array.isArray(row) && colIndex >= 0 && colIndex < row.length) {
            return row[colIndex];
        }
    }
    return undefined;
};

export const tableNavigation = {
    getNextCell: (
        currentCell: IActiveCell,
        rowsCount: number,
        columnsCount: number,
        data: (ICell | ICell[])[],
        cols: (IColumnData | IColumnData[])[]
    ): IActiveCell => {
        const newActiveCell = { ...currentCell };
        const currentCellData = getCellAt(currentCell.rowIndex, currentCell.columnIndex, data);
        const isGroupCell = Array.isArray(currentCellData);
        const currentColConfig = cols[currentCell.columnIndex];
        const isColumnGroup = Array.isArray(currentColConfig);

        if (isGroupCell && currentCell.colInGroupIndex !== undefined && isColumnGroup) {
            const groupLength = currentColConfig.length;

            if (currentCell.colInGroupIndex < groupLength - 1) {
                newActiveCell.colInGroupIndex = currentCell.colInGroupIndex + 1;
            } else {
                newActiveCell.columnIndex = currentCell.columnIndex + 1;
                newActiveCell.colInGroupIndex = undefined;
                newActiveCell.groupIndex = undefined;

                if (newActiveCell.columnIndex < columnsCount) {
                    const nextColConfig = cols[newActiveCell.columnIndex];
                    if (Array.isArray(nextColConfig)) {
                        newActiveCell.groupIndex = 0;
                        newActiveCell.colInGroupIndex = 0;
                    }
                }
            }
        } else if (currentCell.columnIndex < columnsCount - 1) {
                newActiveCell.columnIndex = currentCell.columnIndex + 1;
                newActiveCell.colInGroupIndex = undefined;
                newActiveCell.groupIndex = undefined;

                const nextColConfig = cols[newActiveCell.columnIndex];
                if (Array.isArray(nextColConfig)) {
                    newActiveCell.groupIndex = 0;
                    newActiveCell.colInGroupIndex = 0;
                }
            } else if (currentCell.rowIndex < rowsCount - 1) {
                    newActiveCell.colInGroupIndex = undefined;
                    newActiveCell.groupIndex = undefined;

                    const firstColConfig = cols[0];
                    if (Array.isArray(firstColConfig)) {
                        newActiveCell.groupIndex = 0;
                        newActiveCell.colInGroupIndex = 0;
                    }
                } else {
                    newActiveCell.columnIndex = 0;
                    newActiveCell.rowIndex = 0;
                    newActiveCell.colInGroupIndex = undefined;
                    newActiveCell.groupIndex = undefined;

                    const firstColConfig = cols[0];
                    if (Array.isArray(firstColConfig)) {
                        newActiveCell.groupIndex = 0;
                        newActiveCell.colInGroupIndex = 0;
                    }
                }
        return newActiveCell;
    },

    getCellByDirection: (
        currentCell: IActiveCell,
        direction: 'up' | 'down' | 'left' | 'right',
        rowsCount: number,
        columnsCount: number,
        data: (ICell | ICell[])[],
    ): IActiveCell => {
        const newActiveCell = { ...currentCell };
        const currentCellData = getCellAt(currentCell.rowIndex, currentCell.columnIndex, data);
        const isGroupCell = Array.isArray(currentCellData);

        switch (direction) {
            case 'up':
                if (isGroupCell && currentCell.colInGroupIndex !== undefined) {
                    if (currentCell.colInGroupIndex > 0) {
                        newActiveCell.colInGroupIndex = currentCell.colInGroupIndex - 1;
                    } else {
                        const newRowIndex = currentCell.rowIndex - 1;
                        if (newRowIndex >= 0) {
                            newActiveCell.rowIndex = newRowIndex;
                            const newCell = getCellAt(newRowIndex, currentCell.columnIndex, data);
                            if (Array.isArray(newCell)) {
                                newActiveCell.colInGroupIndex = newCell.length - 1;
                                newActiveCell.groupIndex = 0;
                            } else {
                                newActiveCell.colInGroupIndex = undefined;
                                newActiveCell.groupIndex = undefined;
                            }
                        }
                    }
                } else {
                    newActiveCell.rowIndex = Math.max(currentCell.rowIndex - 1, 0);
                }
                break;

            case 'down':
                if (isGroupCell && currentCell.colInGroupIndex !== undefined) {
                    if (currentCell.colInGroupIndex < (currentCellData as ICell[]).length - 1) {
                        newActiveCell.colInGroupIndex = currentCell.colInGroupIndex + 1;
                    } else {
                        const newRowIndex = currentCell.rowIndex + 1;
                        if (newRowIndex < rowsCount) {
                            newActiveCell.rowIndex = newRowIndex;
                            const newCell = getCellAt(newRowIndex, currentCell.columnIndex, data);
                            if (Array.isArray(newCell)) {
                                newActiveCell.colInGroupIndex = 0;
                                newActiveCell.groupIndex = 0;
                            } else {
                                newActiveCell.colInGroupIndex = undefined;
                                newActiveCell.groupIndex = undefined;
                            }
                        }
                    }
                } else {
                    newActiveCell.rowIndex = Math.min(currentCell.rowIndex + 1, rowsCount - 1);
                }
                break;

            case 'left':
                if (isGroupCell && currentCell.colInGroupIndex !== undefined) {
                    newActiveCell.columnIndex = Math.max(currentCell.columnIndex - 1, 0);
                    newActiveCell.colInGroupIndex = undefined;

                    const leftCell = getCellAt(currentCell.rowIndex, newActiveCell.columnIndex, data);
                    if (Array.isArray(leftCell)) {
                        newActiveCell.colInGroupIndex = leftCell.length - 1;
                    }
                } else {
                    newActiveCell.columnIndex = Math.max(currentCell.columnIndex - 1, 0);

                    const leftCell = getCellAt(currentCell.rowIndex, newActiveCell.columnIndex, data);
                    if (Array.isArray(leftCell)) {
                        newActiveCell.colInGroupIndex = leftCell.length - 1;
                    }
                }
                break;

            case 'right':
                if (isGroupCell && currentCell.colInGroupIndex !== undefined) {
                    newActiveCell.columnIndex = Math.min(currentCell.columnIndex + 1, columnsCount - 1);
                    newActiveCell.colInGroupIndex = undefined;

                    const rightCell = getCellAt(currentCell.rowIndex, newActiveCell.columnIndex, data);
                    if (Array.isArray(rightCell)) {
                        newActiveCell.colInGroupIndex = 0;
                    }
                } else {
                    newActiveCell.columnIndex = Math.min(currentCell.columnIndex + 1, columnsCount - 1);

                    const rightCell = getCellAt(currentCell.rowIndex, newActiveCell.columnIndex, data);
                    if (Array.isArray(rightCell)) {
                        newActiveCell.colInGroupIndex = 0;
                    }
                }
                break;
        }

        return newActiveCell;
    }
};