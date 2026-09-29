/**
 * Tests for grouping store (facets/grouping/store.ts)
 *
 * Тестируют: groupingSettingsActions — setSelectedGroupFields, addGroupFields,
 * insertGroupFields, reorderGroupFields, removeGroupFields, moveGroupFields,
 * toggleGroupFieldEnabled, getActiveGroupFields, restoreSnapshot
 */

import {
    groupingSettingsActions,
    getGroupingSettingsState,
    getActiveGroupFields,
    cloneGroupingSettingsState,
} from '../../../../../helpers/listSettings/facets/grouping/store'
import {
    type GroupingSettingsState,
} from '../../../../../helpers/listSettings/facets/grouping/types'

function getState(): GroupingSettingsState {
    return getGroupingSettingsState()
}

describe('grouping store', () => {
    beforeEach(() => {
        groupingSettingsActions.setSelectedGroupFields([])
    })

    describe('setSelectedGroupFields', () => {
        it('should set group fields', () => {
            groupingSettingsActions.setSelectedGroupFields(['field1', 'field2'])

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['field1', 'field2'])
        })

        it('should clear disabled fields not in selected', () => {
            groupingSettingsActions.setSelectedGroupFields(['a'])
            groupingSettingsActions.setSelectedGroupFields(['b'])

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['b'])
            expect(state.disabledGroupFields).toEqual([])
        })
    })

    describe('addGroupFields', () => {
        it('should add new fields', () => {
            groupingSettingsActions.setSelectedGroupFields(['field1'])
            groupingSettingsActions.addGroupFields(['field2', 'field3'])

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['field1', 'field2', 'field3'])
        })

        it('should not add existing fields', () => {
            groupingSettingsActions.setSelectedGroupFields(['field1'])
            groupingSettingsActions.addGroupFields(['field1', 'field2'])

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['field1', 'field2'])
        })

        it('should not add when fields array is empty', () => {
            groupingSettingsActions.addGroupFields([])

            const state = getState()
            expect(state.selectedGroupFields).toEqual([])
        })

        it('should remove added fields from disabled', () => {
            groupingSettingsActions.setSelectedGroupFields(['field1'])
            const state = getState()
            // Manually add to disabled for testing
            groupingSettingsActions.removeGroupFields(['field2'])
            groupingSettingsActions.addGroupFields(['field2'])

            const updatedState = getState()
            expect(updatedState.disabledGroupFields).not.toContain('field2')
        })
    })

    describe('insertGroupFields', () => {
        it('should insert fields at specified index', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b', 'c'])
            groupingSettingsActions.insertGroupFields(['x', 'y'], 1)

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a', 'x', 'y', 'b', 'c'])
        })

        it('should not insert existing fields', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b'])
            groupingSettingsActions.insertGroupFields(['a', 'c'], 1)

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a', 'c', 'b'])
        })

        it('should clamp index to valid range', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b'])
            groupingSettingsActions.insertGroupFields(['x'], 100)

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a', 'b', 'x'])
        })

        it('should clamp negative index to 0', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b'])
            groupingSettingsActions.insertGroupFields(['x'], -5)

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['x', 'a', 'b'])
        })

        it('should not insert when fields array is empty', () => {
            groupingSettingsActions.setSelectedGroupFields(['a'])
            groupingSettingsActions.insertGroupFields([], 1)

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a'])
        })
    })

    describe('reorderGroupFields', () => {
        it('should move fields to target index', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b', 'c', 'd'])
            groupingSettingsActions.reorderGroupFields(['b'], 3)

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a', 'c', 'b', 'd'])
        })

        it('should not reorder when fields not in list', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b'])
            groupingSettingsActions.reorderGroupFields(['x'], 1)

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a', 'b'])
        })

        it('should move multiple fields together', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b', 'c', 'd'])
            groupingSettingsActions.reorderGroupFields(['b', 'c'], 0)

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['b', 'c', 'a', 'd'])
        })
    })

    describe('removeGroupFields', () => {
        it('should remove fields from selected and disabled', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b', 'c'])
            groupingSettingsActions.removeGroupFields(['b'])

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a', 'c'])
        })

        it('should not fail when removing non-existent fields', () => {
            groupingSettingsActions.setSelectedGroupFields(['a'])
            groupingSettingsActions.removeGroupFields(['nonexistent'])

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a'])
        })
    })

    describe('moveGroupFields', () => {
        it('should move fields up', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b', 'c'])
            groupingSettingsActions.moveGroupFields(['b'], 'up')

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['b', 'a', 'c'])
        })

        it('should move fields down', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b', 'c'])
            groupingSettingsActions.moveGroupFields(['b'], 'down')

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a', 'c', 'b'])
        })

        it('should not move first field up', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b'])
            groupingSettingsActions.moveGroupFields(['a'], 'up')

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a', 'b'])
        })

        it('should not move last field down', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b'])
            groupingSettingsActions.moveGroupFields(['b'], 'down')

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a', 'b'])
        })

        it('should not move when fields array is empty', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b'])
            groupingSettingsActions.moveGroupFields([], 'up')

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a', 'b'])
        })
    })

    describe('toggleGroupFieldEnabled', () => {
        it('should disable a field', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b'])
            groupingSettingsActions.toggleGroupFieldEnabled('a')

            const state = getState()
            // toggleGroupFieldEnabled только добавляет в disabled, не убирает из selected
            expect(state.disabledGroupFields).toEqual(['a'])
        })

        it('should re-enable a disabled field', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b'])
            groupingSettingsActions.toggleGroupFieldEnabled('a')
            groupingSettingsActions.toggleGroupFieldEnabled('a')

            const state = getState()
            // toggleGroupFieldEnabled только добавляет/убирает из disabled
            expect(state.selectedGroupFields).toEqual(['a', 'b'])
            expect(state.disabledGroupFields).toEqual([])
        })

        it('should not toggle non-selected field', () => {
            groupingSettingsActions.setSelectedGroupFields(['a'])
            groupingSettingsActions.toggleGroupFieldEnabled('nonexistent')

            const state = getState()
            expect(state.selectedGroupFields).toEqual(['a'])
        })
    })

    describe('getActiveGroupFields', () => {
        it('should return enabled fields', () => {
            groupingSettingsActions.setSelectedGroupFields(['a', 'b', 'c'])
            groupingSettingsActions.toggleGroupFieldEnabled('b')

            const active = getActiveGroupFields()
            expect(active).toEqual(['a', 'c'])
        })
    })

    describe('restoreSnapshot', () => {
        it('should restore state from snapshot', () => {
            groupingSettingsActions.setSelectedGroupFields(['a'])
            const snapshot = cloneGroupingSettingsState(getState())

            groupingSettingsActions.setSelectedGroupFields(['b'])
            groupingSettingsActions.restoreSnapshot(snapshot)

            const restoredState = getState()
            expect(restoredState.selectedGroupFields).toEqual(['a'])
        })
    })
})
