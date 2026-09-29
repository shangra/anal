import { groupTableRows } from "../../../../components/MetadataForms/ElementsList/groupTableRows"
import { ITreeRow } from "../../../../components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types"
import { ICell } from "../../../../components/MetadataForms/ElementsList/types"

export function applyGroupingToFlatRows(
    rows: ICell[][],
    activeGroupFields: string[],
): ICell[][] | ITreeRow[] {
    return groupTableRows(rows, activeGroupFields)
}