/**
 * Tests for helpers/listSettings/facets/conditionalFormatting/store.ts
 *
 * Тестируют: conditionalFormattingSettingsActions — addRule, updateRule,
 * toggleRuleEnabled, setConditionNodes, removeRules, moveRules, restoreSnapshot.
 */

import {
    conditionalFormattingSettingsActions,
    getConditionalFormattingSettingsState,
    cloneConditionalFormattingSettingsState,
} from '../../../../../helpers/listSettings/facets/conditionalFormatting/store'
import {
    type ConditionalFormattingSettingsState,
} from '../../../../../helpers/listSettings/facets/conditionalFormatting/types'
import {
    createSelectionCondition,
    type SelectionNode,
} from '../../../../../helpers/listSettings/facets/selection/types'

function getState(): ConditionalFormattingSettingsState {
    return getConditionalFormattingSettingsState()
}

describe('conditional formatting store', () => {
    beforeEach(() => {
        conditionalFormattingSettingsActions.restoreSnapshot({ conditionalFormattingRules: [] })
    })

    describe('addRule', () => {
        it('should add a new rule', () => {
            conditionalFormattingSettingsActions.addRule()

            const state = getState()
            expect(state.conditionalFormattingRules).toHaveLength(1)
            expect(state.conditionalFormattingRules[0].enabled).toBe(true)
        })

        it('should add a rule with specified default field', () => {
            conditionalFormattingSettingsActions.addRule('name')

            const state = getState()
            expect(state.conditionalFormattingRules).toHaveLength(1)
            const cond = state.conditionalFormattingRules[0].conditionNodes[0] as SelectionNode & { field: string }
            expect(cond.field).toBe('name')
        })

        it('should append to existing rules', () => {
            conditionalFormattingSettingsActions.addRule('field1')
            conditionalFormattingSettingsActions.addRule('field2')

            const state = getState()
            expect(state.conditionalFormattingRules).toHaveLength(2)
        })

        it('should create unique rule ids', () => {
            conditionalFormattingSettingsActions.addRule('a')
            conditionalFormattingSettingsActions.addRule('b')

            const state = getState()
            expect(state.conditionalFormattingRules[0].id).not.toBe(state.conditionalFormattingRules[1].id)
        })
    })

    describe('updateRule', () => {
        it('should update rule presentation', () => {
            conditionalFormattingSettingsActions.addRule()
            const state = getState()
            const ruleId = state.conditionalFormattingRules[0].id

            conditionalFormattingSettingsActions.updateRule(ruleId, { presentation: 'New Name' })

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[0].presentation).toBe('New Name')
        })

        it('should update rule appearance', () => {
            conditionalFormattingSettingsActions.addRule()
            const state = getState()
            const ruleId = state.conditionalFormattingRules[0].id

            conditionalFormattingSettingsActions.updateRule(ruleId, {
                appearance: { backgroundColor: '#ff0000', textColor: '#ffffff' },
            })

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[0].appearance.backgroundColor).toBe('#ff0000')
            expect(updatedState.conditionalFormattingRules[0].appearance.textColor).toBe('#ffffff')
        })

        it('should update rule conditionNodes', () => {
            conditionalFormattingSettingsActions.addRule()
            const state = getState()
            const ruleId = state.conditionalFormattingRules[0].id

            const newConds = [
                createSelectionCondition('newField', { comparison: 'contains', value: 'test' }),
            ]
            conditionalFormattingSettingsActions.setConditionNodes(ruleId, newConds)

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[0].conditionNodes).toHaveLength(1)
            expect((updatedState.conditionalFormattingRules[0].conditionNodes[0] as SelectionNode & { field: string }).field).toBe('newField')
        })

        it('should update rule targetFields', () => {
            conditionalFormattingSettingsActions.addRule()
            const state = getState()
            const ruleId = state.conditionalFormattingRules[0].id

            conditionalFormattingSettingsActions.updateRule(ruleId, {
                targetFields: ['name', 'code'],
            })

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[0].targetFields).toEqual(['name', 'code'])
        })

        it('should not update non-existent rule', () => {
            conditionalFormattingSettingsActions.addRule()

            conditionalFormattingSettingsActions.updateRule('nonexistent', { presentation: 'X' })

            const state = getState()
            expect(state.conditionalFormattingRules[0].presentation).toBe('')
        })

        it('should not affect other rules', () => {
            conditionalFormattingSettingsActions.addRule('field1')
            conditionalFormattingSettingsActions.addRule('field2')
            const state = getState()
            const rule1Id = state.conditionalFormattingRules[0].id
            const rule2Id = state.conditionalFormattingRules[1].id

            conditionalFormattingSettingsActions.updateRule(rule1Id, { presentation: 'Updated' })

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules.find((r) => r.id === rule1Id)?.presentation).toBe('Updated')
            expect(updatedState.conditionalFormattingRules.find((r) => r.id === rule2Id)?.presentation).toBe('')
        })
    })

    describe('toggleRuleEnabled', () => {
        it('should toggle rule from enabled to disabled', () => {
            conditionalFormattingSettingsActions.addRule()
            const state = getState()
            const ruleId = state.conditionalFormattingRules[0].id

            conditionalFormattingSettingsActions.toggleRuleEnabled(ruleId)

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[0].enabled).toBe(false)
        })

        it('should toggle rule from disabled to enabled', () => {
            conditionalFormattingSettingsActions.addRule()
            const state = getState()
            const ruleId = state.conditionalFormattingRules[0].id

            conditionalFormattingSettingsActions.toggleRuleEnabled(ruleId)
            conditionalFormattingSettingsActions.toggleRuleEnabled(ruleId)

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[0].enabled).toBe(true)
        })

        it('should not toggle non-existent rule', () => {
            conditionalFormattingSettingsActions.addRule()

            conditionalFormattingSettingsActions.toggleRuleEnabled('nonexistent')

            const state = getState()
            expect(state.conditionalFormattingRules[0].enabled).toBe(true)
        })
    })

    describe('setConditionNodes', () => {
        it('should set new condition nodes', () => {
            conditionalFormattingSettingsActions.addRule()
            const state = getState()
            const ruleId = state.conditionalFormattingRules[0].id

            const newConds = [
                createSelectionCondition('fieldA', { comparison: 'eq', value: '1' }),
                createSelectionCondition('fieldB', { comparison: 'eq', value: '2' }),
            ]
            conditionalFormattingSettingsActions.setConditionNodes(ruleId, newConds)

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[0].conditionNodes).toHaveLength(2)
        })

        it('should clear condition nodes', () => {
            conditionalFormattingSettingsActions.addRule()
            const state = getState()
            const ruleId = state.conditionalFormattingRules[0].id

            conditionalFormattingSettingsActions.setConditionNodes(ruleId, [])

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[0].conditionNodes).toHaveLength(0)
        })

        it('should not affect other rules', () => {
            conditionalFormattingSettingsActions.addRule('field1')
            conditionalFormattingSettingsActions.addRule('field2')
            const state = getState()
            const rule1Id = state.conditionalFormattingRules[0].id
            const rule2Id = state.conditionalFormattingRules[1].id

            conditionalFormattingSettingsActions.setConditionNodes(rule1Id, [])

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules.find((r) => r.id === rule1Id)?.conditionNodes).toHaveLength(0)
            expect(updatedState.conditionalFormattingRules.find((r) => r.id === rule2Id)?.conditionNodes).toHaveLength(1)
        })
    })

    describe('removeRules', () => {
        it('should remove rules by ids', () => {
            conditionalFormattingSettingsActions.addRule('a')
            conditionalFormattingSettingsActions.addRule('b')
            conditionalFormattingSettingsActions.addRule('c')
            const state = getState()

            conditionalFormattingSettingsActions.removeRules([state.conditionalFormattingRules[1].id])

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules).toHaveLength(2)
        })

        it('should remove multiple rules', () => {
            conditionalFormattingSettingsActions.addRule('a')
            conditionalFormattingSettingsActions.addRule('b')
            conditionalFormattingSettingsActions.addRule('c')
            const state = getState()

            conditionalFormattingSettingsActions.removeRules([
                state.conditionalFormattingRules[0].id,
                state.conditionalFormattingRules[1].id,
            ])

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules).toHaveLength(1)
            expect(updatedState.conditionalFormattingRules[0].presentation).toBe('')
        })

        it('should not fail when removing non-existent ids', () => {
            conditionalFormattingSettingsActions.addRule('a')

            conditionalFormattingSettingsActions.removeRules(['nonexistent'])

            const state = getState()
            expect(state.conditionalFormattingRules).toHaveLength(1)
        })

        it('should remove all rules', () => {
            conditionalFormattingSettingsActions.addRule('a')
            conditionalFormattingSettingsActions.addRule('b')
            const state = getState()

            conditionalFormattingSettingsActions.removeRules(state.conditionalFormattingRules.map((r) => r.id))

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules).toHaveLength(0)
        })
    })

    describe('moveRules', () => {
        it('should move rule up', () => {
            conditionalFormattingSettingsActions.addRule('a')
            conditionalFormattingSettingsActions.addRule('b')
            conditionalFormattingSettingsActions.addRule('c')
            const state = getState()
            const idB = state.conditionalFormattingRules[1].id

            conditionalFormattingSettingsActions.moveRules([idB], 'up')

            const updatedState = getState()
            expect((updatedState.conditionalFormattingRules[0].conditionNodes[0] as SelectionNode & { field: string }).field).toBe('b')
        })

        it('should move rule down', () => {
            conditionalFormattingSettingsActions.addRule('a')
            conditionalFormattingSettingsActions.addRule('b')
            conditionalFormattingSettingsActions.addRule('c')
            const state = getState()
            const idB = state.conditionalFormattingRules[1].id

            conditionalFormattingSettingsActions.moveRules([idB], 'down')

            const updatedState = getState()
            expect((updatedState.conditionalFormattingRules[2].conditionNodes[0] as SelectionNode & { field: string }).field).toBe('b')
        })

        it('should not move first rule up', () => {
            conditionalFormattingSettingsActions.addRule('a')
            conditionalFormattingSettingsActions.addRule('b')
            const state = getState()
            const idA = state.conditionalFormattingRules[0].id

            conditionalFormattingSettingsActions.moveRules([idA], 'up')

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[0].id).toBe(idA)
        })

        it('should not move last rule down', () => {
            conditionalFormattingSettingsActions.addRule('a')
            conditionalFormattingSettingsActions.addRule('b')
            const state = getState()
            const idB = state.conditionalFormattingRules[1].id

            conditionalFormattingSettingsActions.moveRules([idB], 'down')

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[1].id).toBe(idB)
        })

        it('should not move when rules list is empty', () => {
            conditionalFormattingSettingsActions.moveRules([], 'up')
            const state = getState()
            expect(state.conditionalFormattingRules).toHaveLength(0)
        })

        it('should move multiple selected rules', () => {
            conditionalFormattingSettingsActions.addRule('a')
            conditionalFormattingSettingsActions.addRule('b')
            conditionalFormattingSettingsActions.addRule('c')
            conditionalFormattingSettingsActions.addRule('d')
            const state = getState()
            const idA = state.conditionalFormattingRules[0].id
            const idB = state.conditionalFormattingRules[1].id

            conditionalFormattingSettingsActions.moveRules([idA, idB], 'down')

            const updatedState = getState()
            // a,b (positions 0,1) moved down → c,a,b,d
            // a and b end up at positions 1 and 2 (not 2 and 3)
            expect(updatedState.conditionalFormattingRules[1].id).toBe(idA)
            expect(updatedState.conditionalFormattingRules[2].id).toBe(idB)
        })
    })

    describe('restoreSnapshot', () => {
        it('should restore state from snapshot', () => {
            conditionalFormattingSettingsActions.addRule('a')
            conditionalFormattingSettingsActions.addRule('b')
            const snapshot = cloneConditionalFormattingSettingsState(getState())

            conditionalFormattingSettingsActions.addRule('c')
            expect(getState().conditionalFormattingRules).toHaveLength(3)

            conditionalFormattingSettingsActions.restoreSnapshot(snapshot)

            const restoredState = getState()
            expect(restoredState.conditionalFormattingRules).toHaveLength(2)
        })

        it('should deep clone snapshot before restoring', () => {
            conditionalFormattingSettingsActions.addRule('a')
            const snapshot = cloneConditionalFormattingSettingsState(getState())

            conditionalFormattingSettingsActions.addRule('b')
            const lastRule = snapshot.conditionalFormattingRules[0]
            if (lastRule) {
                lastRule.enabled = false
            }

            conditionalFormattingSettingsActions.restoreSnapshot(snapshot)

            const restoredState = getState()
            expect(restoredState.conditionalFormattingRules[0].enabled).toBe(false)
        })

        it('should restore empty state', () => {
            conditionalFormattingSettingsActions.addRule('a')
            const emptySnapshot: ConditionalFormattingSettingsState = { conditionalFormattingRules: [] }

            conditionalFormattingSettingsActions.restoreSnapshot(emptySnapshot)

            const restoredState = getState()
            expect(restoredState.conditionalFormattingRules).toHaveLength(0)
        })
    })

    describe('getConditionalFormattingSettingsState (getter)', () => {
        it('should return current state', () => {
            conditionalFormattingSettingsActions.addRule('test')
            const state = getState()

            expect(state.conditionalFormattingRules).toHaveLength(1)
            const firstNode = state.conditionalFormattingRules[0].conditionNodes[0]
            if (firstNode.kind === 'condition') expect(firstNode.field).toBe('test')
        })

        it('should return empty state initially', () => {
            const state = getState()
            expect(state.conditionalFormattingRules).toHaveLength(0)
        })
    })

    describe('cloneConditionalFormattingSettingsState (exported)', () => {
        it('should create independent clone', () => {
            conditionalFormattingSettingsActions.addRule('a')
            const cloned = cloneConditionalFormattingSettingsState(getState())

            cloned.conditionalFormattingRules[0].enabled = false
            const state = getState()

            expect(state.conditionalFormattingRules[0].enabled).toBe(true)
        })
    })

    describe('edge cases', () => {
        it('should handle adding rule when no rules exist', () => {
            const state = getState()
            expect(state.conditionalFormattingRules).toHaveLength(0)

            conditionalFormattingSettingsActions.addRule()
            expect(getState().conditionalFormattingRules).toHaveLength(1)
        })

        it('should handle toggling non-existent rule silently', () => {
            conditionalFormattingSettingsActions.toggleRuleEnabled('does-not-exist')
            const state = getState()
            expect(state.conditionalFormattingRules).toHaveLength(0)
        })

        it('should handle updating rule with partial patch', () => {
            conditionalFormattingSettingsActions.addRule('field1')
            const state = getState()
            const ruleId = state.conditionalFormattingRules[0].id

            conditionalFormattingSettingsActions.updateRule(ruleId, { presentation: 'Test' })

            const updatedState = getState()
            expect(updatedState.conditionalFormattingRules[0].presentation).toBe('Test')
            expect(updatedState.conditionalFormattingRules[0].conditionNodes).toHaveLength(1)
        })
    })
})
