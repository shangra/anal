import { createContext } from "react"
import type { TableContextValueType } from './types'

export const defaultTableContextValue: TableContextValueType = {
    handleResizeStart: () => {},
    handleResize: () => {},
    handleResizeEnd: () => {},
    cols: [],
    hasColumnsHeader: true,
    mergedLength: 1,
    hasHierarchy: false,
    resizingIndex: null,
    startX: 0,
    startWidth: 0,
    hasExpandedHierarchy: false,
    columnsMetadata: [],
    hoveredRowIndex: null,
    onRowHover: () => {},
}

export const TableContext = createContext<TableContextValueType>(
    defaultTableContextValue,
)