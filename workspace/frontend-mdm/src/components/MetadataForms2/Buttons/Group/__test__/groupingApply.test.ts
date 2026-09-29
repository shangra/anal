/**
 * Tests for grouping apply (facets/grouping/apply.ts)
 *
 * Тестируют: applyGroupingToFlatRows → groupTableRows
 */

import { applyGroupingToFlatRows } from '../../../../../helpers/listSettings/facets/grouping/apply'
import type { ICell } from '../../../../../components/MetadataForms/ElementsList/types'
import type { ITreeRow } from '../../../../../components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types'

const createCell = (columnName: string, value: unknown): ICell => ({
    columnIndex: 0,
    rowIndex: 0,
    columnName,
    type: 'text' as const,
    value: { originalData: value, viewedData: value },
    hierarchy: null,
    editable: null,
})

describe('applyGroupingToFlatRows', () => {
    describe('empty/no grouping', () => {
        it('should return rows as-is when no group fields provided', () => {
            const rows: ICell[][] = [
                [createCell('name', 'A'), createCell('value', 1)],
                [createCell('name', 'B'), createCell('value', 2)],
            ]

            const result = applyGroupingToFlatRows(rows, [])

            expect(Array.isArray(result)).toBe(true)
        })

        it('should handle empty rows', () => {
            const result = applyGroupingToFlatRows([], ['name'])

            expect(Array.isArray(result)).toBe(true)
            expect(result).toEqual([])
        })

        it('should handle empty group fields array', () => {
            const rows: ICell[][] = [
                [createCell('name', 'A')],
            ]

            const result = applyGroupingToFlatRows(rows, [])

            expect(Array.isArray(result)).toBe(true)
        })
    })

    describe('single field grouping', () => {
        it('should group rows by single field into tree structure', () => {
            const rows: ICell[][] = [
                [
                    createCell('region', 'East'),
                    createCell('city', 'NYC'),
                    createCell('count', 100),
                ],
                [
                    createCell('region', 'East'),
                    createCell('city', 'Boston'),
                    createCell('count', 200),
                ],
                [
                    createCell('region', 'West'),
                    createCell('city', 'LA'),
                    createCell('count', 150),
                ],
            ]

            const result = applyGroupingToFlatRows(rows, ['region'])

            expect(Array.isArray(result)).toBe(true)
            const treeRows = result as ITreeRow[]

            // Should have group rows and detail rows
            const groupRows = treeRows.filter((t) => t.isGroup)
            expect(groupRows.length).toBeGreaterThanOrEqual(1)
        })

        it('should create group with correct values', () => {
            const rows: ICell[][] = [
                [createCell('status', 'active'), createCell('id', 1)],
                [createCell('status', 'inactive'), createCell('id', 2)],
                [createCell('status', 'active'), createCell('id', 3)],
            ]

            const result = applyGroupingToFlatRows(rows, ['status'])
            const treeRows = result as ITreeRow[]

            const activeGroup = treeRows.find(
                (t) => t.isGroup && t.groupValue === 'active',
            )
            const inactiveGroup = treeRows.find(
                (t) => t.isGroup && t.groupValue === 'inactive',
            )

            expect(activeGroup).toBeDefined()
            expect(inactiveGroup).toBeDefined()
        })
    })

    describe('result structure', () => {
        it('should return ITreeRow[] for grouped data', () => {
            const rows: ICell[][] = [
                [createCell('group', 'A'), createCell('name', 'Item1')],
            ]

            const result = applyGroupingToFlatRows(rows, ['group'])

            const treeRows = result as ITreeRow[]
            const firstRow = treeRows[0]

            // First row should be a group row
            expect(firstRow.isGroup).toBe(true)
            expect(Array.isArray(firstRow.children)).toBe(true)
        })

        it('should have isGroup flag on group rows', () => {
            const rows: ICell[][] = [
                [createCell('type', 'X'), createCell('name', 'A')],
                [createCell('type', 'X'), createCell('name', 'B')],
                [createCell('type', 'Y'), createCell('name', 'C')],
            ]

            const result = applyGroupingToFlatRows(rows, ['type'])
            const treeRows = result as ITreeRow[]

            const groupRows = treeRows.filter((t) => t.isGroup === true)

            // Все top-level элементы - group rows
            expect(groupRows.length).toBeGreaterThanOrEqual(1)

            // Каждый group row содержит children
            for (const groupRow of groupRows) {
                expect(Array.isArray(groupRow.children)).toBe(true)
                if (Array.isArray(groupRow.children)) {
                    expect(groupRow.children.length).toBeGreaterThan(0)
                }
            }
        })

        it('should set groupField and groupValue on group rows', () => {
            const rows: ICell[][] = [
                [createCell('category', 'Electronics'), createCell('name', 'Phone')],
            ]

            const result = applyGroupingToFlatRows(rows, ['category'])
            const treeRows = result as ITreeRow[]

            const groupRow = treeRows.find((t) => t.isGroup)
            expect(groupRow?.groupField).toBe('category')
            expect(groupRow?.groupValue).toBe('Electronics')
        })
    })

    describe('edge cases', () => {
        it('should handle rows with null values', () => {
            const rows: ICell[][] = [
                [createCell('group', null), createCell('name', 'A')],
                [createCell('group', 'B'), createCell('name', 'B')],
            ]

            const result = applyGroupingToFlatRows(rows, ['group'])

            expect(Array.isArray(result)).toBe(true)
        })

        it('should handle rows with undefined values', () => {
            const rows: ICell[][] = [
                [createCell('group', undefined), createCell('name', 'A')],
            ]

            const result = applyGroupingToFlatRows(rows, ['group'])

            expect(Array.isArray(result)).toBe(true)
        })

        it('should handle rows with number values', () => {
            const rows: ICell[][] = [
                [createCell('priority', 1), createCell('name', 'High')],
                [createCell('priority', 1), createCell('name', 'Medium')],
                [createCell('priority', 2), createCell('name', 'Low')],
            ]

            const result = applyGroupingToFlatRows(rows, ['priority'])

            expect(Array.isArray(result)).toBe(true)
        })

        it('should handle rows with boolean values', () => {
            const rows: ICell[][] = [
                [createCell('active', true), createCell('name', 'A')],
                [createCell('active', false), createCell('name', 'B')],
            ]

            const result = applyGroupingToFlatRows(rows, ['active'])

            expect(Array.isArray(result)).toBe(true)
        })

        it('should handle single row', () => {
            const rows: ICell[][] = [
                [createCell('group', 'A'), createCell('name', 'Only')],
            ]

            const result = applyGroupingToFlatRows(rows, ['group'])

            expect(Array.isArray(result)).toBe(true)
        })

        it('should handle many identical values', () => {
            const rows: ICell[][] = Array.from({ length: 100 }, (_, i) => [
                createCell('group', 'same'),
                createCell('id', i),
            ])

            const result = applyGroupingToFlatRows(rows, ['group'])

            expect(Array.isArray(result)).toBe(true)
            const treeRows = result as ITreeRow[]
            const groupRows = treeRows.filter((t) => t.isGroup)
            expect(groupRows.length).toBe(1) // single group
        })
    })
})
