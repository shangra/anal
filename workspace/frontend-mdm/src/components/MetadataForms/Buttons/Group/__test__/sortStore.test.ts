/**
 * Tests for sort store (facets/sort/store.ts)
 *
 * Тестируют: sortSettingsActions — addSortField, addSortFields, removeSortField,
 * removeSortFields, changeSortDirection, moveSortRules, reorderSortRules,
 * toggleSortFieldEnabled, setAvailableFields, setFieldTypes, restoreSnapshot
 */

import {
    sortSettingsActions,
    getSortSettingsState,
    getActiveSortRules,
} from '../../../../../helpers/listSettings/facets/sort/store'
import type { SortSettingsState } from '../../../../../helpers/listSettings/facets/sort/types'

function getState(): SortSettingsState {
    return getSortSettingsState()
}

const FIELD_TYPES: SortSettingsState['fieldTypes'] = {
    field1: 'string',
    field2: 'number',
}

const AVAILABLE_FIELDS: SortSettingsState['availableFields'] = [
    { id: '1', label: 'Поле 1', value: 'field1', isGroupLevel: false, children: [] },
    { id: '2', label: 'Поле 2', value: 'field2', isGroupLevel: false, children: [] },
]

describe('sort store', () => {
    beforeEach(() => {
        sortSettingsActions.removeSortFields(
            getState().sortRules.map((r) => r.field),
        )
    })

    describe('addSortField', () => {
        it('should add a new field with default direction', () => {
            sortSettingsActions.addSortField('field1')

            const state = getState()
            expect(state.sortRules).toEqual([
                { field: 'field1', direction: 'ASC', enabled: true },
            ])
        })

        it('should not add an existing field', () => {
            sortSettingsActions.addSortField('field1')
            sortSettingsActions.addSortField('field1')

            const state = getState()
            expect(state.sortRules).toHaveLength(1)
        })

        it('should ignore invalid field names', () => {
            sortSettingsActions.addSortField('')
            sortSettingsActions.addSortField('undefined')
            sortSettingsActions.addSortField('null.field')

            const state = getState()
            expect(state.sortRules).toEqual([])
        })
    })

    describe('addSortFields', () => {
        it('should add multiple fields', () => {
            sortSettingsActions.addSortFields(['field1', 'field2'])

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field1', 'field2'])
        })

        it('should not add already existing fields', () => {
            sortSettingsActions.addSortField('field1')
            sortSettingsActions.addSortFields(['field1', 'field2'])

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field1', 'field2'])
        })

        it('should not update when array is empty', () => {
            sortSettingsActions.addSortFields([])

            const state = getState()
            expect(state.sortRules).toEqual([])
        })

        it('should ignore invalid fields', () => {
            sortSettingsActions.addSortFields(['undefined', 'field1'])

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field1'])
        })
    })

    describe('removeSortField', () => {
        it('should remove a field rule', () => {
            sortSettingsActions.addSortFields(['field1', 'field2'])
            sortSettingsActions.removeSortField('field1')

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field2'])
        })

        it('should not fail when field does not exist', () => {
            sortSettingsActions.addSortField('field1')
            sortSettingsActions.removeSortField('nonexistent')

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field1'])
        })
    })

    describe('removeSortFields', () => {
        it('should remove multiple fields', () => {
            sortSettingsActions.addSortFields(['field1', 'field2', 'field3'])
            sortSettingsActions.removeSortFields(['field1', 'field3'])

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field2'])
        })
    })

    describe('changeSortDirection', () => {
        it('should change direction to DESC', () => {
            sortSettingsActions.addSortField('field1')
            sortSettingsActions.changeSortDirection('field1', 'DESC')

            const state = getState()
            expect(state.sortRules[0].direction).toBe('DESC')
        })

        it('should change direction back to ASC', () => {
            sortSettingsActions.addSortField('field1')
            sortSettingsActions.changeSortDirection('field1', 'DESC')
            sortSettingsActions.changeSortDirection('field1', 'ASC')

            const state = getState()
            expect(state.sortRules[0].direction).toBe('ASC')
        })

        it('should ignore invalid field names', () => {
            sortSettingsActions.addSortField('field1')
            sortSettingsActions.changeSortDirection('undefined', 'DESC')

            const state = getState()
            expect(state.sortRules[0].direction).toBe('ASC')
        })
    })

    describe('moveSortRules', () => {
        it('should move a field up', () => {
            sortSettingsActions.addSortFields(['field1', 'field2', 'field3'])
            sortSettingsActions.moveSortRules(['field2'], 'up')

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field2', 'field1', 'field3'])
        })

        it('should move a field down', () => {
            sortSettingsActions.addSortFields(['field1', 'field2', 'field3'])
            sortSettingsActions.moveSortRules(['field1'], 'down')

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field2', 'field1', 'field3'])
        })

        it('should not move first field up', () => {
            sortSettingsActions.addSortFields(['field1', 'field2'])
            sortSettingsActions.moveSortRules(['field1'], 'up')

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field1', 'field2'])
        })

        it('should not move last field down', () => {
            sortSettingsActions.addSortFields(['field1', 'field2'])
            sortSettingsActions.moveSortRules(['field2'], 'down')

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field1', 'field2'])
        })
    })

    describe('reorderSortRules', () => {
        it('should move a field to target index', () => {
            sortSettingsActions.addSortFields(['field1', 'field2', 'field3'])
            sortSettingsActions.reorderSortRules(['field1'], 2)

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field2', 'field1', 'field3'])
        })

        it('should move multiple fields together', () => {
            sortSettingsActions.addSortFields(['field1', 'field2', 'field3'])
            sortSettingsActions.reorderSortRules(['field2', 'field3'], 0)

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field2', 'field3', 'field1'])
        })

        it('should not reorder when fields not in list', () => {
            sortSettingsActions.addSortFields(['field1', 'field2'])
            sortSettingsActions.reorderSortRules(['nonexistent'], 1)

            const state = getState()
            expect(state.sortRules.map((r) => r.field)).toEqual(['field1', 'field2'])
        })
    })

    describe('toggleSortFieldEnabled', () => {
        it('should disable a field', () => {
            sortSettingsActions.addSortField('field1')
            sortSettingsActions.toggleSortFieldEnabled('field1')

            const state = getState()
            expect(state.sortRules[0].enabled).toBe(false)
        })

        it('should re-enable a disabled field', () => {
            sortSettingsActions.addSortField('field1')
            sortSettingsActions.toggleSortFieldEnabled('field1')
            sortSettingsActions.toggleSortFieldEnabled('field1')

            const state = getState()
            expect(state.sortRules[0].enabled).toBe(true)
        })

        it('should not toggle a non-existent field', () => {
            sortSettingsActions.addSortField('field1')
            sortSettingsActions.toggleSortFieldEnabled('nonexistent')

            const state = getState()
            expect(state.sortRules[0].enabled).toBe(true)
        })
    })

    describe('getActiveSortRules', () => {
        it('should return only enabled rules', () => {
            sortSettingsActions.addSortFields(['field1', 'field2'])
            sortSettingsActions.toggleSortFieldEnabled('field2')

            const active = getActiveSortRules()
            expect(active.map((r) => r.field)).toEqual(['field1'])
        })
    })

    describe('setAvailableFields', () => {
        it('should set available fields', () => {
            sortSettingsActions.setAvailableFields(AVAILABLE_FIELDS)

            const state = getState()
            expect(state.availableFields).toEqual(AVAILABLE_FIELDS)
        })
    })

    describe('setFieldTypes', () => {
        it('should set field types', () => {
            sortSettingsActions.setFieldTypes(FIELD_TYPES)

            const state = getState()
            expect(state.fieldTypes).toEqual(FIELD_TYPES)
        })
    })

    describe('restoreSnapshot', () => {
        it('should restore state from snapshot', () => {
            sortSettingsActions.addSortFields(['field1', 'field2'])
            const snapshot = {
                sortRules: [
                    { field: 'field1', direction: 'ASC' as const, enabled: true },
                ],
                fieldTypes: {},
                availableFields: [],
            }

            sortSettingsActions.addSortField('field3')
            sortSettingsActions.restoreSnapshot(snapshot)

            const restoredState = getState()
            expect(restoredState.sortRules).toEqual([
                { field: 'field1', direction: 'ASC', enabled: true },
            ])
        })
    })
})
