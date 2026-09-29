import { defaultComparatorForAllTypes } from '../../comparator'
import { ICell } from '../../../components/MetadataForms/ElementsList/ReactWindowWrapperCombined'
import { applyGroupingToFlatRows } from '../facets/grouping/apply'
import {
    applySelectionToFlatRows,
    applySelectionToMixedRows,
    type SelectionCellLike,
} from '../facets/selection/apply'
import { getActiveListView } from './getActiveListView'
import type { ActiveListView, ListViewApplyResult } from './types'
import { getSortSettingsState } from '../facets/sort/store'

export function applyListViewToFlatRows(
    rows: ICell[][],
    view: ActiveListView = getActiveListView(),
): ListViewApplyResult {
    const selected = applySelectionToFlatRows(rows, view.activeSelectionNodes)

    return applyGroupingToFlatRows(selected, view.activeGroupFields)
}

export function applySelectionToRows<
    T extends Array<SelectionCellLike | SelectionCellLike[]>,
>(rows: T[], view: ActiveListView = getActiveListView()): T[] {
    return applySelectionToMixedRows(rows, view.activeSelectionNodes)
}

export function applySortToRows<T extends Record<string, unknown>>(
    data: T[],
    view: ActiveListView = getActiveListView(),
    fieldTypes?: ReturnType<typeof getSortSettingsState>['fieldTypes'],
): T[] {
    const { activeSortRules } = view
    if (activeSortRules.length === 0) {
        return data
    }

    const validFields = new Set(activeSortRules.filter((r) => r.enabled).map((r) => r.field))
    if (validFields.size === 0) {
        return data
    }

    const fieldTypesMap = fieldTypes ?? getSortSettingsState().fieldTypes

    const sorted = [...data].sort((a, b) => {
        for (const rule of activeSortRules) {
            if (!rule.enabled || !validFields.has(rule.field)) continue
            const valA = a[rule.field]
            const valB = b[rule.field]
            if (valA == null && valB == null) continue
            if (valA == null) return rule.direction === 'ASC' ? 1 : -1
            if (valB == null) return rule.direction === 'ASC' ? -1 : 1
            const fieldType = fieldTypesMap[rule.field] || 'string'
            const result = defaultComparatorForAllTypes(
                valA as any,
                valB as any,
                fieldType,
                rule.direction === 'ASC' ? 'ASC' : 'DESC',
            )
            if (result !== 0) return result
        }
        return 0
    })

    return sorted
}
