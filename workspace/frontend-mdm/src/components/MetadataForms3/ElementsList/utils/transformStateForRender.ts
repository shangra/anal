import type { IColumnData } from '../ReactWindowWrapperCombined/types'
import { ROW_ID_FIELD_NAME } from '../constants'
import type { DataRow, ICell, IData, IDataColumn, IMergedColumns } from '../types'
import { formatCellValue } from './formatCellValue'
import { processMergedColumns } from './mergedColumns'

export interface TransformStateResult {
    data: (ICell | ICell[])[][]
    cols: (IColumnData | IColumnData[])[]
    indexToId: Record<string, string>
}

interface TransformOptions {
    data: IData
    mergedColumns?: IMergedColumns
    visibleColumnNames?: string[]
    getFieldType: (fieldName: string) => string
}

function findColumnByNameOrDesc(
    processedCols: (IDataColumn | IDataColumn[])[],
    name: string,
): IDataColumn | undefined {
    for (const colOrGroup of processedCols) {
        if (Array.isArray(colOrGroup)) {
            const found = colOrGroup.find(
                (col) => col.name === name || col.description === name || col.field === name,
            )
            if (found) return found
            continue
        }

        if (
            colOrGroup.name === name ||
            colOrGroup.description === name ||
            colOrGroup.field === name
        ) {
            return colOrGroup
        }
    }
    return undefined
}

function resolveCellValue(
    row: DataRow,
    columnName: string,
    refs: IData['refs'],
): unknown {
    const raw = row[columnName]
    const formatted = formatCellValue(raw)
    const key = formatted == null ? '' : String(formatted)
    const refValue = refs[columnName]?.[key]
    return formatCellValue(raw, refValue)
}

function toColumnData(column: IDataColumn): IColumnData {
    return {
        name: column.field,
        label: column.description ?? column.name,
    }
}

export function transformStateForRender(options: TransformOptions): TransformStateResult {
    const { data, mergedColumns, visibleColumnNames, getFieldType } = options

    const { cols: processedCols = [], rows: processedRows = [] } = mergedColumns
        ? processMergedColumns(mergedColumns, data.cols, data.rows)
        : {
            cols: data.cols,
            rows: data.rows,
        }

    const indexToId = data.rows.reduce<Record<string, string>>((acc, row, rowIndex) => {
        const idValue = row[ROW_ID_FIELD_NAME]
        if (idValue == null || idValue === '') return acc
        acc[String(rowIndex)] = String(idValue)
        return acc
    }, {})

    const result: TransformStateResult = {
        data: [],
        cols: [],
        indexToId,
    }

    if (visibleColumnNames && visibleColumnNames.length > 0) {
        visibleColumnNames.forEach((columnName) => {
            const col = findColumnByNameOrDesc(processedCols, columnName)
            if (!col || !col.show) return
            result.cols.push(toColumnData(col))
        })
    } else {
        processedCols.forEach((colOrGroup) => {
            if (Array.isArray(colOrGroup)) {
                const visibleGroup = colOrGroup.filter((col) => col.show)
                if (visibleGroup.length === 0) return
                result.cols.push(visibleGroup.map(toColumnData))
                return
            }

            if (!colOrGroup.show) return
            result.cols.push(toColumnData(colOrGroup))
        })
    }

    processedRows.forEach((row, rowIndex) => {
        const rowData: (ICell | ICell[])[] = []
        let columnIndex = 0

        result.cols.forEach((column) => {
            if (Array.isArray(column)) {
                const groupCells = column.map((col) => {
                    const valueWithDefault = resolveCellValue(row, col.name, data.refs)
                    return {
                        columnIndex: columnIndex++,
                        rowIndex,
                        columnName: col.name,
                        type: getFieldType(col.name),
                        value: {
                            originalData: valueWithDefault,
                            viewedData: valueWithDefault,
                        },
                        hierarchy: null,
                        editable: null,
                    } satisfies ICell
                })
                rowData.push(groupCells)
                return
            }

            const valueWithDefault = resolveCellValue(row, column.name, data.refs)
            rowData.push({
                columnIndex: columnIndex++,
                rowIndex,
                columnName: column.name,
                type: getFieldType(column.name),
                value: {
                    originalData: valueWithDefault,
                    viewedData: valueWithDefault,
                },
                hierarchy: null,
                editable: null,
            })
        })

        result.data.push(rowData)
    })

    return result
}

export function getCellAt(rowIndex: number, colIndex: number, data: ICell[][]): ICell | undefined {
    if (
        rowIndex >= 0 &&
        rowIndex < data.length &&
        colIndex >= 0 &&
        colIndex < data[rowIndex].length
    ) {
        return data[rowIndex][colIndex]
    }
    return undefined
}
