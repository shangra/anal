import type { DataRow, IDataColumn, IMergedColumns } from '../types'

interface MergedGroup {
    name: string
    columns: IDataColumn[]
    positionIndex: number
    originalFields: string[]
}

export function processMergedColumns(
    mergedColumns: IMergedColumns | undefined,
    cols: IDataColumn[],
    rows: DataRow[],
): { cols: (IDataColumn | IDataColumn[])[]; rows: DataRow[] } {
    if (!mergedColumns || typeof mergedColumns !== 'object') {
        return {
            cols: cols?.map((col) => ({ ...col })) || [],
            rows: rows?.map((row) => ({ ...row })) || [],
        }
    }

    const newCols = cols?.map((col) => ({ ...col })) || []
    const newRows = rows?.map((row) => ({ ...row })) || []

    const groups = Object.entries(mergedColumns)
        .map(([groupName, config]): MergedGroup | null => {
            if (!config) return null

            const { sourceFields, positionIndex } = config
            const columns = (sourceFields || [])
                .map((field) => {
                    const col = newCols.find((c) => c.name === field || c.field === field)
                    return col ? { ...col } : null
                })
                .filter((col): col is IDataColumn => col !== null)

            const firstColumnIndex = columns.length > 0
                ? Math.min(...columns.map((col) => newCols.findIndex((c) => c.name === col.name || c.field === col.field)))
                : newCols.length

            return {
                name: groupName,
                columns,
                positionIndex: positionIndex ?? firstColumnIndex,
                originalFields: sourceFields || [],
            }
        })
        .filter((group): group is MergedGroup => group !== null && group.columns.length === group.originalFields.length && group.originalFields.length > 0)

    groups.forEach((group) => {
        group.originalFields.forEach((field) => {
            const index = newCols.findIndex((c) => c.name === field || c.field === field)
            if (index !== -1) newCols.splice(index, 1)
        })
    })

    groups.sort((a, b) => a.positionIndex - b.positionIndex)

    let insertOffset = 0
    groups.forEach((group) => {
        const insertPosition = Math.min(Math.max(0, group.positionIndex + insertOffset), newCols.length)

        ;(newCols as (IDataColumn | IDataColumn[])[]).splice(insertPosition, 0, group.columns)
        insertOffset += 1
    })

    return {
        cols: newCols as (IDataColumn | IDataColumn[])[],
        rows: newRows,
    }
}
