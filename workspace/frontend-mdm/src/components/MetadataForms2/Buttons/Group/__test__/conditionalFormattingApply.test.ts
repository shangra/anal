/**
 * Tests for helpers/listSettings/facets/conditionalFormatting/apply.ts
 *
 * Тестируют: parse1CFormatString, formatCellBy1CFormat, appearanceToCssProperties,
 * ruleMatchesCondition, getRuleAppearanceForRow, resolveConditionalCellDecoration,
 * resolveSubstringAppearance, getActiveConditionalFormattingRules.
 */

import type { CSSProperties } from 'react'
import type { ConditionalFormattingRule } from '../../../../../helpers/listSettings/facets/conditionalFormatting/types'
import {
    parse1CFormatString,
    formatCellBy1CFormat,
    appearanceToCssProperties,
    ruleMatchesCondition,
    getRuleAppearanceForRow,
    resolveConditionalCellDecoration,
    resolveSubstringAppearance,
    getActiveConditionalFormattingRules,
    applyMarkIncomplete,
} from '../../../../../helpers/listSettings/facets/conditionalFormatting/apply'
import {
    createSelectionCondition,
} from '../../../../../helpers/listSettings/facets/selection/types'

// Helpers
function createRule(partial: Partial<ConditionalFormattingRule> = {}): ConditionalFormattingRule {
    return {
        id: 'test-rule',
        enabled: true,
        presentation: 'Test',
        appearance: {},
        conditionNodes: [],
        targetFields: [],
        ...partial,
    }
}

// ==================== PARSE 1C FORMAT ====================

describe('parse1CFormatString', () => {
    describe('date formats', () => {
        it('should parse ДФ dateTime format', () => {
            const result = parse1CFormatString('ДФ="dd.MM.yyyy HH:mm:ss"')
            expect(result).toEqual({ type: 'dateTime', datePattern: 'dd.MM.yyyy HH:mm:ss' })
        })

        it('should parse ЛДФ date format', () => {
            const result = parse1CFormatString('ЛДФ="dd.MM.yyyy"')
            expect(result).toEqual({ type: 'date', datePattern: 'dd.MM.yyyy' })
        })
    })

    describe('number formats', () => {
        it('should parse ЧГ format', () => {
            const result = parse1CFormatString('ЧГ="0,00"')
            expect(result).toEqual({ type: 'number', numberPattern: '0,00' })
        })

        it('should parse ЧФ format', () => {
            const result = parse1CFormatString('ЧФ="0,00"')
            expect(result).toEqual({ type: 'number', numberPattern: '0,00' })
        })

        it('should parse raw number pattern', () => {
            const result = parse1CFormatString('0,00')
            expect(result).toEqual({ type: 'number', numberPattern: '0,00' })
        })
    })

    describe('text formats', () => {
        it('should parse СТР ВЕРХНИЙ', () => {
            const result = parse1CFormatString('СТР="ВЕРХНИЙ"')
            expect(result).toEqual({ type: 'text', textMode: 'UPPER' })
        })

        it('should parse СТР нижний', () => {
            const result = parse1CFormatString('СТР="нижний"')
            expect(result).toEqual({ type: 'text', textMode: 'lower' })
        })

        it('should parse СТР Заглавная', () => {
            const result = parse1CFormatString('СТР="Заглавная"')
            expect(result).toEqual({ type: 'text', textMode: 'Title' })
        })

        it('should parse СТР Обрезать', () => {
            const result = parse1CFormatString('СТР="Обрезать"')
            expect(result).toEqual({ type: 'text', textMode: 'TRIM' })
        })

        it('should parse СТР Короткий(N)', () => {
            const result = parse1CFormatString('СТР="Короткий (20)"')
            expect(result).toEqual({ type: 'text', textMode: 'SHORT', numberPattern: '20' })
        })

        it('should parse СТР mask with @', () => {
            const result = parse1CFormatString('СТР="@@[№@]"')
            expect(result).toEqual({ type: 'text', textMode: 'MASK', numberPattern: '@@[№@]' })
        })
    })

    describe('edge cases', () => {
        it('should return null for empty string', () => {
            expect(parse1CFormatString('')).toBeNull()
        })

        it('should return null for null input', () => {
            expect(parse1CFormatString(null as unknown as string)).toBeNull()
        })

        it('should return null for non-string input', () => {
            expect(parse1CFormatString(42 as unknown as string)).toBeNull()
        })

        it('should handle string with leading/trailing whitespace', () => {
            const result = parse1CFormatString('  ДФ="dd.MM.yyyy"  ')
            expect(result).toEqual({ type: 'dateTime', datePattern: 'dd.MM.yyyy' })
        })
    })
})

// ==================== FORMAT CELL BY 1C ====================

describe('formatCellBy1CFormat', () => {
    describe('number formatting', () => {
        it('should format integer', () => {
            const result = formatCellBy1CFormat(42, 'ЧГ="0"')
            expect(result).toBe('42')
        })

        it('should format decimal with 2 digits', () => {
            const result = formatCellBy1CFormat(3.14159, 'ЧГ="0,00"')
            expect(result).toBe('3,14')
        })

        it('should format negative numbers', () => {
            const result = formatCellBy1CFormat(-5, 'ЧГ="0"')
            expect(result).toBe('-5')
        })
    })

    describe('text formatting', () => {
        it('should uppercase text', () => {
            const result = formatCellBy1CFormat('hello', 'СТР="ВЕРХНИЙ"')
            expect(result).toBe('HELLO')
        })

        it('should lowercase text', () => {
            const result = formatCellBy1CFormat('HELLO', 'СТР="нижний"')
            expect(result).toBe('hello')
        })

        it('should title case text', () => {
            const result = formatCellBy1CFormat('hello world', 'СТР="Заглавная"')
            expect(result).toBe('Hello world')
        })

        it('should trim text', () => {
            const result = formatCellBy1CFormat('  hello  ', 'СТР="Обрезать"')
            expect(result).toBe('hello')
        })

        it('should short text', () => {
            const result = formatCellBy1CFormat('very long text here', 'СТР="Короткий (10)"')
            expect(result).toBe('very long…')
        })

        it('should apply mask', () => {
            const result = formatCellBy1CFormat('test', 'СТР="@ - @"')
            expect(result).toBe('test - test')
        })
    })

    describe('date formatting', () => {
        it('should format date string', () => {
            const result = formatCellBy1CFormat('2024-01-15T00:00:00.000Z', 'ДФ="dd.MM.yyyy"')
            expect(result).toContain('15.01.2024')
        })

        it('should format with time', () => {
            const result = formatCellBy1CFormat('2024-01-15T10:30:00.000Z', 'ДФ="dd.MM.yyyy HH:mm"')
            expect(result).toContain('15.01.2024')
        })
    })

    describe('edge cases', () => {
        it('should return string value for invalid format', () => {
            const result = formatCellBy1CFormat('test', 'invalid')
            expect(result).toBe('test')
        })

        it('should handle undefined value', () => {
            const result = formatCellBy1CFormat(undefined, 'ЧГ="0"')
            expect(result).toBe('undefined')
        })
    })
})

// ==================== APPEARANCE TO CSS ====================

describe('appearanceToCssProperties', () => {
    describe('colors', () => {
        it('should set backgroundColor', () => {
            const css = appearanceToCssProperties({ backgroundColor: '#ff0000' })
            expect(css.backgroundColor).toBe('#ff0000')
        })

        it('should set textColor', () => {
            const css = appearanceToCssProperties({ textColor: '#00ff00' })
            expect(css.color).toBe('#00ff00')
        })

        it('should set markNegatives color for negative values', () => {
            const css = appearanceToCssProperties({ markNegatives: true }, -5)
            expect(css.color).toBe('#dc2626')
        })

        it('should not set markNegatives for positive values', () => {
            const css = appearanceToCssProperties({ markNegatives: true }, 5)
            expect(css.color).toBeUndefined()
        })

        it('should prioritize textColor over markNegatives', () => {
            const css = appearanceToCssProperties({ textColor: '#00ff00', markNegatives: true }, -5)
            expect(css.color).toBe('#00ff00')
        })
    })

    describe('font', () => {
        it('should set bold', () => {
            const css = appearanceToCssProperties({ font: { bold: true } })
            expect(css.fontWeight).toBe(700)
        })

        it('should set italic', () => {
            const css = appearanceToCssProperties({ font: { italic: true } })
            expect(css.fontStyle).toBe('italic')
        })

        it('should set underline', () => {
            const css = appearanceToCssProperties({ font: { underline: true } })
            expect(css.textDecoration).toBe('underline')
        })

        it('should set strikeout', () => {
            const css = appearanceToCssProperties({ font: { strikeout: true } })
            expect(css.textDecoration).toBe('line-through')
        })

        it('should set underline and strikeout together', () => {
            const css = appearanceToCssProperties({ font: { underline: true, strikeout: true } })
            expect(css.textDecoration).toBe('underline line-through')
        })

        it('should set font size', () => {
            const css = appearanceToCssProperties({ font: { size: 14 } })
            expect(css.fontSize).toBe('14px')
        })

        it('should set font family', () => {
            const css = appearanceToCssProperties({ font: { name: 'Arial' } })
            expect(css.fontFamily).toBe('Arial')
        })
    })

    describe('alignment', () => {
        it('should set horizontalAlign', () => {
            const css = appearanceToCssProperties({ horizontalAlign: 'center' })
            expect(css.textAlign).toBe('center')
        })

        it('should ignore horizontalAlign auto', () => {
            const css = appearanceToCssProperties({ horizontalAlign: 'auto' })
            expect(css.textAlign).toBeUndefined()
        })

        it('should set verticalAlign', () => {
            const css = appearanceToCssProperties({ verticalAlign: 'bottom' })
            expect(css.verticalAlign).toBe('bottom')
        })
    })

    describe('text orientation', () => {
        it('should set bottomToTop writing mode', () => {
            const css = appearanceToCssProperties({ textOrientation: 'bottomToTop' })
            expect(css.writingMode).toBe('vertical-rl')
        })

        it('should set topToBottom writing mode', () => {
            const css = appearanceToCssProperties({ textOrientation: 'topToBottom' })
            expect(css.writingMode).toBe('vertical-lr')
        })
    })

    describe('mirror', () => {
        it('should set horizontal mirror', () => {
            const css = appearanceToCssProperties({ mirror: 'horizontal' })
            expect(css.transform).toBe('scaleX(-1)')
        })

        it('should set vertical mirror', () => {
            const css = appearanceToCssProperties({ mirror: 'vertical' })
            expect(css.transform).toBe('scaleY(-1)')
        })
    })

    describe('empty appearance', () => {
        it('should return empty object', () => {
            const css = appearanceToCssProperties({})
            expect(css).toEqual({})
        })
    })
})

// ==================== MARK INCOMPLETE ====================

describe('applyMarkIncomplete', () => {
    it('should add border for null value', () => {
        const style: CSSProperties = {}
        applyMarkIncomplete(style, null)
        expect(style.borderBottom).toBe('2px solid #ef4444')
    })

    it('should add border for undefined value', () => {
        const style: CSSProperties = {}
        applyMarkIncomplete(style, undefined)
        expect(style.borderBottom).toBe('2px solid #ef4444')
    })

    it('should add border for empty string', () => {
        const style: CSSProperties = {}
        applyMarkIncomplete(style, '')
        expect(style.borderBottom).toBe('2px solid #ef4444')
    })

    it('should not modify for valid value', () => {
        const style: CSSProperties = { color: 'red' }
        applyMarkIncomplete(style, 'test')
        expect(style.borderBottom).toBeUndefined()
        expect(style.color).toBe('red')
    })

    it('should not modify for number', () => {
        const style: CSSProperties = { color: 'red' }
        applyMarkIncomplete(style, 42)
        expect(style.borderBottom).toBeUndefined()
    })
})

// ==================== RULE MATCHES CONDITION ====================

describe('ruleMatchesCondition', () => {
    it('should return false for disabled rule', () => {
        const rule = createRule({ enabled: false })
        expect(ruleMatchesCondition(rule, {})).toBe(false)
    })

    it('should return false for empty conditionNodes', () => {
        const rule = createRule({ conditionNodes: [] })
        expect(ruleMatchesCondition(rule, {})).toBe(false)
    })

    it('should return true when condition matches', () => {
        const cond = createSelectionCondition('name', { comparison: 'eq', value: 'test' })
        const rule = createRule({ conditionNodes: [cond] })
        expect(ruleMatchesCondition(rule, { name: 'test' })).toBe(true)
    })

    it('should return false when condition does not match', () => {
        const cond = createSelectionCondition('name', { comparison: 'eq', value: 'test' })
        const rule = createRule({ conditionNodes: [cond] })
        expect(ruleMatchesCondition(rule, { name: 'other' })).toBe(false)
    })

    it('should return false when condition is disabled', () => {
        const cond = createSelectionCondition('name', { comparison: 'eq', value: 'test', enabled: false })
        const rule = createRule({ conditionNodes: [cond] })
        expect(ruleMatchesCondition(rule, {})).toBe(false)
    })

    it('should require all enabled conditions to match (AND)', () => {
        const condA = createSelectionCondition('a', { comparison: 'eq', value: '1' })
        const condB = createSelectionCondition('b', { comparison: 'eq', value: '2' })
        const rule = createRule({ conditionNodes: [condA, condB] })
        expect(ruleMatchesCondition(rule, { a: '1', b: '2' })).toBe(true)
        expect(ruleMatchesCondition(rule, { a: '1', b: 'wrong' })).toBe(false)
    })
})

// ==================== GET RULE APPEARANCE ====================

describe('getRuleAppearanceForRow', () => {
    it('should return null for disabled rule', () => {
        const rule = createRule({ enabled: false })
        expect(getRuleAppearanceForRow(rule, { name: 'test' })).toBeNull()
    })

    it('should return CSS properties for enabled rule', () => {
        const rule = createRule({
            appearance: { backgroundColor: '#ff0000', textColor: '#ffffff' },
            conditionNodes: [],
        })
        const result = getRuleAppearanceForRow(rule, { name: 'test' })
        expect(result).not.toBeNull()
        expect(result!.style.backgroundColor).toBe('#ff0000')
    })

    it('should return text override', () => {
        const rule = createRule({
            appearance: { text: 'Custom Text' },
        })
        const result = getRuleAppearanceForRow(rule, { name: 'test' })
        expect(result!.text).toBe('Custom Text')
    })

    it('should apply number format', () => {
        const rule = createRule({
            appearance: { format: 'ЧГ="0,00"' },
        })
        const result = getRuleAppearanceForRow(rule, { value: 3.14159 })
        expect(result!.formattedValue).toBe('3,14')
    })
})

// ==================== RESOLVE CONDITIONAL CELL ====================

describe('resolveConditionalCellDecoration', () => {
    it('should return null when no rules match', () => {
        const rules: ConditionalFormattingRule[] = []
        expect(resolveConditionalCellDecoration({ name: 'test' }, 'name', rules)).toBeNull()
    })

    it('should skip disabled rules', () => {
        const rule = createRule({ enabled: false })
        const result = resolveConditionalCellDecoration({ name: null }, 'name', [rule])
        // Disabled rule is skipped, but markIncomplete still applies for null value
        expect(result).not.toBeNull()
        expect(result!.style.borderBottom).toBe('2px solid #ef4444')
    })

    it('should merge multiple rule styles', () => {
        const cond = createSelectionCondition('name', { comparison: 'eq', value: 'test' })
        const rule1 = createRule({
            enabled: true,
            targetFields: ['name'],
            appearance: { backgroundColor: '#ff0000' },
            conditionNodes: [cond],
        })
        const rule2 = createRule({
            enabled: true,
            targetFields: ['name'],
            appearance: { textColor: '#00ff00' },
            conditionNodes: [cond],
        })
        const result = resolveConditionalCellDecoration({ name: 'test' }, 'name', [rule1, rule2])
        expect(result).not.toBeNull()
        expect(result!.style.backgroundColor).toBe('#ff0000')
        expect(result!.style.color).toBe('#00ff00')
    })

    it('should skip rules not matching target fields', () => {
        const rule = createRule({
            enabled: true,
            targetFields: ['other'],
            appearance: { backgroundColor: '#ff0000' },
            conditionNodes: [],
        })
        const result = resolveConditionalCellDecoration({ name: 'test' }, 'name', [rule])
        // No matching target field
        expect(result).toBeNull()
    })

    it('should apply to all fields when targetFields is empty', () => {
        const cond = createSelectionCondition('name', { comparison: 'eq', value: 'test' })
        const rule = createRule({
            enabled: true,
            targetFields: [],
            appearance: { backgroundColor: '#ff0000' },
            conditionNodes: [cond],
        })
        const result = resolveConditionalCellDecoration({ name: 'test' }, 'name', [rule])
        expect(result).not.toBeNull()
        expect(result!.style.backgroundColor).toBe('#ff0000')
    })

    it('should apply markIncomplete for empty cell', () => {
        const rule = createRule({
            enabled: true,
            targetFields: [],
            conditionNodes: [],
        })
        const result = resolveConditionalCellDecoration({ name: null }, 'name', [rule])
        expect(result?.style.borderBottom).toBe('2px solid #ef4444')
    })
})

// ==================== RESOLVE SUBSTRING APPEARANCE ====================

describe('resolveSubstringAppearance', () => {
    it('should return empty object when no rules', () => {
        const result = resolveSubstringAppearance([], [])
        expect(result).toEqual({})
    })

    it('should skip disabled rules', () => {
        const rule = createRule({
            enabled: false,
            applyToSubstrings: true,
            appearance: { backgroundColor: '#ff0000' },
        })
        const result = resolveSubstringAppearance([], [rule])
        expect(result).toEqual({})
    })

    it('should skip rules without applyToSubstrings', () => {
        const rule = createRule({
            enabled: true,
            applyToSubstrings: false,
            appearance: { backgroundColor: '#ff0000' },
        })
        const result = resolveSubstringAppearance([], [rule])
        expect(result).toEqual({})
    })

    it('should merge enabled rules with applyToSubstrings', () => {
        const rule = createRule({
            enabled: true,
            applyToSubstrings: true,
            appearance: { backgroundColor: '#ff0000' },
        })
        const result = resolveSubstringAppearance([], [rule])
        expect(result.backgroundColor).toBe('#ff0000')
    })
})

// ==================== GET ACTIVE RULES ====================

describe('getActiveConditionalFormattingRules', () => {
    it('should return only enabled rules', () => {
        const rule1 = createRule({ enabled: true })
        const rule2 = createRule({ enabled: false })
        const rule3 = createRule({ enabled: true })

        const active = getActiveConditionalFormattingRules([rule1, rule2, rule3])
        expect(active).toHaveLength(2)
        expect(active[0].id).toBe(rule1.id)
        expect(active[1].id).toBe(rule3.id)
    })

    it('should return empty array when no rules', () => {
        expect(getActiveConditionalFormattingRules([])).toEqual([])
    })

    it('should return empty array when all disabled', () => {
        const rule = createRule({ enabled: false })
        expect(getActiveConditionalFormattingRules([rule])).toEqual([])
    })
})
