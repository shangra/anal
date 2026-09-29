import { ICell } from '../../types';
import { DEFAULT_ROW_HEIGHT, SCROLL_DELAY, SCROLL_THRESHOLD_DOWN, SCROLL_THRESHOLD_UP } from '../constants';
import type { IColumnData, TableRowData } from '../types';

export function getMergedLength(cols: (IColumnData | IColumnData[])[], colIndex?: number): number {
    if (colIndex !== undefined) {
        const col = cols[colIndex];
        return Array.isArray(col) ? col.length : 1;
    }

    return cols.reduce((max, col) => Math.max(max, Array.isArray(col) ? col.length : 1), 1);
}

export function getCellAt(data: TableRowData[], rowIndex: number, columnIndex: number): ICell | ICell[] | undefined {
    if (rowIndex < 0 || rowIndex >= data.length) return undefined;
    const row = data[rowIndex];
    if (columnIndex < 0 || columnIndex >= row.length) return undefined;
    return row[columnIndex];
}

export function getRowHeight(params: {
    rowIndex: number;
    data: TableRowData[];
    hasExpandedHierarchy?: boolean;
    mergedLength: number;
    mergedRowCoef: number;
    defaultRowHeight?: number;
}): number {
    const { rowIndex, data, hasExpandedHierarchy, mergedLength, mergedRowCoef, defaultRowHeight } = params;
    const rowHeight = defaultRowHeight ?? DEFAULT_ROW_HEIGHT;

    if (rowIndex === 1 && hasExpandedHierarchy) return rowHeight;

    const dataRowIndex = rowIndex - (hasExpandedHierarchy ? 2 : 1);
    if (dataRowIndex >= 0 && dataRowIndex < data.length) {
        const rowData = data[dataRowIndex];
        const hasMergedCells = rowData.some((cell) => Array.isArray(cell));
        return hasMergedCells ? rowHeight * mergedLength * mergedRowCoef : rowHeight;
    }

    return rowHeight;
}

export function calculateTableHeight(container: HTMLElement | null): number {
    if (!container || typeof window === 'undefined') return 700;

    const containerRect = container.getBoundingClientRect();
    const calculatedHeight = window.innerHeight - containerRect.top - 30;
    return Math.max(calculatedHeight, 400);
}

export interface ScrollPaginationInput {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    lastScrollTop: number;
    hasNext: boolean;
    hasPrev: boolean;
    isLoadingMore: boolean;
    lastLoadTimeStamp: number;
    now?: number;
}

export type ScrollPaginationAction = 'next' | 'prev' | null;

export function resolveScrollPagination(input: ScrollPaginationInput): {
    action: ScrollPaginationAction;
    nextLastScrollTop: number;
} {
    const {
        scrollTop,
        scrollHeight,
        clientHeight,
        lastScrollTop,
        hasNext,
        hasPrev,
        isLoadingMore,
        lastLoadTimeStamp,
        now = Date.now(),
    } = input;

    const remainingDown = scrollHeight - scrollTop - clientHeight;
    const scrollingDown = scrollTop > lastScrollTop;
    const scrollingUp = scrollTop < lastScrollTop;

    if (isLoadingMore || now - lastLoadTimeStamp < SCROLL_DELAY) {
        return { action: null, nextLastScrollTop: scrollTop };
    }

    if (hasNext && scrollingDown && remainingDown < SCROLL_THRESHOLD_DOWN) {
        return { action: 'next', nextLastScrollTop: scrollTop };
    }

    if (hasPrev && scrollTop < SCROLL_THRESHOLD_UP && (scrollingUp || scrollTop === 0)) {
        return { action: 'prev', nextLastScrollTop: scrollTop };
    }

    return { action: null, nextLastScrollTop: scrollTop };
}

export function getRowBackgroundColor(params: {
    rowIndex: number;
    selectedRows?: number[];
    hoveredRowIndex: number | null;
}): string | undefined {
    const { rowIndex, selectedRows, hoveredRowIndex } = params;

    if (selectedRows?.includes(rowIndex)) {
        return 'var(--table-selected-row-bg, rgba(71, 134, 255, 0.12))';
    }

    if (hoveredRowIndex === rowIndex) {
        return 'var(--table-hover-row-bg, rgba(148, 163, 184, 0.12))';
    }

    return undefined;
}
