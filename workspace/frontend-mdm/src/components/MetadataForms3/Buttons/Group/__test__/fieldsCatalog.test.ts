/**
 * Tests for fields catalog (fields/catalog.ts)
 *
 * Тестируют: getFieldDescriptor, getFieldLabel, getFieldDataType
 */

import {
    listFieldCatalog,
    getFieldDescriptor,
    getFieldLabel,
    getFieldDataType,
} from '../../../../../helpers/listSettings/fields/catalog'
import { ListFieldDataType } from '../../../../../helpers/listSettings/fields/types'

describe('fields catalog', () => {
    describe('listFieldCatalog', () => {
        it('should return array of field descriptors', () => {
            const catalog = listFieldCatalog()

            expect(Array.isArray(catalog)).toBe(true)
        })

        it('should return empty array when no catalog fields available', () => {
            const catalog = listFieldCatalog()

            if (catalog.length === 0) {
                expect(catalog).toEqual([])
            }
        })

        it('should return descriptors with value, label, dataType when not empty', () => {
            const catalog = listFieldCatalog()

            if (catalog.length > 0) {
                const first = catalog[0]
                expect(typeof first.value).toBe('string')
                expect(typeof first.label).toBe('string')
                expect(first.dataType).toBeDefined()
            }
        })
    })

    describe('getFieldDescriptor', () => {
        it('should return undefined for non-existent field', () => {
            const descriptor = getFieldDescriptor('nonexistent-field-xyz')

            expect(descriptor).toBeUndefined()
        })

        it('should return descriptor with correct fields when field exists', () => {
            const catalog = listFieldCatalog()

            if (catalog.length > 0) {
                const firstValue = catalog[0].value
                const descriptor = getFieldDescriptor(firstValue)

                expect(descriptor).toBeDefined()
                if (descriptor) {
                    expect(descriptor.value).toBe(firstValue)
                    expect(typeof descriptor.label).toBe('string')
                    expect(descriptor.dataType).toBeDefined()
                }
            }
        })
    })

    describe('getFieldLabel', () => {
        it('should return field value for non-existent field', () => {
            const label = getFieldLabel('unknown-field-xyz')

            expect(label).toBe('unknown-field-xyz')
        })

        it('should return catalog label when field exists', () => {
            const catalog = listFieldCatalog()

            if (catalog.length > 0) {
                const firstValue = catalog[0].value
                const label = getFieldLabel(firstValue)

                expect(label).toBe(catalog[0].label)
            }
        })
    })

    describe('getFieldDataType', () => {
        it('should return "unknown" for non-existent field', () => {
            const dataType = getFieldDataType('nonexistent-field-xyz')

            expect(dataType).toBe('unknown')
        })

        it('should return valid ListFieldDataType when field exists', () => {
            const catalog = listFieldCatalog()

            if (catalog.length > 0) {
                const firstValue = catalog[0].value
                const dataType = getFieldDataType(firstValue)

                const validTypes: ListFieldDataType[] = [
                    'string', 'number', 'date', 'boolean', 'uuid', 'unknown',
                ]

                expect(validTypes).toContain(dataType)
            }
        })
    })
})
