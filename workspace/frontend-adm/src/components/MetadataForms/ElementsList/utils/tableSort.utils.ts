import { IColumnData } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types";

export const updateColumnSortState = (columns: (IColumnData | IColumnData[])[], sortedColumn: string, direction: 'ASC' | 'DESC'): (IColumnData | IColumnData[])[] => columns.map((column) => Array.isArray(column) 
            ? column.map(col => ({
                ...col,
                order: col.name === sortedColumn ? direction : undefined
            })) 
            : {
                ...column,
                order: column.name === sortedColumn ? direction : undefined
            }
        );