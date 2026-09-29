export type ListSettingsFacetId = 
    | 'selection'
    | 'grouping'
    | 'sort'
    | 'columnGrouping'
    | 'conditionalFormatting'

export interface ListSettingsScope {
    key: string
}

export const GLOBAL_LIST_SETTINGS_SCOPE: ListSettingsScope = {
    key: 'global',
}