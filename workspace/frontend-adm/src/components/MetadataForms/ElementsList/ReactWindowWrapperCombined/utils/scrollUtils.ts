import { DEFAULT_ROW_HEIGHT } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/constants";
import { IColumn, IColumnConfig } from 'components/MetadataForms/ElementsList/types';

export interface ScrollToCellParams {
    rowIndex: number;
    columnIndex: number;
    data: any[];
    cols: any[];
    columnConfigs: any[];
    hasExpendedHierarchy?: boolean;
    width: number;
    height: number;
    mergedLength: number;
    currentScrollLeft?: number;
    currentScrollTop?: number;
}

export interface ScrollPosition {
    scrollLeft: number;
    scrollTop: number;
}

export const calculateScrollPosition = ({
    rowIndex,
    columnIndex,
    data,
    cols,
    columnConfigs,
    hasExpendedHierarchy = false,
    width,
    height,
    mergedLength,
    currentScrollLeft = 0,
    currentScrollTop = 0
}: ScrollToCellParams): ScrollPosition => {

    const groupInfo = getColumnGroupInfo(columnIndex, cols);

    const groupPosition = getGroupPosition(groupInfo.groupIndex, columnConfigs);
    const groupWidth = getGroupWidth(groupInfo.groupIndex, columnConfigs);

    let totalRowHeight = 0;
    const dataRowIndex = rowIndex;

    for (let i = 0; i < dataRowIndex; i++) {
        totalRowHeight += getRowHeight(i, data, hasExpendedHierarchy, mergedLength);
    }

    const targetRowHeight = getRowHeight(dataRowIndex, data, hasExpendedHierarchy, mergedLength);
    const headerHeight = DEFAULT_ROW_HEIGHT * mergedLength + (hasExpendedHierarchy ? DEFAULT_ROW_HEIGHT : 0);
    const availableBodyHeight = height - headerHeight;

    let targetScrollLeft = currentScrollLeft;

    if (groupPosition < currentScrollLeft) {
        targetScrollLeft = groupPosition;
    } else if (groupPosition + groupWidth > currentScrollLeft + width) {
        targetScrollLeft = groupPosition + groupWidth - width;
    }

    let targetScrollTop = currentScrollTop;

    if (totalRowHeight < currentScrollTop) {
        targetScrollTop = totalRowHeight;
    } else if (totalRowHeight + targetRowHeight > currentScrollTop + availableBodyHeight) {
        targetScrollTop = totalRowHeight + targetRowHeight - availableBodyHeight;
    }

    const totalTableHeight = data.reduce((sum, _, index) => sum + getRowHeight(index, data, hasExpendedHierarchy, mergedLength), 0);
    const maxScrollTop = Math.max(0, totalTableHeight - availableBodyHeight);
    targetScrollTop = Math.min(targetScrollTop, maxScrollTop);

    const totalTableWidth = columnConfigs.reduce((sum, _, index) => sum + getGroupWidth(index, columnConfigs), 0);
    const maxScrollLeft = Math.max(0, totalTableWidth - width);
    targetScrollLeft = Math.min(targetScrollLeft, maxScrollLeft);

    return {
        scrollLeft: targetScrollLeft,
        scrollTop: targetScrollTop
    };
};

export const getColumnWidth = (columnIndex: number, columnConfigs: any[]): number => {
    const config = columnConfigs[columnIndex];
    if (Array.isArray(config)) {
        return config[0]?.width || 100;
    } 
        return (config as any)?.width || 100;
    
};

export const getRowHeight = (
    rowIndex: number,
    data: any[],
    hasExpendedHierarchy: boolean,
    mergedLength: number
): number => {
    if (rowIndex === 0) return DEFAULT_ROW_HEIGHT * mergedLength;
    if (rowIndex === 1 && hasExpendedHierarchy) return DEFAULT_ROW_HEIGHT;

    const dataRowIndex = rowIndex - (hasExpendedHierarchy ? 2 : 1);
    if (dataRowIndex >= 0 && dataRowIndex < data.length) {
        const rowData = data[dataRowIndex];
        if (Array.isArray(rowData)) {
            const hasMergedCells = rowData.some((cell: any) => Array.isArray(cell));
            return hasMergedCells ? DEFAULT_ROW_HEIGHT * mergedLength * 0.6 : DEFAULT_ROW_HEIGHT;
        } 
            return DEFAULT_ROW_HEIGHT;
        
    }

    return DEFAULT_ROW_HEIGHT;
};

export const ensureCellVisible = ({
    rowIndex,
    data,
    hasExpendedHierarchy = false,
    height,
    mergedLength,
    currentScrollTop = 0
}: {
    rowIndex: number;
    data: any[];
    hasExpendedHierarchy?: boolean;
    height: number;
    mergedLength: number;
    currentScrollTop?: number;
}): number => {
    const headerHeight = DEFAULT_ROW_HEIGHT * mergedLength + (hasExpendedHierarchy ? DEFAULT_ROW_HEIGHT : 0);
    const availableBodyHeight = height - headerHeight;

    let totalRowHeight = 0;
    const dataRowIndex = rowIndex;
    for (let i = 0; i < dataRowIndex; i++) {
        totalRowHeight += getRowHeight(i, data, hasExpendedHierarchy, mergedLength);
    }

    const targetRowHeight = getRowHeight(dataRowIndex, data, hasExpendedHierarchy, mergedLength);

    if (totalRowHeight < currentScrollTop) {
        return totalRowHeight;
    } if (totalRowHeight + targetRowHeight > currentScrollTop + availableBodyHeight) {
        return totalRowHeight + targetRowHeight - availableBodyHeight;
    }

    return currentScrollTop;
};

const getColumnGroupInfo = (columnIndex: number, cols: (IColumn | IColumn[])[]) => {
    let currentIndex = 0;

    for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        const groupSize = Array.isArray(col) ? col.length : 1;

        if (columnIndex >= currentIndex && columnIndex < currentIndex + groupSize) {
            return {
                groupIndex: i,
                colInGroupIndex: columnIndex - currentIndex,
                groupSize,
                isGroup: Array.isArray(col)
            };
        }

        currentIndex += groupSize;
    }

    return {
        groupIndex: columnIndex,
        colInGroupIndex: 0,
        groupSize: 1,
        isGroup: false
    };
};

// Функция для получения ширины группы колонок
const getGroupWidth = (groupIndex: number, columnConfigs: (IColumnConfig | IColumnConfig[])[]) => {
    const config = columnConfigs[groupIndex];
    if (Array.isArray(config)) {
        return config.reduce((sum, c) => sum + (c?.width || 100), 0);
    }
    return (config as IColumnConfig)?.width || 100;
};

// Функция для получения позиции группы колонок
const getGroupPosition = (groupIndex: number, columnConfigs: (IColumnConfig | IColumnConfig[])[]) => {
    let position = 0;
    for (let i = 0; i < groupIndex; i++) {
        position += getGroupWidth(i, columnConfigs);
    }
    return position;
};