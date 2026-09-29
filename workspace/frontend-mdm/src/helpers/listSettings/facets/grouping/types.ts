export interface GroupingSettingsState {
    selectedGroupFields: string[]
    disabledGroupFields: string[]
}

export function emptyGroupingSettingsState(): GroupingSettingsState {
    return {
        selectedGroupFields: [],
        disabledGroupFields: [],
    }
}

export function cloneGroupingSettingsState(
    state: GroupingSettingsState,
): GroupingSettingsState {
    return {
        selectedGroupFields: [...state.selectedGroupFields],
        disabledGroupFields: [...state.disabledGroupFields],
    }
}

export function parseGroupingSettingsState(
    raw: unknown,
): GroupingSettingsState {
    const data = (raw ?? {}) as Partial<GroupingSettingsState>
    return {
        selectedGroupFields: Array.isArray(data.selectedGroupFields)
            ? data.selectedGroupFields.filter((item): item is string => typeof item === 'string')
            : [],
        disabledGroupFields: Array.isArray(data.disabledGroupFields)
            ? data.disabledGroupFields.filter((item): item is string => typeof item === 'string')
            : [],
    }
}

export function resolveActiveGroupFields(
    state: GroupingSettingsState,
): string[] {
    const disabled = new Set(state.disabledGroupFields)
    return state.selectedGroupFields.filter((field) => !disabled.has(field))
}