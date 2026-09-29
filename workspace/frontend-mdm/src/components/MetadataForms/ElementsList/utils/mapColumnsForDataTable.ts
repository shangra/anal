import type { IColumnData, IInnerColumnMetadataProps } from '../ReactWindowWrapperCombined/types'


export function mapColumnsForDataTable(cols: (IColumnData | IColumnData[])[
]): IInnerColumnMetadataProps[] {
    return cols
        .map((col, index) => {
            if (Array.isArray(col)) {
                return col.map((c, i) => ({
                    id: `${col[0]?.name ?? 'group'}-${i}`,
                    label: c.label ?? c.name,
                    value: c.name,
                    show: true,
                    type: 'string',
                    columnIndex: index,
                }))
            }

            return {
                id: col.name,
                label: col.label ?? col.name,
                value: col.name,
                show: true,
                type: 'string',
                columnIndex: index,
            }
        })
        .flat()
}
