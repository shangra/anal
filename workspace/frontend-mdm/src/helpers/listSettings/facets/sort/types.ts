import type { ListFieldDataType } from '../../fields/types'

export type SortDirection = 'ASC' | 'DESC'

export interface SortRule {
    field: string
    direction: SortDirection
    enabled: boolean
}

export interface SortSettingsState {
    sortRules: SortRule[]
    availableFields: Array<{ id: string; label: string; value: string; isGroupLevel: boolean; children?: SortFieldTreeNode[] }>
    fieldTypes: Record<string, ListFieldDataType>
}

export interface SortFieldTreeNode {
    id: string
    label: string
    value: string
    isGroupLevel: boolean
    children?: SortFieldTreeNode[]
}

export function emptySortSettingsState(): SortSettingsState {
    return {
        sortRules: [],
        availableFields: [],
        fieldTypes: {},
    }
}

export function cloneSortSettingsState(state: SortSettingsState): SortSettingsState {
    return {
        sortRules: state.sortRules.map((rule) => ({ ...rule })),
        availableFields: cloneAvailableFields(state.availableFields),
        fieldTypes: { ...state.fieldTypes },
    }
}

function cloneAvailableFields(fields: SortFieldTreeNode[]): SortFieldTreeNode[] {
    return fields.map((field) => ({
        ...field,
        children: field.children ? cloneAvailableFields(field.children) : undefined,
    }))
}

export function parseSortSettingsState(raw: unknown): SortSettingsState {
    const data = (raw ?? {}) as Partial<SortSettingsState> & {
        ascSortFields?: string[]
        descSortFields?: string[]
        disabledSortFields?: string[]
    }
    
    // Migrate from legacy ascSortFields/descSortFields
    let sortRules: SortRule[] = []
    if (Array.isArray(data.ascSortFields) || Array.isArray(data.descSortFields)) {
        const ascFields = Array.isArray(data.ascSortFields) ? data.ascSortFields : []
        const descFields = Array.isArray(data.descSortFields) ? data.descSortFields : []
        const disabledFields = new Set(Array.isArray(data.disabledSortFields) ? data.disabledSortFields : [])
        
        sortRules = [
            ...ascFields.map((field) => ({ ...createSortRule(field, 'ASC'), enabled: !disabledFields.has(field) })),
            ...descFields.map((field) => ({ ...createSortRule(field, 'DESC'), enabled: !disabledFields.has(field) })),
        ]
    } else if (Array.isArray(data.sortRules)) {
        sortRules = data.sortRules.filter((r): r is SortRule => {
            if (typeof r !== 'object' || r === null) return false
            const rule = r as SortRule
            if (typeof rule.field !== 'string') return false
            if (rule.direction !== 'ASC' && rule.direction !== 'DESC') return false
            if (typeof rule.enabled !== 'boolean') return false
            return true
        })
    }

    return {
        sortRules,
        availableFields: (data.availableFields ?? []) as SortFieldTreeNode[],
        fieldTypes: (data.fieldTypes ?? {}) as Record<string, ListFieldDataType>,
    }
}

export function createSortRule(field: string, direction: SortDirection = 'ASC'): SortRule {
    return {
        field,
        direction,
        enabled: true,
    }
}

export function resolveActiveSortRules(state: SortSettingsState): SortRule[] {
    return state.sortRules.filter((rule) => rule.enabled)
}

export function sortFieldExists(state: SortSettingsState, field: string): boolean {
    return state.sortRules.some((rule) => rule.field === field)
}
