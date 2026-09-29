/**
 * Tests for selection tree manipulation (facets/selection/tree.ts)
 *
 * Тестируют immutable tree operations: find, update, remove, group, ungroup, move
 */

import {
    findNodeLocation,
    mapSelectionTree,
    updateSelectionNodeById,
    removeSelectionNodesByIds,
    groupSelectionNodes,
    ungroupSelectionNodes,
    setSelectionGroupLogic,
    moveSelectionNodes,
    canGroupSelectionNodes,
    canUngroupSelectionNodes,
    type NodeLocation,
} from '../../../../../helpers/listSettings/facets/selection/tree'
import {
    isSelectionGroup,
    createSelectionGroup,
    type SelectionNode,
    type SelectionGroup,
    type SelectionCondition,
    type SelectionComparison,
    type SelectionGroupLogic,
} from '../../../../../helpers/listSettings/facets/selection/types'

const cond = (
    id: string,
    field = 'test',
    comparison: SelectionComparison = 'eq',
    value = '',
    enabled = true,
): SelectionCondition => ({
    id,
    kind: 'condition' as const,
    field,
    comparison,
    value,
    enabled,
})

const grp = (
    id: string,
    children: SelectionNode[],
    logic: SelectionGroupLogic = 'and',
): SelectionGroup => ({
    id,
    kind: 'group' as const,
    logic,
    enabled: true,
    children,
})

describe('findNodeLocation', () => {
    it('should find root-level condition', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b')]
        const loc = findNodeLocation(nodes, 'b')

        expect(loc).not.toBeNull()
        expect(loc!.node).toBe(nodes[1])
        expect(loc!.parentId).toBeNull()
        expect(loc!.index).toBe(1)
    })

    it('should find root-level group', () => {
        const group = grp('g1', [cond('x')])
        const nodes: SelectionNode[] = [cond('a'), group]

        const loc = findNodeLocation(nodes, 'g1')

        expect(loc).not.toBeNull()
        expect(isSelectionGroup(loc!.node)).toBe(true)
        expect(loc!.index).toBe(1)
    })

    it('should find nested condition inside group', () => {
        const group = grp('g1', [cond('a'), cond('b')])
        const nodes: SelectionNode[] = [group]

        const loc = findNodeLocation(nodes, 'b')

        expect(loc).not.toBeNull()
        expect(loc!.node).toBe(group.children[1])
        expect(loc!.parentId).toBe('g1')
    })

    it('should find deeply nested condition', () => {
        const innerGroup = grp('inner', [cond('deep')])
        const outerGroup = grp('outer', [cond('mid'), innerGroup])
        const nodes: SelectionNode[] = [outerGroup]

        const loc = findNodeLocation(nodes, 'deep')

        expect(loc).not.toBeNull()
        expect(loc!.node).toBe(innerGroup.children[0])
        expect(loc!.parentId).toBe('inner')
    })

    it('should return null for non-existent id', () => {
        const nodes: SelectionNode[] = [cond('a')]
        expect(findNodeLocation(nodes, 'nonexistent')).toBeNull()
    })

    it('should return null for empty array', () => {
        expect(findNodeLocation([], 'nonexistent')).toBeNull()
    })
})

describe('mapSelectionTree', () => {
    it('should map root-level nodes', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b')]
        const mapped = mapSelectionTree(nodes, (node) =>
            isSelectionGroup(node)
                ? node
                : { ...node, value: 'mapped' },
        )

        expect(mapped).not.toBe(nodes)
        expect(mapped).toHaveLength(2)
        expect((mapped[0] as SelectionCondition).value).toBe('mapped')
    })

    it('should map nested nodes recursively', () => {
        const group = grp('g1', [cond('a'), cond('b')])
        const nodes: SelectionNode[] = [group]

        const mapped = mapSelectionTree(nodes, (node) =>
            isSelectionGroup(node)
                ? { ...node, children: node.children.map((child) => ({ ...child })) }
                : node,
        )

        expect(mapped).toHaveLength(1)
        expect(isSelectionGroup(mapped[0])).toBe(true)
    })
})

describe('updateSelectionNodeById', () => {
    it('should update condition value', () => {
        const nodes: SelectionNode[] = [cond('a', 'field1', 'eq', 'old')]
        const updated = updateSelectionNodeById(nodes, 'a', { value: 'new' })

        expect((updated[0] as SelectionCondition).value).toBe('new')
    })

    it('should update condition enabled', () => {
        const nodes: SelectionNode[] = [cond('a')]
        const updated = updateSelectionNodeById(nodes, 'a', { enabled: false })

        expect((updated[0] as SelectionCondition).enabled).toBe(false)
    })

    it('should not affect other nodes', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b')]
        const updated = updateSelectionNodeById(nodes, 'a', { value: 'new' })

        expect((updated[0] as SelectionCondition).value).toBe('new')
        expect((updated[1] as SelectionCondition).value).toBe('')
    })

    it('should return original array if id not found', () => {
        const nodes: SelectionNode[] = [cond('a')]
        const updated = updateSelectionNodeById(nodes, 'nonexistent', { value: 'x' })

        expect(updated).toHaveLength(1)
        expect((updated[0] as SelectionCondition).value).toBe('')
    })
})

describe('removeSelectionNodesByIds', () => {
    it('should remove root-level conditions', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b'), cond('c')]
        const removed = removeSelectionNodesByIds(nodes, ['b'])

        expect(removed).toHaveLength(2)
        expect(removed.find((n) => (n as SelectionCondition).id === 'b')).toBeUndefined()
    })

    it('should remove from groups', () => {
        const group = grp('g1', [cond('a'), cond('b'), cond('c')])
        const nodes: SelectionNode[] = [group]

        const removed = removeSelectionNodesByIds(nodes, ['b'])

        const removedGroup = removed[0] as SelectionGroup
        expect(removedGroup.children).toHaveLength(2)
        expect(removedGroup.children.find((n) => (n as SelectionCondition).id === 'b')).toBeUndefined()
    })

    it('should handle multiple removals', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b'), cond('c'), cond('d')]
        const removed = removeSelectionNodesByIds(nodes, ['a', 'c'])

        expect(removed).toHaveLength(2)
    })

    it('should remove entire group by its id', () => {
        const group = grp('g1', [cond('a')])
        const nodes: SelectionNode[] = [cond('x'), group, cond('y')]

        const removed = removeSelectionNodesByIds(nodes, ['g1'])

        expect(removed).toHaveLength(2)
        expect(removed.find((n) => isSelectionGroup(n) && n.id === 'g1')).toBeUndefined()
    })

    it('should return original if ids not found', () => {
        const nodes: SelectionNode[] = [cond('a')]
        const removed = removeSelectionNodesByIds(nodes, ['nonexistent'])

        expect(removed).toHaveLength(1)
    })
})

describe('groupSelectionNodes', () => {
    it('should group sibling conditions', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b'), cond('c')]

        const grouped = groupSelectionNodes(nodes, ['a', 'c'], 'and')

        expect(grouped).toHaveLength(2)
        const newGroup = grouped.find((n) => isSelectionGroup(n))
        expect(newGroup).not.toBeNull()
        if (isSelectionGroup(newGroup!)) {
            expect(newGroup.logic).toBe('and')
            expect(newGroup.children).toHaveLength(2)
        }
    })

    it('should not group non-siblings (different parents)', () => {
        const inner1 = grp('g1', [cond('a')])
        const inner2 = grp('g2', [cond('b')])
        const nodes: SelectionNode[] = [inner1, inner2]

        const result = groupSelectionNodes(nodes, ['a', 'b'])

        expect(result).toHaveLength(2)
    })

    it('should not group if less than 2 nodes', () => {
        const nodes: SelectionNode[] = [cond('a')]
        const result = groupSelectionNodes(nodes, ['a'], 'or')

        expect(result).toHaveLength(1)
    })

    it('should create group with or logic', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b')]
        const grouped = groupSelectionNodes(nodes, ['a', 'b'], 'or')

        const newGroup = grouped.find((n) => isSelectionGroup(n))
        if (isSelectionGroup(newGroup!)) {
            expect(newGroup.logic).toBe('or')
        }
    })

    it('should preserve order of remaining siblings', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b'), cond('c'), cond('d')]

        const grouped = groupSelectionNodes(nodes, ['a', 'c'])

        expect(grouped).toHaveLength(3)
        // grouped = [group, b, d]
        const group = grouped.find((n) => isSelectionGroup(n))
        if (group && isSelectionGroup(group)) {
            expect(group.children).toHaveLength(2)
        }
        // b и d остаются на своих местах (индексы 1 и 2)
        expect((grouped[1] as SelectionCondition).id).toBe('b')
        expect((grouped[2] as SelectionCondition).id).toBe('d')
    })

    it('should return original if ids not found', () => {
        const nodes: SelectionNode[] = [cond('a')]
        const result = groupSelectionNodes(nodes, ['nonexistent'])

        expect(result).toHaveLength(1)
    })
})

describe('ungroupSelectionNodes', () => {
    it('should ungroup a group', () => {
        const group = grp('g1', [cond('a'), cond('b')])
        const nodes: SelectionNode[] = [group]

        const ungrouped = ungroupSelectionNodes(nodes, ['g1'])

        expect(ungrouped).toHaveLength(2)
        // ungroup returns new objects (immutable), so check by id instead of reference
        expect(ungrouped[0].id).toBe('a')
        expect(ungrouped[1].id).toBe('b')
    })

    it('should not ungroup non-group nodes', () => {
        const group = grp('g1', [cond('a'), cond('b')])
        const nodes: SelectionNode[] = [group, cond('x')]

        const ungrouped = ungroupSelectionNodes(nodes, ['a'])

        expect(ungrouped).toHaveLength(2)
    })

    it('should handle nested groups', () => {
        const inner = grp('inner', [cond('a')])
        const outer = grp('outer', [cond('b'), inner])
        const nodes: SelectionNode[] = [outer]

        const ungrouped = ungroupSelectionNodes(nodes, ['outer'])

        expect(ungrouped).toHaveLength(2)
    })

    it('should preserve sibling groups', () => {
        const g1 = grp('g1', [cond('a')])
        const g2 = grp('g2', [cond('b')])
        const nodes: SelectionNode[] = [g1, g2]

        const ungrouped = ungroupSelectionNodes(nodes, ['g1'])

        expect(ungrouped).toHaveLength(2)
        expect(isSelectionGroup(ungrouped[1])).toBe(true)
    })
})

describe('setSelectionGroupLogic', () => {
    it('should change group logic from and to or', () => {
        const group = grp('g1', [cond('a')], 'and')
        const nodes: SelectionNode[] = [group]

        const updated = setSelectionGroupLogic(nodes, 'g1', 'or')
        const updatedGroup = updated[0] as SelectionGroup

        expect(updatedGroup.logic).toBe('or')
    })

    it('should not affect other groups', () => {
        const g1 = grp('g1', [cond('a')], 'and')
        const g2 = grp('g2', [cond('b')], 'or')
        const nodes: SelectionNode[] = [g1, g2]

        const updated = setSelectionGroupLogic(nodes, 'g1', 'not')

        const updatedG1 = updated[0] as SelectionGroup
        const updatedG2 = updated[1] as SelectionGroup

        expect(updatedG1.logic).toBe('not')
        expect(updatedG2.logic).toBe('or')
    })
})

describe('moveSelectionNodes', () => {
    it('should move single node up', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b'), cond('c')]
        const moved = moveSelectionNodes(nodes, ['b'], 'up')

        expect((moved[0] as SelectionCondition).id).toBe('b')
        expect((moved[1] as SelectionCondition).id).toBe('a')
    })

    it('should move single node down', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b'), cond('c')]
        const moved = moveSelectionNodes(nodes, ['b'], 'down')

        expect((moved[1] as SelectionCondition).id).toBe('c')
        expect((moved[2] as SelectionCondition).id).toBe('b')
    })

    it('should not move first node up', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b')]
        const moved = moveSelectionNodes(nodes, ['a'], 'up')

        expect((moved[0] as SelectionCondition).id).toBe('a')
    })

    it('should not move last node down', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b')]
        const moved = moveSelectionNodes(nodes, ['b'], 'down')

        expect((moved[1] as SelectionCondition).id).toBe('b')
    })

    it('should move multiple nodes together', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b'), cond('c'), cond('d')]
        const moved = moveSelectionNodes(nodes, ['b', 'c'], 'up')

        expect((moved[0] as SelectionCondition).id).toBe('b')
        expect((moved[1] as SelectionCondition).id).toBe('c')
        expect((moved[2] as SelectionCondition).id).toBe('a')
    })

    it('should not move across different parents', () => {
        const inner1 = grp('g1', [cond('a')])
        const inner2 = grp('g2', [cond('b')])
        const nodes: SelectionNode[] = [inner1, inner2]

        const moved = moveSelectionNodes(nodes, ['a'], 'up')

        expect((moved[0] as SelectionGroup).id).toBe('g1')
    })
})

describe('canGroupSelectionNodes', () => {
    it('should return true for sibling conditions', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b'), cond('c')]
        expect(canGroupSelectionNodes(nodes, ['a', 'c'])).toBe(true)
    })

    it('should return false for non-siblings', () => {
        const inner1 = grp('g1', [cond('a')])
        const inner2 = grp('g2', [cond('b')])
        const nodes: SelectionNode[] = [inner1, inner2]

        expect(canGroupSelectionNodes(nodes, ['a', 'b'])).toBe(false)
    })

    it('should return false for less than 2 nodes', () => {
        const nodes: SelectionNode[] = [cond('a'), cond('b')]
        expect(canGroupSelectionNodes(nodes, ['a'])).toBe(false)
    })

    it('should return false for non-existent nodes', () => {
        const nodes: SelectionNode[] = [cond('a')]
        expect(canGroupSelectionNodes(nodes, ['a', 'nonexistent'])).toBe(false)
    })
})

describe('canUngroupSelectionNodes', () => {
    it('should return true for group id', () => {
        const group = grp('g1', [cond('a')])
        const nodes: SelectionNode[] = [group]

        expect(canUngroupSelectionNodes(nodes, ['g1'])).toBe(true)
    })

    it('should return false for condition id', () => {
        const group = grp('g1', [cond('a')])
        const nodes: SelectionNode[] = [group]

        expect(canUngroupSelectionNodes(nodes, ['a'])).toBe(false)
    })
})
