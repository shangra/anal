/**
 * Tests for selection matching engine (facets/selection/apply.ts)
 *
 * Тестируют: nodeMatchesSelection, rowMatchesSelectionTree,
 * applySelectionToFlatRows, applySelectionToMixedRows
 */

import {
    nodeMatchesSelection,
    rowMatchesSelectionTree,
    applySelectionToFlatRows,
    applySelectionToMixedRows,
    type SelectionCellLike,
} from '../../../../../helpers/listSettings/facets/selection/apply'
import {
    createSelectionCondition,
    createSelectionGroup,
    type SelectionNode,
} from '../../../../../helpers/listSettings/facets/selection/types'

const cell = (name: string, value: unknown): SelectionCellLike => ({
    columnName: name,
    value: { originalData: value, viewedData: value },
})

const matchCells: SelectionCellLike[] = [
    cell('name', 'John'),
    cell('age', 30),
    cell('active', true),
    cell('email', 'john@example.com'),
]

describe('nodeMatchesSelection', () => {
    describe('disabled node', () => {
        it('should return true for disabled condition', () => {
            const cond = createSelectionCondition('name', { value: 'Jane', enabled: false }) as SelectionNode
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should return true for disabled group', () => {
            const group = createSelectionGroup([createSelectionCondition('name')], 'and')
            group.enabled = false
            expect(nodeMatchesSelection(matchCells, group)).toBe(true)
        })
    })

    describe('simple conditions', () => {
        it('should match eq condition', () => {
            const cond = createSelectionCondition('name', { value: 'John', comparison: 'eq' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should not match eq condition with wrong value', () => {
            const cond = createSelectionCondition('name', { value: 'Jane', comparison: 'eq' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(false)
        })

        it('should match ne condition', () => {
            const cond = createSelectionCondition('name', { value: 'Jane', comparison: 'ne' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should not match ne condition with same value', () => {
            const cond = createSelectionCondition('name', { value: 'John', comparison: 'ne' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(false)
        })

        it('should match contains condition', () => {
            const cond = createSelectionCondition('email', { value: 'example', comparison: 'contains' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should not match notContains condition', () => {
            const cond = createSelectionCondition('email', { value: 'other', comparison: 'notContains' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should not match notContains when value is present', () => {
            const cond = createSelectionCondition('email', { value: 'john', comparison: 'notContains' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(false)
        })

        it('should match filled condition for non-empty values', () => {
            const cond = createSelectionCondition('name', { comparison: 'filled' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should not match filled condition for empty values', () => {
            const cells: SelectionCellLike[] = [cell('name', '')]
            const cond = createSelectionCondition('name', { comparison: 'filled' })
            expect(nodeMatchesSelection(cells, cond)).toBe(false)
        })

        it('should match empty condition for empty values', () => {
            const cells: SelectionCellLike[] = [cell('name', '')]
            const cond = createSelectionCondition('name', { comparison: 'empty' })
            expect(nodeMatchesSelection(cells, cond)).toBe(true)
        })

        it('should match empty condition for null values', () => {
            const cells: SelectionCellLike[] = [cell('name', null)]
            const cond = createSelectionCondition('name', { comparison: 'empty' })
            expect(nodeMatchesSelection(cells, cond)).toBe(true)
        })

        it('should match empty condition for undefined values', () => {
            const cells: SelectionCellLike[] = [cell('name', undefined)]
            const cond = createSelectionCondition('name', { comparison: 'empty' })
            expect(nodeMatchesSelection(cells, cond)).toBe(true)
        })
    })

    describe('ordered comparisons', () => {
        it('should match gt for numbers', () => {
            const cond = createSelectionCondition('age', { value: '25', comparison: 'gt' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should not match gt when value equals', () => {
            const cond = createSelectionCondition('age', { value: '30', comparison: 'gt' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(false)
        })

        it('should match gte for numbers', () => {
            const cond = createSelectionCondition('age', { value: '30', comparison: 'gte' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should match lt for numbers', () => {
            const cond = createSelectionCondition('age', { value: '35', comparison: 'lt' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should match lte for numbers', () => {
            const cond = createSelectionCondition('age', { value: '30', comparison: 'lte' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should match gt for string values (lexicographic)', () => {
            const cells: SelectionCellLike[] = [cell('name', 'Zack')]
            const cond = createSelectionCondition('name', { value: 'John', comparison: 'gt' })
            expect(nodeMatchesSelection(cells, cond)).toBe(true)
        })

        it('should handle numeric strings for comparison', () => {
            const cells: SelectionCellLike[] = [cell('id', '100')]
            const cond = createSelectionCondition('id', { value: '50', comparison: 'gt' })
            expect(nodeMatchesSelection(cells, cond)).toBe(true)
        })
    })

    describe('boolean values', () => {
        it('should match eq for true boolean', () => {
            const cond = createSelectionCondition('active', { value: 'true', comparison: 'eq' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should match eq for false boolean', () => {
            const cells: SelectionCellLike[] = [cell('active', false)]
            const cond = createSelectionCondition('active', { value: 'false', comparison: 'eq' })
            expect(nodeMatchesSelection(cells, cond)).toBe(true)
        })
    })

    describe('group with AND logic', () => {
        it('should match when all children match', () => {
            const group = createSelectionGroup([
                createSelectionCondition('name', { value: 'John' }),
                createSelectionCondition('active', { value: 'true' }),
            ], 'and') as SelectionNode

            expect(nodeMatchesSelection(matchCells, group)).toBe(true)
        })

        it('should not match when one child fails', () => {
            const group = createSelectionGroup([
                createSelectionCondition('name', { value: 'John' }),
                createSelectionCondition('name', { value: 'Jane' }),
            ], 'and') as SelectionNode

            expect(nodeMatchesSelection(matchCells, group)).toBe(false)
        })

        it('should handle nested groups with AND', () => {
            const innerGroup = createSelectionGroup([
                createSelectionCondition('name', { value: 'John' }),
            ], 'and') as SelectionNode

            const group = createSelectionGroup([innerGroup], 'and') as SelectionNode

            expect(nodeMatchesSelection(matchCells, group)).toBe(true)
        })
    })

    describe('group with OR logic', () => {
        it('should match when at least one child matches', () => {
            const group = createSelectionGroup([
                createSelectionCondition('name', { value: 'John' }),
                createSelectionCondition('name', { value: 'Jane' }),
            ], 'or') as SelectionNode

            expect(nodeMatchesSelection(matchCells, group)).toBe(true)
        })

        it('should not match when no children match', () => {
            const group = createSelectionGroup([
                createSelectionCondition('name', { value: 'Jane' }),
                createSelectionCondition('name', { value: 'Bob' }),
            ], 'or') as SelectionNode

            expect(nodeMatchesSelection(matchCells, group)).toBe(false)
        })
    })

    describe('group with NOT logic', () => {
        it('should return true when no children match', () => {
            const group = createSelectionGroup([
                createSelectionCondition('name', { value: 'Jane' }),
            ], 'not') as SelectionNode

            expect(nodeMatchesSelection(matchCells, group)).toBe(true)
        })

        it('should return false when all children match', () => {
            const group = createSelectionGroup([
                createSelectionCondition('name', { value: 'John' }),
            ], 'not') as SelectionNode

            expect(nodeMatchesSelection(matchCells, group)).toBe(false)
        })
    })

    describe('empty condition value', () => {
        it('should match when comparison needs value but value is empty', () => {
            const cond = createSelectionCondition('name', { value: '  ' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })

        it('should match when comparison needs value but value is empty string', () => {
            const cond = createSelectionCondition('name', { value: '' })
            expect(nodeMatchesSelection(matchCells, cond)).toBe(true)
        })
    })

    describe('originalData vs viewedData fallback', () => {
        it('should prefer originalData', () => {
            const cells: SelectionCellLike[] = [{
                columnName: 'name',
                value: { originalData: 'Original', viewedData: 'Viewed' },
            }]
            const cond = createSelectionCondition('name', { value: 'Original' })
            expect(nodeMatchesSelection(cells, cond)).toBe(true)
        })

        it('should fallback to viewedData', () => {
            const cells: SelectionCellLike[] = [{
                columnName: 'name',
                value: { viewedData: 'Viewed' },
            }]
            const cond = createSelectionCondition('name', { value: 'Viewed' })
            expect(nodeMatchesSelection(cells, cond)).toBe(true)
        })
    })
})

describe('rowMatchesSelectionTree', () => {
    it('should return true for empty nodes array', () => {
        expect(rowMatchesSelectionTree(matchCells, [])).toBe(true)
    })

    it('should return true when all root nodes match', () => {
        const nodes: SelectionNode[] = [
            createSelectionCondition('name', { value: 'John' }),
        ]
        expect(rowMatchesSelectionTree(matchCells, nodes)).toBe(true)
    })

    it('should return false when one root node does not match', () => {
        const nodes: SelectionNode[] = [
            createSelectionCondition('name', { value: 'John' }),
            createSelectionCondition('name', { value: 'Jane' }),
        ]
        expect(rowMatchesSelectionTree(matchCells, nodes)).toBe(false)
    })

    it('should handle groups as root nodes', () => {
        const group = createSelectionGroup([
            createSelectionCondition('name', { value: 'John' }),
        ], 'and') as SelectionNode
        const nodes: SelectionNode[] = [group]
        expect(rowMatchesSelectionTree(matchCells, nodes)).toBe(true)
    })

    it('should respect disabled root nodes', () => {
        const nodes: SelectionNode[] = [
            createSelectionCondition('name', { value: 'John' }),
            createSelectionCondition('name', { value: 'Jane' }) as SelectionNode,
        ]
        nodes[1].enabled = false
        expect(rowMatchesSelectionTree(matchCells, nodes)).toBe(true)
    })
})

describe('applySelectionToFlatRows', () => {
    it('should return all rows when nodes is empty', () => {
        const rows: SelectionCellLike[][] = [
            [cell('name', 'John'), cell('age', 30)],
            [cell('name', 'Jane'), cell('age', 25)],
        ]
        const result = applySelectionToFlatRows(rows, [])
        expect(result).toBe(rows)
    })

    it('should filter rows matching condition', () => {
        const rows: SelectionCellLike[][] = [
            [cell('name', 'John'), cell('age', 30)],
            [cell('name', 'Jane'), cell('age', 25)],
            [cell('name', 'Bob'), cell('age', 35)],
        ]
        const nodes: SelectionNode[] = [
            createSelectionCondition('name', { value: 'John' }),
        ]
        const result = applySelectionToFlatRows(rows, nodes)
        expect(result).toHaveLength(1)
        expect((result[0][0] as SelectionCellLike).value.originalData).toBe('John')
    })

    it('should filter with gt condition', () => {
        const rows: SelectionCellLike[][] = [
            [cell('name', 'A'), cell('age', 30)],
            [cell('name', 'B'), cell('age', 25)],
            [cell('name', 'C'), cell('age', 35)],
        ]
        const nodes: SelectionNode[] = [
            createSelectionCondition('age', { value: '28', comparison: 'gt' }),
        ]
        const result = applySelectionToFlatRows(rows, nodes)
        expect(result).toHaveLength(2)
    })

    it('should filter with group AND', () => {
        const rows: SelectionCellLike[][] = [
            [cell('name', 'John'), cell('age', 30), cell('active', true)],
            [cell('name', 'John'), cell('age', 25), cell('active', true)],
            [cell('name', 'Jane'), cell('age', 30), cell('active', true)],
        ]
        const group = createSelectionGroup([
            createSelectionCondition('name', { value: 'John' }),
            createSelectionCondition('age', { value: '28', comparison: 'lt' }),
        ], 'and') as SelectionNode
        const result = applySelectionToFlatRows(rows, [group])
        expect(result).toHaveLength(1)
    })

    it('should filter with group OR', () => {
        const rows: SelectionCellLike[][] = [
            [cell('name', 'John'), cell('age', 30)],
            [cell('name', 'Jane'), cell('age', 25)],
        ]
        const group = createSelectionGroup([
            createSelectionCondition('name', { value: 'John' }),
            createSelectionCondition('name', { value: 'Jane' }),
        ], 'or') as SelectionNode
        const result = applySelectionToFlatRows(rows, [group])
        expect(result).toHaveLength(2)
    })

    it('should handle disabled nodes', () => {
        const rows: SelectionCellLike[][] = [
            [cell('name', 'John')],
            [cell('name', 'Jane')],
        ]
        const nodes: SelectionNode[] = [
            createSelectionCondition('name', { value: 'John' }),
            createSelectionCondition('name', { value: 'Jane' }) as SelectionNode,
        ]
        nodes[1].enabled = false

        const result = applySelectionToFlatRows(rows, nodes)
        // disabled condition возвращается true, но первый root ('John') не совпадает для 'Jane'
        expect(result).toHaveLength(1)
        expect((result[0][0] as SelectionCellLike).value.originalData).toBe('John')
    })

    it('should handle empty rows array', () => {
        const nodes: SelectionNode[] = [createSelectionCondition('name')]
        const result = applySelectionToFlatRows([], nodes)
        expect(result).toEqual([])
    })
})

describe('applySelectionToMixedRows', () => {
    it('should return all rows when nodes is empty', () => {
        const rows = [
            [cell('name', 'John')],
            [cell('name', 'Jane')],
        ]
        const result = applySelectionToMixedRows(rows, [])
        expect(result).toBe(rows)
    })

    it('should flatten and filter grouped cells', () => {
        const rows = [
            [
                [cell('region', 'East'), cell('city', 'NYC')],
                cell('name', 'John'),
            ],
            [
                [cell('region', 'West'), cell('city', 'LA')],
                cell('name', 'Jane'),
            ],
        ]
        const nodes: SelectionNode[] = [
            createSelectionCondition('name', { value: 'John' }),
        ]
        const result = applySelectionToMixedRows(rows, nodes)
        expect(result).toHaveLength(1)
    })

    it('should filter by nested field in grouped cells', () => {
        const rows = [
            [
                cell('region', 'East'),
                cell('name', 'John'),
            ],
            [
                cell('region', 'West'),
                cell('name', 'Jane'),
            ],
        ]
        const nodes: SelectionNode[] = [
            createSelectionCondition('region', { value: 'East' }),
        ]
        const result = applySelectionToMixedRows(rows, nodes)
        expect(result).toHaveLength(1)
    })
})
