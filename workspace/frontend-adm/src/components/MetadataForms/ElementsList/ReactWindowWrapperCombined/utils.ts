import { IColumn } from "components/MetadataForms/ElementsList/types";
import { DEFAULT_COLUMN_WIDTH, DEFAULT_MIN_WIDTH } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/constants";
import { IInnerColumnMetadata } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types";

export const isGroup = (columnData: IColumn | IColumn[]): columnData is IColumn[] => Array.isArray(columnData)

export const scrollToAlgo = ({
    cell,
    table,
    content,
    direction,
    currentPosition
}: {
    direction: "top" | "bottom" | "left" | "right";
    currentPosition: {
        x: number;
        y: number;
    };
    table: {
        width: number;
        height: number;
    };
    content: {
        width: number;
        height: number;
    };
    cell: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}) => {
    const result = {
        x: currentPosition.x,
        y: currentPosition.y,
    };

    const minX = 0;
    const minY = 0;
    const maxX = content.width - table.width;
    const maxY = content.height - table.height;

    if(direction === "left") {
        result.x = Math.max(minX, cell.x);
    }
    else if(direction === "right") {
        const rightCellEdge = (cell.x + cell.width) - table.width;
        result.x = Math.min(rightCellEdge, maxX);
    }
    else if(direction === "bottom") {
        result.y = Math.max(minY, cell.y);
    }
    else if(direction === "top") {
        const bottomCellEdge = (cell.y + cell.height) - table.height;
        result.y = Math.min(bottomCellEdge, maxY);
    }

    if(content.width <= table.width) {
        result.x = 0;
    }
    else if(content.height <= table.height) {
        result.y = 0;
    }

    // if(result.x + table.width > maxX) {
    //     result.x = maxX;
    // }
    // if(result.y + table.height > maxY) {
    //     result.y = maxY;
    // }

    return result;
}


export class ColumnResizeHelper {
    static generateColumnsMetadata(columnsCount: number, desiredColumnWidth: number[], tableWidth: number): IInnerColumnMetadata[] {
        let offsetX = 0;
        const baseWidths = new Array(columnsCount)
            .fill(DEFAULT_COLUMN_WIDTH)
            .map((defaultWidth, index) => Math.max(defaultWidth, desiredColumnWidth[index] ?? DEFAULT_COLUMN_WIDTH));
        const totalWidth = baseWidths.reduce((sum, width) => sum + width, 0);
        let columnWidths = baseWidths;

        if (totalWidth > 0 && totalWidth < tableWidth) {
            const ratio = tableWidth / totalWidth;
            columnWidths = baseWidths.map((width) => Math.round(width * ratio));
            const fixedWidth = columnWidths.slice(0, -1).reduce((sum, width) => sum + width, 0);
            columnWidths[columnWidths.length - 1] = Math.max(DEFAULT_MIN_WIDTH, tableWidth - fixedWidth);
        }

        const dist = new Array(columnsCount).fill(null).map<IInnerColumnMetadata>((_, i) => {
            const currentX = offsetX;
            offsetX += columnWidths[i];

            return {
                x: currentX,
                width: columnWidths[i],
            }
        });
    
        return dist;
    }


    //     static generateColumnsMetadata(columnsCount: number, tableWidth: number, hierarchyWidth?: number): IInnerColumnMetadata[] {
    //     const availableWidth = hierarchyWidth ? tableWidth - hierarchyWidth : tableWidth;

    //     const columnWidth = columnsCount <= 2
    //         ? Math.max(DEFAULT_COLUMN_WIDTH, availableWidth / 3)
    //         : Math.max(DEFAULT_COLUMN_WIDTH, availableWidth / columnsCount);

    //     const metadata: IInnerColumnMetadata[] = [];
    //     let currentX = 0;

    //     for (let i = 0; i < columnsCount; i++) {
    //         metadata.push({
    //             width: columnWidth,
    //             x: currentX
    //         });
    //         currentX += columnWidth;
    //     }

    //     return metadata;
    // }

    static resizeColumnWidth = (
        columnsMetadata: IInnerColumnMetadata[],
        columnIndex: number,
        newColumnWidth: number,
        tableWidth: number,
    ): IInnerColumnMetadata[] => {
        const updatedColumns = [...columnsMetadata];
        if (columnIndex < 0 || columnIndex >= updatedColumns.length) {
            return updatedColumns;
        }

        const currentColumn = updatedColumns[columnIndex];
        const nextWidth = Math.max(DEFAULT_MIN_WIDTH, newColumnWidth);
        if (currentColumn.width === nextWidth) {
            return updatedColumns;
        }

        updatedColumns[columnIndex] = {
            ...currentColumn,
            width: nextWidth
        };

        const totalWidth = updatedColumns.reduce((sum, col) => sum + col.width, 0);
        if (totalWidth < tableWidth) {
            const widthDeficit = tableWidth - totalWidth;
            const rightColumnsCount = updatedColumns.length - columnIndex - 1;

            if (rightColumnsCount > 0) {
                const addWidth = widthDeficit / rightColumnsCount;
                for (let i = columnIndex + 1; i < updatedColumns.length; i++) {
                    updatedColumns[i] = {
                        ...updatedColumns[i],
                        width: updatedColumns[i].width + addWidth,
                    };
                }
            } else if (columnIndex > 0) {
                const leftColumnsCount = columnIndex;
                const addWidth = widthDeficit / leftColumnsCount;
                for (let i = 0; i < columnIndex; i++) {
                    updatedColumns[i] = {
                        ...updatedColumns[i],
                        width: updatedColumns[i].width + addWidth,
                    };
                }
            }
        }

        for (let i = 1; i < updatedColumns.length; i++) {
            updatedColumns[i] = {
                ...updatedColumns[i],
                x: updatedColumns[i - 1].x + updatedColumns[i - 1].width
            };
        }
        
        return updatedColumns;
    };

    static resizeTableWidth = (
        columnsMetadata: IInnerColumnMetadata[],
        prevTableWidth: number,
        newTableWidth: number,
    ): IInnerColumnMetadata[] => {
        if (!columnsMetadata.length) {
            return [];
        }

        if (newTableWidth <= prevTableWidth) {
            return columnsMetadata;
        }

        const ratio = newTableWidth / prevTableWidth;
        let x = 0;

        return columnsMetadata.map((column, index) => {
            const width = index === columnsMetadata.length - 1 ? newTableWidth - x : Math.round(column.width * ratio);
            const nextColumn = { x, width };
            x += width;
            return nextColumn;
        });
    };
}