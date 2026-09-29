/**
 * Tests for selection store (facets/selection/store.ts)
 *
 * Тестируют: selectionSettingsActions — add, update, toggle, remove, move, group, ungroup, setLogic
 */

import {
    selectionSettingsActions,
    getSelectionSettingsState,
    cloneSelectionSettingsState,
} from '../../../../../helpers/listSettings/facets/selection/store'
import {
    createSelectionCondition,
    createSelectionGroup,
    isSelectionGroup,
    type SelectionSettingsState,
    type SelectionCondition,
} from '../../../../../helpers/listSettings/facets/selection/types'

function getState(): SelectionSettingsState {
    return getSelectionSettingsState()
}

describe('selection store', () => {
    beforeEach(() => {
        selectionSettingsActions.setSelectionNodes([])
    })

    describe('setSelectionNodes', () => {
        it('should set nodes directly', () => {
            const nodes = [createSelectionCondition('a'), createSelectionCondition('b')]
            selectionSettingsActions.setSelectionNodes(nodes)

            const state = getState()
            expect(state.selectionNodes).toHaveLength(2)
        })

        it('should replace existing nodes', () => {
            selectionSettingsActions.setSelectionNodes([createSelectionCondition('x')])
            selectionSettingsActions.setSelectionNodes([createSelectionCondition('y')])

            const state = getState()
            expect(state.selectionNodes).toHaveLength(1)
            expect((state.selectionNodes[0] as SelectionCondition).field).toBe('y')
        })
    })

    describe('addSelectionConditions', () => {
        it('should add new conditions', () => {
            selectionSettingsActions.addSelectionConditions(['field1', 'field2'])

            const state = getState()
            expect(state.selectionNodes).toHaveLength(2)
        })

        it('should not add when fields array is empty', () => {
            selectionSettingsActions.addSelectionConditions([])

            const state = getState()
            expect(state.selectionNodes).toHaveLength(0)
        })

        it('should use default comparison for field type', () => {
            selectionSettingsActions.addSelectionConditions(['name'])

            const state = getState()
            expect(state.selectionNodes).toHaveLength(1)
            expect((state.selectionNodes[0] as SelectionCondition).comparison).toBeDefined()
        })
    })

    describe('updateSelectionCondition', () => {
        it('should update condition value', () => {
            selectionSettingsActions.addSelectionConditions(['name'])
            const state = getState()
            const id = state.selectionNodes[0].id

            selectionSettingsActions.updateSelectionCondition(id, { value: 'updated' })

            const updatedState = getState()
            expect((updatedState.selectionNodes[0] as SelectionCondition).value).toBe('updated')
        })

        it('should update condition enabled', () => {
            selectionSettingsActions.addSelectionConditions(['name'])
            const state = getState()
            const id = state.selectionNodes[0].id

            selectionSettingsActions.updateSelectionCondition(id, { enabled: false })

            const updatedState = getState()
            expect((updatedState.selectionNodes[0] as SelectionCondition).enabled).toBe(false)
        })

        it('should not update non-existent node', () => {
            selectionSettingsActions.addSelectionConditions(['name'])

            selectionSettingsActions.updateSelectionCondition('nonexistent', { value: 'x' })

            const state = getState()
            expect((state.selectionNodes[0] as SelectionCondition).value).toBe('')
        })

        it('should update condition inside group', () => {
            const cond = createSelectionCondition('name')
            const group = createSelectionGroup([cond], 'and')
            selectionSettingsActions.setSelectionNodes([group])

            selectionSettingsActions.updateSelectionCondition(cond.id, { value: 'updated' })

            const state = getState()
            if (isSelectionGroup(state.selectionNodes[0])) {
                expect((state.selectionNodes[0].children[0] as SelectionCondition).value).toBe('updated')
            }
        })
    })

    describe('toggleSelectionNodeEnabled', () => {
        it('should toggle condition enabled state', () => {
            selectionSettingsActions.addSelectionConditions(['name'])
            const state = getState()
            const id = state.selectionNodes[0].id

            selectionSettingsActions.toggleSelectionNodeEnabled(id)

            const updatedState = getState()
            expect((updatedState.selectionNodes[0] as SelectionCondition).enabled).toBe(false)

            selectionSettingsActions.toggleSelectionNodeEnabled(id)

            const finalState = getState()
            expect((finalState.selectionNodes[0] as SelectionCondition).enabled).toBe(true)
        })

        it('should not toggle non-existent node', () => {
            selectionSettingsActions.toggleSelectionNodeEnabled('nonexistent')

            const state = getState()
            expect(state.selectionNodes).toHaveLength(0)
        })
    })

    describe('removeSelectionNodes', () => {
        it('should remove conditions by ids', () => {
            selectionSettingsActions.addSelectionConditions(['a', 'b', 'c'])
            const state = getState()
            const idToRemove = state.selectionNodes[0].id

            selectionSettingsActions.removeSelectionNodes([idToRemove])

            const updatedState = getState()
            expect(updatedState.selectionNodes).toHaveLength(2)
        })

        it('should not fail when removing non-existent ids', () => {
            selectionSettingsActions.addSelectionConditions(['a'])

            selectionSettingsActions.removeSelectionNodes(['nonexistent'])

            const state = getState()
            expect(state.selectionNodes).toHaveLength(1)
        })
    })

    describe('moveSelectionNodes', () => {
        it('should move nodes up', () => {
            selectionSettingsActions.addSelectionConditions(['a', 'b', 'c'])
            const state = getState()
            const idB = state.selectionNodes[1].id

            selectionSettingsActions.moveSelectionNodes([idB], 'up')

            const updatedState = getState()
            expect((updatedState.selectionNodes[0] as SelectionCondition).field).toBe('b')
        })

        it('should move nodes down', () => {
            selectionSettingsActions.addSelectionConditions(['a', 'b', 'c'])
            const state = getState()
            const idB = state.selectionNodes[1].id

            selectionSettingsActions.moveSelectionNodes([idB], 'down')

            const updatedState = getState()
            expect((updatedState.selectionNodes[2] as SelectionCondition).field).toBe('b')
        })
    })

    describe('groupSelectionNodes', () => {
        it('should group sibling conditions', () => {
            selectionSettingsActions.addSelectionConditions(['a', 'b', 'c'])
            const state = getState()
            const idA = state.selectionNodes[0].id
            const idC = state.selectionNodes[2].id

            selectionSettingsActions.groupSelectionNodes([idA, idC], 'and')

            const updatedState = getState()
            const group = updatedState.selectionNodes.find((n) => isSelectionGroup(n))
            if (group && isSelectionGroup(group)) {
                expect(group.children).toHaveLength(2)
                expect(group.logic).toBe('and')
            }
        })

        it('should not group non-existent nodes', () => {
            selectionSettingsActions.addSelectionConditions(['a'])

            selectionSettingsActions.groupSelectionNodes(['nonexistent1', 'nonexistent2'])

            const state = getState()
            expect(state.selectionNodes).toHaveLength(1)
        })
    })

    describe('ungroupSelectionNodes', () => {
        it('should ungroup a group', () => {
            const condA = createSelectionCondition('a')
            const condB = createSelectionCondition('b')
            const group = createSelectionGroup([condA, condB], 'and')
            selectionSettingsActions.setSelectionNodes([group])

            selectionSettingsActions.ungroupSelectionNodes([group.id])

            const updatedState = getState()
            expect(updatedState.selectionNodes).toHaveLength(2)
        })
    })

    describe('setSelectionGroupLogic', () => {
        it('should change group logic', () => {
            const cond = createSelectionCondition('a')
            const group = createSelectionGroup([cond], 'and')
            selectionSettingsActions.setSelectionNodes([group])

            selectionSettingsActions.setSelectionGroupLogic(group.id, 'or')

            const updatedState = getState()
            if (isSelectionGroup(updatedState.selectionNodes[0])) {
                expect(updatedState.selectionNodes[0].logic).toBe('or')
            }
        })
    })

    describe('getActiveSelectionConditions', () => {
        it('should return enabled conditions', () => {
            const condA = createSelectionCondition('a')
            const condB = createSelectionCondition('b', { enabled: false })
            selectionSettingsActions.setSelectionNodes([condA, condB])

            const active = selectionSettingsActions.getActiveSelectionConditions()
            expect(active).toHaveLength(1)
        })
    })

    describe('restoreSnapshot', () => {
        it('should restore state from snapshot', () => {
            selectionSettingsActions.addSelectionConditions(['a'])
            const snapshot = cloneSelectionSettingsState(getState())

            selectionSettingsActions.addSelectionConditions(['b'])
            selectionSettingsActions.restoreSnapshot(snapshot)

            const restoredState = getState()
            expect(restoredState.selectionNodes).toHaveLength(1)
        })
    })
})
