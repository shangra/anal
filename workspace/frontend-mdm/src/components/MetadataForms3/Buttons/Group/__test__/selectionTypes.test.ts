/**
 * Tests for selection types utilities (facets/selection/types.ts)
 *
 * Тестируют: createSelectionCondition, createSelectionGroup,
 * flattenSelectionForRender, isSelectionGroup/Condition,
 * getComparisonsForFieldType, defaultComparisonForFieldType и др.
 */

import {
    createSelectionCondition,
    createSelectionGroup,
    cloneSelectionNode,
    cloneSelectionSettingsState,
    parseSelectionSettingsState,
    emptySelectionSettingsState,
    flattenSelectionForRender,
    collectNodeIds,
    getGroupLogicLabel,
    comparisonNeedsValue,
    getComparisonsForFieldType,
    isComparisonAllowedForFieldType,
    defaultComparisonForFieldType,
    isSelectionGroup,
    isSelectionCondition,
    flattenEnabledConditions,
    getActiveSelectionConditions,
    getActiveSelectionNodes,
    SELECTION_COMPARISON_OPTIONS,
    SELECTION_GROUP_LOGIC_OPTIONS,
    COMPARISONS_BY_FIELD_TYPE,
    type SelectionNode,
    type SelectionGroup,
    type SelectionCondition,
    type SelectionSettingsState,
    type SelectionFlatRow,
    type SelectionComparison,
} from '../../../../../helpers/listSettings/facets/selection/types'

describe('createSelectionCondition', () => {
    it('should create condition with default values', () => {
        const cond = createSelectionCondition('name')

        expect(cond.field).toBe('name')
        expect(cond.comparison).toBe('eq')
        expect(cond.value).toBe('')
        expect(cond.enabled).toBe(true)
        expect(typeof cond.id).toBe('string')
        expect(cond.id.startsWith('sel-name-')).toBe(true)
    })

    it('should create condition with custom values', () => {
        const cond = createSelectionCondition('age', {
            comparison: 'gt',
            value: '18',
            enabled: false,
        })

        expect(cond.field).toBe('age')
        expect(cond.comparison).toBe('gt')
        expect(cond.value).toBe('18')
        expect(cond.enabled).toBe(false)
    })
})

describe('createSelectionGroup', () => {
    it('should create group with default logic (and)', () => {
        const cond = createSelectionCondition('name')
        const group = createSelectionGroup([cond])

        expect(group.logic).toBe('and')
        expect(group.enabled).toBe(true)
        expect(group.children).toHaveLength(1)
    })

    it('should create group with custom logic', () => {
        const cond = createSelectionCondition('name')
        const group = createSelectionGroup([cond], 'or')

        expect(group.logic).toBe('or')
    })

    it('should clone children on creation', () => {
        const cond = createSelectionCondition('name')
        const group = createSelectionGroup([cond])

        expect(group.children[0]).not.toBe(cond) // cloned
        expect(group.children[0].id).toBe(cond.id)
    })
})

describe('cloneSelectionNode', () => {
    it('should clone condition', () => {
        const cond = createSelectionCondition('name', { value: 'test' })
        const cloned = cloneSelectionNode(cond)

        expect(cloned).not.toBe(cond)
        expect((cloned as SelectionCondition).id).toBe((cond as SelectionCondition).id)
        expect((cloned as SelectionCondition).value).toBe('test')
    })

    it('should clone group with nested children', () => {
        const cond = createSelectionCondition('name')
        const group = createSelectionGroup([cond], 'and')
        const cloned = cloneSelectionNode(group)

        expect(cloned).not.toBe(group)
        expect(isSelectionGroup(cloned)).toBe(true)
        if (isSelectionGroup(cloned)) {
            expect(cloned.children).toHaveLength(1)
            expect(cloned.children[0]).not.toBe(cond)
        }
    })
})

describe('cloneSelectionSettingsState', () => {
    it('should clone state with nodes', () => {
        const cond = createSelectionCondition('name')
        const state: SelectionSettingsState = {
            selectionNodes: [cond],
        }

        const cloned = cloneSelectionSettingsState(state)

        expect(cloned).not.toBe(state)
        expect(cloned.selectionNodes).toHaveLength(1)
        expect(cloned.selectionNodes[0]).not.toBe(cond)
    })

    it('should clone empty state', () => {
        const state: SelectionSettingsState = { selectionNodes: [] }
        const cloned = cloneSelectionSettingsState(state)

        expect(cloned.selectionNodes).toEqual([])
    })
})

describe('parseSelectionSettingsState', () => {
    it('should parse valid state', () => {
        const raw = {
            selectionNodes: [
                {
                    id: 'cond-1',
                    kind: 'condition',
                    field: 'name',
                    comparison: 'eq',
                    value: 'test',
                    enabled: true,
                },
            ],
        }

        const parsed = parseSelectionSettingsState(raw)

        expect(parsed.selectionNodes).toHaveLength(1)
        expect((parsed.selectionNodes[0] as SelectionCondition).kind).toBe('condition')
    })

    it('should handle legacy selectionConditions key', () => {
        const raw = {
            selectionConditions: [
                {
                    id: 'cond-1',
                    field: 'name',
                    comparison: 'eq',
                    value: 'test',
                    enabled: true,
                },
            ],
        }

        const parsed = parseSelectionSettingsState(raw)
        expect(parsed.selectionNodes).toHaveLength(1)
    })

    it('should return empty state for null', () => {
        const parsed = parseSelectionSettingsState(null)
        expect(parsed.selectionNodes).toEqual([])
    })

    it('should return empty state for undefined', () => {
        const parsed = parseSelectionSettingsState(undefined)
        expect(parsed.selectionNodes).toEqual([])
    })

    it('should return empty state for invalid input', () => {
        const parsed = parseSelectionSettingsState('invalid' as unknown as SelectionSettingsState)
        expect(parsed.selectionNodes).toEqual([])
    })

    it('should filter out invalid nodes', () => {
        const raw = {
            selectionNodes: [
                'invalid-string' as unknown as SelectionNode,
                42 as unknown as SelectionNode,
                null as unknown as SelectionNode,
                { id: 'valid-1', field: 'name', comparison: 'eq', value: 'test', enabled: true },
            ],
        }

        const parsed = parseSelectionSettingsState(raw)
        expect(parsed.selectionNodes).toHaveLength(1)
    })

    it('should parse nested group', () => {
        const raw = {
            selectionNodes: [
                {
                    id: 'group-1',
                    kind: 'group',
                    logic: 'and',
                    enabled: true,
                    children: [
                        {
                            id: 'cond-1',
                            kind: 'condition',
                            field: 'name',
                            comparison: 'eq',
                            value: 'test',
                            enabled: true,
                        },
                    ],
                },
            ],
        }

        const parsed = parseSelectionSettingsState(raw)
        expect(parsed.selectionNodes).toHaveLength(1)
        expect(isSelectionGroup(parsed.selectionNodes[0])).toBe(true)
    })
})

describe('emptySelectionSettingsState', () => {
    it('should return empty state', () => {
        const state = emptySelectionSettingsState()
        expect(state.selectionNodes).toEqual([])
    })
})

describe('flattenSelectionForRender', () => {
    it('should flatten single condition', () => {
        const cond = createSelectionCondition('name') as SelectionNode
        const rows = flattenSelectionForRender([cond])

        expect(rows).toHaveLength(1)
        expect(rows[0].type).toBe('condition')
        expect(rows[0].node).toBe(cond)
        expect(rows[0].depth).toBe(0)
        expect(rows[0].parentId).toBeNull()
    })

    it('should flatten condition with depth', () => {
        const cond = createSelectionCondition('name') as SelectionNode
        const rows = flattenSelectionForRender([cond], 2, 'parent-1')

        expect(rows[0].depth).toBe(2)
        expect(rows[0].parentId).toBe('parent-1')
    })

    it('should flatten group with children', () => {
        const group = createSelectionGroup([
            createSelectionCondition('a'),
            createSelectionCondition('b'),
        ], 'and') as SelectionNode

        const rows = flattenSelectionForRender([group])

        expect(rows).toHaveLength(3) // group + 2 children
        expect(rows[0].type).toBe('group')
        expect(rows[1].type).toBe('condition')
        expect(rows[2].type).toBe('condition')
    })

    it('should set correct depth for nested nodes', () => {
        const group = createSelectionGroup([
            createSelectionCondition('a'),
        ], 'and') as SelectionNode

        const rows = flattenSelectionForRender([group])

        expect(rows[0].depth).toBe(0)   // group
        expect(rows[1].depth).toBe(1)   // child
    })
})

describe('collectNodeIds', () => {
    it('should collect ids from flat conditions', () => {
        const nodes: SelectionNode[] = [
            createSelectionCondition('a'),
            createSelectionCondition('b'),
        ]

        const ids = collectNodeIds(nodes)
        expect(ids).toHaveLength(2)
        expect(ids).toContain(nodes[0].id)
        expect(ids).toContain(nodes[1].id)
    })

    it('should collect ids recursively from nested groups', () => {
        const condA = createSelectionCondition('a')
        const condB = createSelectionCondition('b')
        const group = createSelectionGroup([condA, condB])
        const nodes: SelectionNode[] = [group, createSelectionCondition('c')]

        const ids = collectNodeIds(nodes)
        expect(ids).toHaveLength(4) // group + 2 children + c
    })
})

describe('comparisonNeedsValue', () => {
    it('should return true for eq', () => {
        expect(comparisonNeedsValue('eq')).toBe(true)
    })

    it('should return false for filled', () => {
        expect(comparisonNeedsValue('filled')).toBe(false)
    })

    it('should return false for empty', () => {
        expect(comparisonNeedsValue('empty')).toBe(false)
    })

    it('should return true for gt', () => {
        expect(comparisonNeedsValue('gt')).toBe(true)
    })

    it('should return true for contains', () => {
        expect(comparisonNeedsValue('contains')).toBe(true)
    })
})

describe('getComparisonsForFieldType', () => {
    it('should return correct comparisons for string', () => {
        const comparisons = getComparisonsForFieldType('string')
        const values = comparisons.map((c) => c.value)

        expect(values).toContain('eq')
        expect(values).toContain('contains')
        expect(values).toContain('filled')
        expect(values).not.toContain('gt')
        expect(values).not.toContain('lt')
    })

    it('should return correct comparisons for number', () => {
        const comparisons = getComparisonsForFieldType('number')
        const values = comparisons.map((c) => c.value)

        expect(values).toContain('gt')
        expect(values).toContain('lt')
        expect(values).toContain('gte')
        expect(values).toContain('lte')
    })

    it('should return correct comparisons for boolean', () => {
        const comparisons = getComparisonsForFieldType('boolean')
        const values = comparisons.map((c) => c.value)

        expect(values).toEqual(['eq', 'ne'])
    })

    it('should return correct comparisons for date', () => {
        const comparisons = getComparisonsForFieldType('date')
        const values = comparisons.map((c) => c.value)

        expect(values).toContain('gt')
        expect(values).not.toContain('contains')
    })

    it('should return all comparisons for unknown type', () => {
        const comparisons = getComparisonsForFieldType('unknown')
        const values = comparisons.map((c) => c.value)

        expect(values).toEqual([
            'eq', 'ne', 'contains', 'notContains', 'filled', 'empty',
        ])
    })
})

describe('isComparisonAllowedForFieldType', () => {
    it('should allow eq for all types', () => {
        expect(isComparisonAllowedForFieldType('eq', 'string')).toBe(true)
        expect(isComparisonAllowedForFieldType('eq', 'number')).toBe(true)
        expect(isComparisonAllowedForFieldType('eq', 'boolean')).toBe(true)
        expect(isComparisonAllowedForFieldType('eq', 'date')).toBe(true)
    })

    it('should not allow gt for string', () => {
        expect(isComparisonAllowedForFieldType('gt', 'string')).toBe(false)
    })

    it('should allow gt for number', () => {
        expect(isComparisonAllowedForFieldType('gt', 'number')).toBe(true)
    })

    it('should fallback to unknown for unknown type', () => {
        expect(isComparisonAllowedForFieldType('gt', 'unknown')).toBe(false)
    })
})

describe('defaultComparisonForFieldType', () => {
    it('should return eq for string', () => {
        expect(defaultComparisonForFieldType('string')).toBe('eq')
    })

    it('should return eq for number', () => {
        expect(defaultComparisonForFieldType('number')).toBe('eq')
    })

    it('should return eq for boolean', () => {
        expect(defaultComparisonForFieldType('boolean')).toBe('eq')
    })

    it('should return first allowed comparison for any type', () => {
        const result = defaultComparisonForFieldType('string')
        expect(result).toBe(COMPARISONS_BY_FIELD_TYPE.string[0])
    })
})

describe('isSelectionGroup', () => {
    it('should return true for group', () => {
        const group = createSelectionGroup([createSelectionCondition('a')])
        expect(isSelectionGroup(group)).toBe(true)
    })

    it('should return false for condition', () => {
        const cond = createSelectionCondition('a')
        expect(isSelectionGroup(cond)).toBe(false)
    })
})

describe('isSelectionCondition', () => {
    it('should return true for valid condition', () => {
        const cond = createSelectionCondition('name')
        expect(isSelectionCondition(cond)).toBe(true)
    })

    it('should return false for null', () => {
        expect(isSelectionCondition(null)).toBe(false)
    })

    it('should return false for undefined', () => {
        expect(isSelectionCondition(undefined)).toBe(false)
    })

    it('should return false for non-object', () => {
        expect(isSelectionCondition('string')).toBe(false)
        expect(isSelectionCondition(42)).toBe(false)
    })

    it('should return false for group', () => {
        const group = createSelectionGroup([createSelectionCondition('a')])
        expect(isSelectionCondition(group)).toBe(false)
    })
})

describe('flattenEnabledConditions', () => {
    it('should flatten enabled conditions', () => {
        const nodes: SelectionNode[] = [
            createSelectionCondition('a') as SelectionNode,
            createSelectionCondition('b') as SelectionNode,
        ]
        const enabled = flattenEnabledConditions(nodes)
        expect(enabled).toHaveLength(2)
    })

    it('should skip disabled conditions', () => {
        const nodes: SelectionNode[] = [
            createSelectionCondition('a') as SelectionNode,
            { ...createSelectionCondition('b'), enabled: false } as SelectionNode,
        ]
        const enabled = flattenEnabledConditions(nodes)
        expect(enabled).toHaveLength(1)
        expect(enabled[0].id).toBe(nodes[0].id)
    })

    it('should skip disabled groups', () => {
        const group = createSelectionGroup(
            [createSelectionCondition('a'), createSelectionCondition('b')],
            'and',
        ) as SelectionNode
        group.enabled = false

        const enabled = flattenEnabledConditions([group])
        expect(enabled).toHaveLength(0)
    })

    it('should recurse into enabled groups', () => {
        const group = createSelectionGroup(
            [createSelectionCondition('a'), createSelectionCondition('b')],
            'and',
        ) as SelectionNode
        group.enabled = true

        const enabled = flattenEnabledConditions([group])
        expect(enabled).toHaveLength(2)
    })

    it('should skip disabled children inside enabled group', () => {
        const group = createSelectionGroup(
            [
                createSelectionCondition('a'),
                { ...createSelectionCondition('b'), enabled: false } as SelectionCondition,
            ],
            'and',
        ) as SelectionGroup

        const enabled = flattenEnabledConditions([group])
        expect(enabled).toHaveLength(1)
        expect(enabled[0].id).toBe(group.children[0].id)
    })
})

describe('getActiveSelectionConditions', () => {
    it('should return enabled conditions from state', () => {
        const state: SelectionSettingsState = {
            selectionNodes: [
                createSelectionCondition('a') as SelectionNode,
                { ...createSelectionCondition('b'), enabled: false } as SelectionNode,
            ],
        }

        const active = getActiveSelectionConditions(state)
        expect(active).toHaveLength(1)
    })
})

describe('getActiveSelectionNodes', () => {
    it('should return all nodes from state', () => {
        const state: SelectionSettingsState = {
            selectionNodes: [
                createSelectionCondition('a'),
                createSelectionCondition('b'),
            ],
        }

        const nodes = getActiveSelectionNodes(state)
        expect(nodes).toHaveLength(2)
    })
})

describe('getGroupLogicLabel', () => {
    it('should return label for and', () => {
        expect(getGroupLogicLabel('and')).toBe('Группа "И"')
    })

    it('should return label for or', () => {
        expect(getGroupLogicLabel('or')).toBe('Группа "Или"')
    })

    it('should return label for not', () => {
        expect(getGroupLogicLabel('not')).toBe('Группа "Не"')
    })
})

describe('Constants', () => {
    describe('SELECTION_COMPARISON_OPTIONS', () => {
        it('should contain all comparison codes', () => {
            const values = SELECTION_COMPARISON_OPTIONS.map((o) => o.value)
            expect(values).toContain('eq')
            expect(values).toContain('ne')
            expect(values).toContain('gt')
            expect(values).toContain('gte')
            expect(values).toContain('lt')
            expect(values).toContain('lte')
            expect(values).toContain('contains')
            expect(values).toContain('notContains')
            expect(values).toContain('filled')
            expect(values).toContain('empty')
        })

        it('should have 11 options', () => {
            expect(SELECTION_COMPARISON_OPTIONS).toHaveLength(11)
        })
    })

    describe('SELECTION_GROUP_LOGIC_OPTIONS', () => {
        it('should contain all logic values', () => {
            const values = SELECTION_GROUP_LOGIC_OPTIONS.map((o) => o.value)
            expect(values).toContain('and')
            expect(values).toContain('or')
            expect(values).toContain('not')
        })

        it('should have 3 options', () => {
            expect(SELECTION_GROUP_LOGIC_OPTIONS).toHaveLength(3)
        })
    })

    describe('COMPARISONS_BY_FIELD_TYPE', () => {
        it('should have all field type keys', () => {
            expect(COMPARISONS_BY_FIELD_TYPE.string).toBeDefined()
            expect(COMPARISONS_BY_FIELD_TYPE.number).toBeDefined()
            expect(COMPARISONS_BY_FIELD_TYPE.date).toBeDefined()
            expect(COMPARISONS_BY_FIELD_TYPE.boolean).toBeDefined()
            expect(COMPARISONS_BY_FIELD_TYPE.uuid).toBeDefined()
            expect(COMPARISONS_BY_FIELD_TYPE.unknown).toBeDefined()
        })

        it('should be readonly arrays', () => {
            const stringComparisons = COMPARISONS_BY_FIELD_TYPE.string
            expect(Array.isArray(stringComparisons)).toBe(true)
        })
    })
})
