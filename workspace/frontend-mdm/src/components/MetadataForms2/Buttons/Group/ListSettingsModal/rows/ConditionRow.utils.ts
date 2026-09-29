import { listFieldCatalog, SELECTION_COMPARISON_OPTIONS } from '../../../../../../helpers/listSettings'

export function buildFieldOptions(): { value: string; label: string }[] {
    return listFieldCatalog().map((field: { value: string; label: string }) => ({
        value: field.value,
        label: field.label,
    }))
}

export function buildComparisonOptions(comparison: string[]): { value: string; label: string }[] {
    return comparison.map((c) => ({
        value: c,
        label: SELECTION_COMPARISON_OPTIONS.find((o: { value: string; label: string }) => o.value === c)?.label ?? c,
    }))
}
