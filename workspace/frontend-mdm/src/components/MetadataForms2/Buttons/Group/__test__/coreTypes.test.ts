/**
 * Tests for core types (core/types.ts)
 *
 * Тестируют: ListSettingsFacetId, ListSettingsScope, GLOBAL_LIST_SETTINGS_SCOPE
 */

import {
    GLOBAL_LIST_SETTINGS_SCOPE,
    type ListSettingsScope,
    type ListSettingsFacetId,
} from '../../../../../helpers/listSettings/core/types'

describe('core types', () => {
    describe('GLOBAL_LIST_SETTINGS_SCOPE', () => {
        it('should have key property', () => {
            expect(GLOBAL_LIST_SETTINGS_SCOPE).toHaveProperty('key')
        })

        it('should have key value of "global"', () => {
            expect(GLOBAL_LIST_SETTINGS_SCOPE.key).toBe('global')
        })

        it('should be a plain object', () => {
            expect(typeof GLOBAL_LIST_SETTINGS_SCOPE).toBe('object')
        })
    })

    describe('ListSettingsScope', () => {
        it('should accept object with key property', () => {
            const scope: ListSettingsScope = { key: 'test-scope' }
            expect(scope.key).toBe('test-scope')
        })

        it('should accept any string value for key', () => {
            const scope1: ListSettingsScope = { key: 'my-scope' }
            const scope2: ListSettingsScope = { key: '' }
            const scope3: ListSettingsScope = { key: GLOBAL_LIST_SETTINGS_SCOPE.key }

            expect(typeof scope1.key).toBe('string')
            expect(typeof scope2.key).toBe('string')
            expect(typeof scope3.key).toBe('string')
        })
    })

    describe('ListSettingsFacetId', () => {
        it('should accept "selection" as valid facet id', () => {
            const facetId: ListSettingsFacetId = 'selection'
            expect(facetId).toBe('selection')
        })

        it('should accept "grouping" as valid facet id', () => {
            const facetId: ListSettingsFacetId = 'grouping'
            expect(facetId).toBe('grouping')
        })

        it('should accept "sort" as valid facet id', () => {
            const facetId: ListSettingsFacetId = 'sort'
            expect(facetId).toBe('sort')
        })

        it('should accept "conditionalFormatting" as valid facet id', () => {
            const facetId: ListSettingsFacetId = 'conditionalFormatting'
            expect(facetId).toBe('conditionalFormatting')
        })

        it('should have all expected facet ids', () => {
            const validFacetIds: ListSettingsFacetId[] = [
                'selection',
                'grouping',
                'sort',
                'conditionalFormatting',
            ]

            expect(validFacetIds).toHaveLength(4)
        })
    })
})
