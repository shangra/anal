import { BOTTOM_DELTA, DEFAULT_ROW_HEIGHT, MERGED_ROW_COEF } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/constants";

interface IScrollToCellParams {
    scrollTop: number;
    scrollLeft: number;
    rowIndex: number;
    columnIndex: number;
    columnsMetadata: any[];
    data: any[];
    hasExpendedHierarchy?: boolean;
    tableWidth: number;
    tableHeight: number;
    mergedLength: number;
}

interface IScrollToCellResult {
    scrollTop: number;
    scrollLeft: number;
    shouldScroll: boolean;
}

interface IColumnMapping {
    position: number;
    columnIndex: number;
}

function getColumnMapping(data: any[]): IColumnMapping[] {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    const firstRow = data[0];
    if (!firstRow || !Array.isArray(firstRow)) {
        return [];
    }

    const result: IColumnMapping[] = [];

    firstRow.forEach((item, mainIndex) => {
        if (!item) return;

        if (Array.isArray(item)) {
            item.forEach(nestedItem => {
                if (nestedItem && nestedItem.columnIndex !== undefined) {
                    result.push({
                        position: mainIndex,
                        columnIndex: nestedItem.columnIndex
                    });
                }
            });
        } else if (item.columnIndex !== undefined) {
            result.push({
                position: mainIndex,
                columnIndex: item.columnIndex
            });
        }
    });

    return result;
}

function getDataRowHeight(data: any[], rowIndex: number, mergedLength: number): number {
    return mergedLength >= 2 ?
        DEFAULT_ROW_HEIGHT * MERGED_ROW_COEF * mergedLength :
        DEFAULT_ROW_HEIGHT;
}

function calculateVerticalScroll(
    scrollTop: number,
    rowIndex: number,
    hasExpendedHierarchy: boolean,
    tableHeight: number,
    mergedLength: number,
    data: any[]
): number {
    const headerHeight = DEFAULT_ROW_HEIGHT * mergedLength;
    const hierarchyHeaderHeight = hasExpendedHierarchy ? DEFAULT_ROW_HEIGHT : 0;
    const totalHeaderHeight = headerHeight + hierarchyHeaderHeight;

    const adjustedRowIndex = rowIndex + (hasExpendedHierarchy ? 1 : 0);

    let targetRowTop = 0;

    for (let i = 0; i < adjustedRowIndex; i++) {
        targetRowTop += getDataRowHeight(data, i, mergedLength);
    }

    const targetRowBottom = targetRowTop + getDataRowHeight(data, adjustedRowIndex, mergedLength);
    const visibleContentHeight = tableHeight - totalHeaderHeight;
    const visibleContentTop = scrollTop;
    const visibleContentBottom = scrollTop + visibleContentHeight;

    let newScrollTop = scrollTop;

    if (targetRowBottom > visibleContentBottom) {
        newScrollTop = targetRowBottom - visibleContentHeight + BOTTOM_DELTA;
    } else if (targetRowTop < visibleContentTop) {
        newScrollTop = targetRowTop;
    }

    return newScrollTop;
}

function calculateHorizontalScroll(
    scrollLeft: number,
    columnIndex: number,
    columnsMetadata: any[],
    data: any[],
    tableWidth: number
): number {
    const columnMapping = getColumnMapping(data);
    const columnPosition = columnMapping.find(item => item.columnIndex === columnIndex)?.position;

    if (columnPosition === undefined) {
        return scrollLeft;
    }

    const columnConfig = columnsMetadata[columnPosition];
    if (!columnConfig) {
        return scrollLeft;
    }

    const targetColumnRight = columnConfig.x + columnConfig.width;
    const visibleContentRight = scrollLeft + tableWidth;

    let newScrollLeft = scrollLeft;

    if (targetColumnRight > visibleContentRight) {
        newScrollLeft = targetColumnRight - tableWidth;
    } else if (columnConfig.x < scrollLeft) {
        newScrollLeft = columnConfig.x;
    }

    return newScrollLeft;
}

function calculateScrollPosition(params: IScrollToCellParams): IScrollToCellResult {
    const {
        scrollTop,
        scrollLeft,
        rowIndex,
        columnIndex,
        columnsMetadata,
        data,
        hasExpendedHierarchy = false,
        tableWidth,
        tableHeight,
        mergedLength
    } = params;

    const newScrollTop = calculateVerticalScroll(
        scrollTop,
        rowIndex,
        hasExpendedHierarchy,
        tableHeight,
        mergedLength,
        data
    );

    const newScrollLeft = calculateHorizontalScroll(
        scrollLeft,
        columnIndex,
        columnsMetadata,
        data,
        tableWidth
    );

    const shouldScroll = newScrollTop !== scrollTop || newScrollLeft !== scrollLeft;

    return {
        scrollTop: newScrollTop,
        scrollLeft: newScrollLeft,
        shouldScroll
    };
}

export const scrollToCellUtils = {
    calculateScrollPosition,
};