import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { IconButton, PlusIcon } from 'ui-kit'
import { Cell } from './Cell'
import { DEFAULT_ROW_HEIGHT } from '../constants'
import type {
    CellInteractionPayload,
    CellRenderMetadata,
    IColumnData,
    TableRowData,
} from '../types'
import { getCellAt, getRowBackgroundColor, getRowHeight } from '../utils/tableGeometry'
import { IActiveCell, ICell } from '../../types'

export interface BodyCellRendererParams {
    rowIndex: number
    tableColumnIndex: number
    style: CSSProperties
    data: TableRowData[]
    cols: (IColumnData | IColumnData[])[]
    hierarchy?: boolean
    hasExpandedHierarchy?: boolean
    activeCell?: IActiveCell | null
    selectedRows?: number[]
    hoveredRowIndex: number | null
    mergedLength: number
    mergedRowCoef: number
    activeCellBorderColor: string
    onHierarchyExpand?: (rowIndex: number) => void
    onCellClick?: (event: MouseEvent, payload: CellInteractionPayload) => void
    onDoubleClick?: (event: MouseEvent, payload: Pick<CellInteractionPayload, 'columnIndex' | 'rowIndex'>) => void
    renderMetaInput?: (cellData: ICell | ICell[], metadata: CellRenderMetadata) => ReactNode
}

export function renderBodyCell(params: BodyCellRendererParams): ReactNode {
    const {
        rowIndex, tableColumnIndex, style, data, cols, hierarchy, hasExpandedHierarchy,
        activeCell, selectedRows, hoveredRowIndex, mergedLength, mergedRowCoef,
        activeCellBorderColor, onHierarchyExpand, onCellClick, onDoubleClick, renderMetaInput,
    } = params

    const backgroundColor = getRowBackgroundColor({ rowIndex, selectedRows, hoveredRowIndex })

    if (hierarchy && tableColumnIndex === 0) {
        return (
            <Cell
                styles={{
                    ...style,
                    backgroundColor,
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    padding: 'var(--table-cell-padding)',
                }}
                value="-"
                renderContent={() => (
                    <IconButton
                        variant="outlined"
                        icon={PlusIcon}
                        size="small"
                        onClick={() => onHierarchyExpand?.(rowIndex)}
                    />
                )}
            />
        )
    }

    const columnIndex = hierarchy ? tableColumnIndex - 1 : tableColumnIndex
    const cell = getCellAt(data, rowIndex, columnIndex)

    if (!cell) {
        return (
            <div style={{
                ...style,
                height: DEFAULT_ROW_HEIGHT,
                border: '1px solid var(--table-border-color)',
                backgroundColor,
            }} />
        )
    }

    const rowHeight = getRowHeight({
        rowIndex: rowIndex + (hasExpandedHierarchy ? 2 : 1),
        data, hasExpandedHierarchy, mergedLength, mergedRowCoef,
    })

    if (Array.isArray(cell)) {
        const cellData = cols[columnIndex]
        if (!Array.isArray(cellData)) return null

        return (
            <div style={{
                ...style,
                height: rowHeight,
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                backgroundColor,
            }}>
                {cell.map((mergedCell, index) => {
                    if (!mergedCell) return null

                    const isActive = activeCell?.rowIndex === rowIndex &&
                        activeCell?.columnIndex === mergedCell.columnIndex

                    return (
                        <Cell
                            key={index}
                            styles={{
                                height: rowHeight / cell.length,
                                display: 'flex',
                                alignItems: 'center',
                                padding: 'var(--table-cell-padding)',
                                backgroundColor: 'var(--table-active-cell-bg)',
                                color: 'var(--main-active-color)',
                                boxShadow: isActive
                                    ? `inset 0 0 0 2px ${activeCellBorderColor}`
                                    : 'none',
                            }}
                            type={mergedCell.type}
                            value={String(mergedCell.value?.viewedData ?? '')}
                            onClick={(event) => onCellClick?.(event, {
                                rowIndex,
                                columnIndex: mergedCell.columnIndex,
                                colInGroupIndex: index,
                            })}
                            onDoubleClick={(event) => onDoubleClick?.(event, {
                                rowIndex,
                                columnIndex: mergedCell.columnIndex,
                            })}
                            renderContent={() => renderMetaInput?.(mergedCell, {
                                rowIndex,
                                columnIndex,
                            })}
                            dataActive={isActive ? 'true' : ''}
                        />
                    )
                })}
            </div>
        )
    }

    const isCellActive = activeCell?.rowIndex === rowIndex &&
        activeCell?.columnIndex === cell.columnIndex

    return (
        <Cell
            key={`${rowIndex}:${columnIndex}`}
            styles={{
                ...style,
                height: rowHeight,
                paddingLeft: 'var(--table-cell-padding)',
                color: 'var(--main-active-color)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                backgroundColor,
                boxShadow: isCellActive
                    ? `inset 0 0 0 2px ${activeCellBorderColor}`
                    : 'none',
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
            }}
            type={cell.type}
            value={String(cell.value?.viewedData ?? '')}
            onClick={(event) => onCellClick?.(event, {
                rowIndex,
                columnIndex: cell.columnIndex,
            })}
            onDoubleClick={(event) => onDoubleClick?.(event, {
                rowIndex,
                columnIndex,
            })}
            renderContent={() => renderMetaInput?.(cell, {
                rowIndex,
                columnIndex,
            })}
            dataActive={isCellActive ? 'true' : ''}
        />
    )
}
