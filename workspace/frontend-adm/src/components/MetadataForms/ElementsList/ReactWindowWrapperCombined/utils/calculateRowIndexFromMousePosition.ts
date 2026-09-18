import { DEFAULT_ROW_HEIGHT } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/constants';

interface CalculateRowIndexParams {
    mouseY: number;
    headerHeight: number;
    scrollTop: number;
    getRowHeight: (rowIndex: number) => number;
    getRowsCount: () => number;
    totalHeight: number;
    hasExpendedHierarchy?: boolean;
    hierarchy?: boolean;
}

export const calculateRowIndexFromMousePosition = ({
    mouseY,
    headerHeight,
    scrollTop,
    getRowHeight,
    getRowsCount,
    totalHeight,
    hasExpendedHierarchy = false,
    hierarchy = false
}: CalculateRowIndexParams): number | null => {
    if (mouseY < headerHeight) {
        return null;
    }
    
    const absoluteMouseY = mouseY + scrollTop - headerHeight;
    const totalRows = getRowsCount();
    
    let start = 0;
    let end = totalRows - 1;
    
    while (start <= end) {
        const mid = Math.floor((start + end) / 2);
        const rowOffset = hierarchy ? 2 : 1;
        const midRowTop = getRowTopPosition(mid, getRowHeight, hierarchy);
        const midRowBottom = midRowTop + getRowHeight(mid + rowOffset);
        
        if (absoluteMouseY >= midRowTop && absoluteMouseY < midRowBottom) {
            return mid;
        } if (absoluteMouseY < midRowTop) {
            end = mid - 1;
        } else {
            start = mid + 1;
        }
    }
    
    return null;
};

export const getRowTopPosition = (
    rowIndex: number, 
    getRowHeight: (rowIndex: number) => number, 
    hierarchy: boolean
): number => {
    let top = 0;
    const rowOffset = hierarchy ? 2 : 1;
    
    for (let i = 0; i < rowIndex; i++) {
        top += getRowHeight(i + rowOffset);
    }
    
    return top;
};