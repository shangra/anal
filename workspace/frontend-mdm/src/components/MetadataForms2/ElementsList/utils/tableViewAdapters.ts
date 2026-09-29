import type { ICell } from '../types'
import type { IColumnData, IInnerColumnMetadataProps, ITreeRow, TableRowData } from '../ReactWindowWrapperCombined/types'
import { mapColumnsForDataTable } from './mapColumnsForDataTable'
import { applyListViewToFlatRows, applySelectionToRows } from '../../../../helpers/listSettings'


export function toReactWindowTableData(
    rows: (ICell | ICell[])[][],
): TableRowData[] {
    return applySelectionToRows(rows)
}


export function toDataTableViewModel(params: {
    rows: (ICell | ICell[])[][]
    cols: (IColumnData | IColumnData[])[]
}): {
    data: ICell[][] | ITreeRow[]
    columns: IInnerColumnMetadataProps[]
} {
    const flatRows = flattenRowsForGrouping(params.rows)
    const columns = mapColumnsForDataTable(params.cols)
    const data = applyListViewToFlatRows(flatRows)

    return { data, columns }
}


function flattenRowsForGrouping(rows: (ICell | ICell[])[][]): ICell[][] {
    return rows.map((row) =>
        row.flatMap((cellOrGroup) =>
            Array.isArray(cellOrGroup) ? cellOrGroup : [cellOrGroup],
        ),
    )
}
