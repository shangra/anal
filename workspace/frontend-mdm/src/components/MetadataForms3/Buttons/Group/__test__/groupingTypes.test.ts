/**
 * Tests for grouping types and utils (facets/grouping/types.ts)
 *
 * Тестируют: cloneGroupingSettingsState, parseGroupingSettingsState,
 * resolveActiveGroupFields, emptyGroupingSettingsState
 */

import {
    emptyGroupingSettingsState,
    cloneGroupingSettingsState,
    parseGroupingSettingsState,
    resolveActiveGroupFields,
    type GroupingSettingsState,
} from '../../../../../helpers/listSettings/facets/grouping/types'

describe('emptyGroupingSettingsState', () => {
    it('should return state with empty arrays', () => {
        const state = emptyGroupingSettingsState()

        expect(state.selectedGroupFields).toEqual([])
        expect(state.disabledGroupFields).toEqual([])
    })
})

describe('cloneGroupingSettingsState', () => {
    it('should create independent copy', () => {
        const state: GroupingSettingsState = {
            selectedGroupFields: ['field1', 'field2'],
            disabledGroupFields: ['field3'],
        }

        const cloned = cloneGroupingSettingsState(state)

        expect(cloned).not.toBe(state)
        expect(cloned.selectedGroupFields).not.toBe(state.selectedGroupFields)
        expect(cloned.disabledGroupFields).not.toBe(state.disabledGroupFields)
    })

    it('should clone with correct values', () => {
        const state: GroupingSettingsState = {
            selectedGroupFields: ['field1', 'field2'],
            disabledGroupFields: ['field3'],
        }

        const cloned = cloneGroupingSettingsState(state)

        expect(cloned.selectedGroupFields).toEqual(['field1', 'field2'])
        expect(cloned.disabledGroupFields).toEqual(['field3'])
    })

    it('should clone empty state', () => {
        const state: GroupingSettingsState = {
            selectedGroupFields: [],
            disabledGroupFields: [],
        }

        const cloned = cloneGroupingSettingsState(state)

        expect(cloned.selectedGroupFields).toEqual([])
        expect(cloned.disabledGroupFields).toEqual([])
    })
})

describe('parseGroupingSettingsState', () => {
    it('should parse valid state', () => {
        const raw = {
            selectedGroupFields: ['field1', 'field2'],
            disabledGroupFields: ['field3'],
        }

        const parsed = parseGroupingSettingsState(raw)

        expect(parsed.selectedGroupFields).toEqual(['field1', 'field2'])
        expect(parsed.disabledGroupFields).toEqual(['field3'])
    })

    it('should filter non-string items from selectedGroupFields', () => {
        const raw = {
            selectedGroupFields: ['field1', 42, null, 'field2'] as unknown as string[],
            disabledGroupFields: [],
        }

        const parsed = parseGroupingSettingsState(raw)

        expect(parsed.selectedGroupFields).toEqual(['field1', 'field2'])
    })

    it('should filter non-string items from disabledGroupFields', () => {
        const raw = {
            selectedGroupFields: [],
            disabledGroupFields: ['field1', true, 'field2'] as unknown as string[],
        }

        const parsed = parseGroupingSettingsState(raw)

        expect(parsed.disabledGroupFields).toEqual(['field1', 'field2'])
    })

    it('should return empty arrays for null', () => {
        const parsed = parseGroupingSettingsState(null)

        expect(parsed.selectedGroupFields).toEqual([])
        expect(parsed.disabledGroupFields).toEqual([])
    })

    it('should return empty arrays for undefined', () => {
        const parsed = parseGroupingSettingsState(undefined)

        expect(parsed.selectedGroupFields).toEqual([])
        expect(parsed.disabledGroupFields).toEqual([])
    })

    it('should return empty arrays for invalid input', () => {
        const parsed = parseGroupingSettingsState('invalid' as unknown as GroupingSettingsState)

        expect(parsed.selectedGroupFields).toEqual([])
        expect(parsed.disabledGroupFields).toEqual([])
    })

    it('should handle empty arrays', () => {
        const raw = {
            selectedGroupFields: [],
            disabledGroupFields: [],
        }

        const parsed = parseGroupingSettingsState(raw)

        expect(parsed.selectedGroupFields).toEqual([])
        expect(parsed.disabledGroupFields).toEqual([])
    })

    it('should handle partial data (missing keys)', () => {
        const raw = {
            selectedGroupFields: ['field1'],
        } as Partial<GroupingSettingsState>

        const parsed = parseGroupingSettingsState(raw)

        expect(parsed.selectedGroupFields).toEqual(['field1'])
        expect(parsed.disabledGroupFields).toEqual([])
    })
})

describe('resolveActiveGroupFields', () => {
    it('should return all selected fields when none are disabled', () => {
        const state: GroupingSettingsState = {
            selectedGroupFields: ['field1', 'field2', 'field3'],
            disabledGroupFields: [],
        }

        const active = resolveActiveGroupFields(state)

        expect(active).toEqual(['field1', 'field2', 'field3'])
    })

    it('should remove disabled fields from selected', () => {
        const state: GroupingSettingsState = {
            selectedGroupFields: ['field1', 'field2', 'field3'],
            disabledGroupFields: ['field2'],
        }

        const active = resolveActiveGroupFields(state)

        expect(active).toEqual(['field1', 'field3'])
    })

    it('should return empty when all fields are disabled', () => {
        const state: GroupingSettingsState = {
            selectedGroupFields: ['field1', 'field2'],
            disabledGroupFields: ['field1', 'field2'],
        }

        const active = resolveActiveGroupFields(state)

        expect(active).toEqual([])
    })

    it('should handle empty selected fields', () => {
        const state: GroupingSettingsState = {
            selectedGroupFields: [],
            disabledGroupFields: ['field1', 'field2'],
        }

        const active = resolveActiveGroupFields(state)

        expect(active).toEqual([])
    })

    it('should preserve order of selected fields', () => {
        const state: GroupingSettingsState = {
            selectedGroupFields: ['field1', 'field2', 'field3', 'field4'],
            disabledGroupFields: ['field2', 'field4'],
        }

        const active = resolveActiveGroupFields(state)

        expect(active).toEqual(['field1', 'field3'])
    })

    it('should not fail when disabled field is not in selected', () => {
        const state: GroupingSettingsState = {
            selectedGroupFields: ['field1'],
            disabledGroupFields: ['field1', 'field2'], // field2 not in selected
        }

        const active = resolveActiveGroupFields(state)

        expect(active).toEqual([])
    })
})
