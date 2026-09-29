/**
 * Tests for sort types and utils (facets/sort/types.ts)
 *
 * Тестируют: emptySortSettingsState, cloneSortSettingsState,
 * parseSortSettingsState, resolveActiveSortRules, sortFieldExists
 */

import {
    emptySortSettingsState,
    cloneSortSettingsState,
    parseSortSettingsState,
    resolveActiveSortRules,
    sortFieldExists,
    type SortSettingsState,
    type SortRule,
} from '../../../../../helpers/listSettings/facets/sort/types'

const RULES: SortRule[] = [
    { field: 'field1', direction: 'ASC', enabled: true },
    { field: 'field2', direction: 'DESC', enabled: false },
]

describe('emptySortSettingsState', () => {
    it('should return state with empty sortRules', () => {
        const state = emptySortSettingsState()

        expect(state.sortRules).toEqual([])
    })

    it('should return a new object each time', () => {
        const state1 = emptySortSettingsState()
        const state2 = emptySortSettingsState()

        expect(state1).not.toBe(state2)
    })

    it('should have correct type structure', () => {
        const state: SortSettingsState = emptySortSettingsState()

        expect(typeof state).toBe('object')
        expect(Array.isArray(state.sortRules)).toBe(true)
        expect(state.availableFields).toEqual([])
        expect(state.fieldTypes).toEqual({})
    })
})

describe('cloneSortSettingsState', () => {
    it('should create independent copy', () => {
        const state: SortSettingsState = {
            sortRules: RULES,
            availableFields: [],
            fieldTypes: { field1: 'string' },
        }

        const cloned = cloneSortSettingsState(state)

        expect(cloned).not.toBe(state)
        expect(cloned.sortRules).not.toBe(state.sortRules)
        expect(cloned.sortRules[0]).not.toBe(state.sortRules[0])
        expect(cloned.fieldTypes).not.toBe(state.fieldTypes)
    })

    it('should clone with correct values', () => {
        const state: SortSettingsState = {
            sortRules: RULES,
            availableFields: [],
            fieldTypes: { field1: 'string', field2: 'number' },
        }

        const cloned = cloneSortSettingsState(state)

        expect(cloned.sortRules).toEqual(RULES)
        expect(cloned.fieldTypes).toEqual({ field1: 'string', field2: 'number' })
    })

    it('should clone empty state', () => {
        const state = emptySortSettingsState()

        const cloned = cloneSortSettingsState(state)

        expect(cloned.sortRules).toEqual([])
        expect(cloned.availableFields).toEqual([])
        expect(cloned.fieldTypes).toEqual({})
    })
})

describe('parseSortSettingsState', () => {
    it('should parse valid state with sortRules', () => {
        const raw = { sortRules: RULES }

        const parsed = parseSortSettingsState(raw)

        expect(parsed.sortRules).toEqual(RULES)
    })

    it('should filter invalid rules', () => {
        const raw = {
            sortRules: [
                { field: 'field1', direction: 'ASC', enabled: true },
                { field: 42, direction: 'ASC', enabled: true },
                { field: 'field2', direction: 'ASC', enabled: true },
                null,
            ],
        }

        const parsed = parseSortSettingsState(raw)

        expect(parsed.sortRules).toEqual([
            { field: 'field1', direction: 'ASC', enabled: true },
            { field: 'field2', direction: 'ASC', enabled: true },
        ])
    })

    it('should filter rules with invalid direction', () => {
        const raw = {
            sortRules: [
                { field: 'field1', direction: 'ASC', enabled: true },
                { field: 'field2', direction: 'UNKNOWN', enabled: true },
            ],
        }

        const parsed = parseSortSettingsState(raw)

        expect(parsed.sortRules).toEqual([
            { field: 'field1', direction: 'ASC', enabled: true },
        ])
    })

    it('should migrate from legacy ascSortFields/descSortFields', () => {
        const raw = {
            ascSortFields: ['field1', 'field2'],
            descSortFields: ['field3'],
        }

        const parsed = parseSortSettingsState(raw)

        expect(parsed.sortRules).toEqual([
            { field: 'field1', direction: 'ASC', enabled: true },
            { field: 'field2', direction: 'ASC', enabled: true },
            { field: 'field3', direction: 'DESC', enabled: true },
        ])
    })

    it('should apply disabledSortFields to migrated rules', () => {
        const raw = {
            ascSortFields: ['field1', 'field2'],
            disabledSortFields: ['field2'],
        }

        const parsed = parseSortSettingsState(raw)

        expect(parsed.sortRules).toEqual([
            { field: 'field1', direction: 'ASC', enabled: true },
            { field: 'field2', direction: 'ASC', enabled: false },
        ])
    })

    it('should return empty sortRules for null', () => {
        const parsed = parseSortSettingsState(null)

        expect(parsed.sortRules).toEqual([])
    })

    it('should return empty sortRules for undefined', () => {
        const parsed = parseSortSettingsState(undefined)

        expect(parsed.sortRules).toEqual([])
    })

    it('should return empty sortRules for invalid input', () => {
        const parsed = parseSortSettingsState('invalid' as unknown as SortSettingsState)

        expect(parsed.sortRules).toEqual([])
    })

    it('should parse availableFields and fieldTypes', () => {
        const raw = {
            sortRules: [],
            availableFields: [{ id: '1', label: 'Поле', value: 'field1', isGroupLevel: false, children: [] }],
            fieldTypes: { field1: 'date' },
        }

        const parsed = parseSortSettingsState(raw)

        expect(parsed.availableFields).toEqual(raw.availableFields)
        expect(parsed.fieldTypes).toEqual({ field1: 'date' })
    })
})

describe('resolveActiveSortRules', () => {
    it('should return only enabled rules', () => {
        const state: SortSettingsState = {
            sortRules: RULES,
            availableFields: [],
            fieldTypes: {},
        }

        const active = resolveActiveSortRules(state)

        expect(active).toEqual([{ field: 'field1', direction: 'ASC', enabled: true }])
    })

    it('should return empty when all rules are disabled', () => {
        const state: SortSettingsState = {
            sortRules: [
                { field: 'field1', direction: 'ASC', enabled: false },
                { field: 'field2', direction: 'DESC', enabled: false },
            ],
            availableFields: [],
            fieldTypes: {},
        }

        const active = resolveActiveSortRules(state)

        expect(active).toEqual([])
    })

    it('should handle empty sortRules', () => {
        const state = emptySortSettingsState()

        const active = resolveActiveSortRules(state)

        expect(active).toEqual([])
    })

    it('should preserve order of rules', () => {
        const state: SortSettingsState = {
            sortRules: [
                { field: 'a', direction: 'ASC', enabled: true },
                { field: 'b', direction: 'DESC', enabled: false },
                { field: 'c', direction: 'ASC', enabled: true },
                { field: 'd', direction: 'DESC', enabled: false },
            ],
            availableFields: [],
            fieldTypes: {},
        }

        const active = resolveActiveSortRules(state)

        expect(active.map((r) => r.field)).toEqual(['a', 'c'])
    })
})

describe('sortFieldExists', () => {
    it('should return true when field exists', () => {
        const state: SortSettingsState = {
            sortRules: RULES,
            availableFields: [],
            fieldTypes: {},
        }

        expect(sortFieldExists(state, 'field1')).toBe(true)
    })

    it('should return false when field does not exist', () => {
        const state: SortSettingsState = {
            sortRules: RULES,
            availableFields: [],
            fieldTypes: {},
        }

        expect(sortFieldExists(state, 'nonexistent')).toBe(false)
    })

    it('should return false for empty sortRules', () => {
        const state = emptySortSettingsState()

        expect(sortFieldExists(state, 'field1')).toBe(false)
    })
})