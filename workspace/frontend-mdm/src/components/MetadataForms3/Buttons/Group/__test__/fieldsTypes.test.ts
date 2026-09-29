/**
 * Tests for fields catalog and types (fields/catalog.ts, fields/types.ts)
 *
 * Тестируют: normalizeListFieldDataType, listFieldCatalog,
 * getFieldLabel, getFieldDataType, getFieldDescriptor
 */

import {
    normalizeListFieldDataType,
    type ListFieldDataType,
} from '../../../../../helpers/listSettings/fields/types'

describe('normalizeListFieldDataType', () => {
    describe('string types', () => {
        it('should normalize "string"', () => {
            expect(normalizeListFieldDataType('string')).toBe('string')
        })

        it('should normalize "text"', () => {
            expect(normalizeListFieldDataType('text')).toBe('string')
        })

        it('should be case-insensitive', () => {
            expect(normalizeListFieldDataType('STRING')).toBe('string')
            expect(normalizeListFieldDataType('TEXT')).toBe('string')
            expect(normalizeListFieldDataType('Text')).toBe('string')
        })
    })

    describe('number types', () => {
        it('should normalize "number"', () => {
            expect(normalizeListFieldDataType('number')).toBe('number')
        })

        it('should normalize "integer"', () => {
            expect(normalizeListFieldDataType('integer')).toBe('number')
        })

        it('should normalize "int"', () => {
            expect(normalizeListFieldDataType('int')).toBe('number')
        })

        it('should normalize "float"', () => {
            expect(normalizeListFieldDataType('float')).toBe('number')
        })

        it('should normalize "decimal"', () => {
            expect(normalizeListFieldDataType('decimal')).toBe('number')
        })
    })

    describe('boolean types', () => {
        it('should normalize "boolean"', () => {
            expect(normalizeListFieldDataType('boolean')).toBe('boolean')
        })

        it('should normalize "bool"', () => {
            expect(normalizeListFieldDataType('bool')).toBe('boolean')
        })
    })

    describe('date types', () => {
        it('should normalize "date"', () => {
            expect(normalizeListFieldDataType('date')).toBe('date')
        })

        it('should normalize "datetime"', () => {
            expect(normalizeListFieldDataType('datetime')).toBe('date')
        })

        it('should normalize "timestamp"', () => {
            expect(normalizeListFieldDataType('timestamp')).toBe('date')
        })
    })

    describe('uuid types', () => {
        it('should normalize "uuid"', () => {
            expect(normalizeListFieldDataType('uuid')).toBe('uuid')
        })

        it('should normalize "guid"', () => {
            expect(normalizeListFieldDataType('guid')).toBe('uuid')
        })
    })

    describe('unknown types', () => {
        it('should return "unknown" for undefined', () => {
            expect(normalizeListFieldDataType(undefined)).toBe('unknown')
        })

        it('should return "unknown" for null', () => {
            expect(normalizeListFieldDataType(null as unknown as ListFieldDataType | undefined)).toBe('unknown')
        })

        it('should return "unknown" for empty string', () => {
            expect(normalizeListFieldDataType('')).toBe('unknown')
        })

        it('should return "unknown" for unrecognized type', () => {
            expect(normalizeListFieldDataType('customtype')).toBe('unknown')
            expect(normalizeListFieldDataType('datetimewithoffset')).toBe('unknown')
        })

        it('should return "unknown" for mixed case unrecognized type', () => {
            expect(normalizeListFieldDataType('CustomType')).toBe('unknown')
        })
    })
})
