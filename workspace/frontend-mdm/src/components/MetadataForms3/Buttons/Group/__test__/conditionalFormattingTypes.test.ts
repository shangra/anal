/**
 * Tests for helpers/listSettings/facets/conditionalFormatting/types.ts
 *
 * Тестируют: createConditionalFormattingRule, clone*, parse*, formatAppearanceSummary,
 * getAppearancePreviewColor, formatTargetFieldsSummary, formatConditionSummary,
 * conditionNodeMatches, константы типов.
 */

import {
    createConditionalFormattingRule,
    cloneConditionalAppearance,
    cloneConditionalFormattingRule,
    cloneConditionalFormattingSettingsState,
    parseConditionalFormattingSettingsState,
    emptyConditionalFormattingSettingsState,
    formatAppearanceSummary,
    getAppearancePreviewColor,
    formatTargetFieldsSummary,
    formatConditionSummary,
    conditionNodeMatches,
    CONDITIONAL_APPEARANCE_OPTIONS,
    HORIZONTAL_ALIGN_OPTIONS,
    VERTICAL_ALIGN_OPTIONS,
    TEXT_ORIENTATION_OPTIONS,
    MIRROR_OPTIONS,
    FORMAT_OPTIONS,
    type ConditionalFormattingRule,
    type ConditionalFormattingSettingsState,
    type ConditionalAppearance,
} from '../../../../../helpers/listSettings/facets/conditionalFormatting/types'
import {
    createSelectionCondition,
    createSelectionGroup,
    type SelectionCondition,
} from '../../../../../helpers/listSettings/facets/selection/types'

// ---- helpers для мокинга ----

function mockFieldCatalog(fields: Array<{ value: string; label: string }>): void {
    // getCatalogFields из grouping.helper мокается глобально, если нужно.
    // Для createConditionalFormattingRule используем поле по умолчанию.
}

describe('conditional formatting types', () => {

    // ==================== КОНСТАНТЫ ====================

    describe('CONDITIONAL_APPEARANCE_OPTIONS', () => {
        it('should contain all expected keys', () => {
            const keys = CONDITIONAL_APPEARANCE_OPTIONS.map((o) => o.key)
            expect(keys).toContain('backgroundColor')
            expect(keys).toContain('textColor')
            expect(keys).toContain('font')
            expect(keys).toContain('format')
            expect(keys).toContain('horizontalAlign')
            expect(keys).toContain('verticalAlign')
            expect(keys).toContain('textOrientation')
            expect(keys).toContain('mirror')
            expect(keys).toContain('markNegatives')
            expect(keys).toContain('markIncomplete')
            expect(keys).toContain('text')
        })

        it('should have 11 options', () => {
            expect(CONDITIONAL_APPEARANCE_OPTIONS).toHaveLength(11)
        })

        it('should have correct controlType for each option', () => {
            const map: Record<string, string> = {
                backgroundColor: 'color',
                textColor: 'color',
                font: 'font',
                format: 'select',
                horizontalAlign: 'select',
                verticalAlign: 'select',
                textOrientation: 'select',
                mirror: 'select',
                markNegatives: 'checkbox',
                markIncomplete: 'checkbox',
                text: 'text',
            }
            CONDITIONAL_APPEARANCE_OPTIONS.forEach((opt) => {
                expect(opt.controlType).toBe(map[opt.key])
            })
        })
    })

    describe('HORIZONTAL_ALIGN_OPTIONS', () => {
        it('should contain all align values', () => {
            const values = HORIZONTAL_ALIGN_OPTIONS.map((o) => o.value)
            expect(values).toContain('left')
            expect(values).toContain('center')
            expect(values).toContain('right')
            expect(values).toContain('justify')
            expect(values).toContain('auto')
        })
    })

    describe('VERTICAL_ALIGN_OPTIONS', () => {
        it('should contain all align values', () => {
            const values = VERTICAL_ALIGN_OPTIONS.map((o) => o.value)
            expect(values).toContain('top')
            expect(values).toContain('center')
            expect(values).toContain('bottom')
        })
    })

    describe('TEXT_ORIENTATION_OPTIONS', () => {
        it('should contain all orientation values', () => {
            const values = TEXT_ORIENTATION_OPTIONS.map((o) => o.value)
            expect(values).toContain('notChanged')
            expect(values).toContain('bottomToTop')
            expect(values).toContain('topToBottom')
        })
    })

    describe('MIRROR_OPTIONS', () => {
        it('should contain all mirror values', () => {
            const values = MIRROR_OPTIONS.map((o) => o.value)
            expect(values).toContain('none')
            expect(values).toContain('horizontal')
            expect(values).toContain('vertical')
        })
    })

    describe('FORMAT_OPTIONS', () => {
        it('should contain date formats', () => {
            const values = FORMAT_OPTIONS.map((o) => o.value)
            expect(values).toContain('ДФ="dd.MM.yyyy HH:mm:ss"')
            expect(values).toContain('ЛДФ="dd.MM.yyyy"')
        })

        it('should contain number formats', () => {
            const values = FORMAT_OPTIONS.map((o) => o.value)
            expect(values).toContain('ЧГ="0,00"')
            expect(values).toContain('ЧФ="0,00"')
        })

        it('should contain text formats', () => {
            const values = FORMAT_OPTIONS.map((o) => o.value)
            expect(values).toContain('СТР="ВЕРХНИЙ"')
            expect(values).toContain('СТР="нижний"')
        })
    })

    // ==================== CREATE ====================

    describe('createConditionalFormattingRule', () => {
        it('should create a rule with required fields', () => {
            const rule = createConditionalFormattingRule('name')

            expect(rule.id).toBeDefined()
            expect(rule.enabled).toBe(true)
            expect(rule.presentation).toBe('')
            expect(rule.conditionNodes).toHaveLength(1)
            expect(rule.targetFields).toContain('name')
            expect(rule.appearance.backgroundColor).toBeDefined()
        })

        it('should set correct condition node', () => {
            const rule = createConditionalFormattingRule('code')
            const cond = rule.conditionNodes[0] as SelectionCondition

            expect(cond.field).toBe('code')
            expect(cond.comparison).toBe('eq')
            expect(cond.value).toBe('')
            expect(cond.enabled).toBe(true)
        })
    })

    // ==================== CLONE ====================

    describe('cloneConditionalAppearance', () => {
        it('should deep clone font settings', () => {
            const appearance: ConditionalAppearance = {
                backgroundColor: '#ff0000',
                font: { bold: true, size: 12, name: 'Arial' },
            }

            const cloned = cloneConditionalAppearance(appearance)
            cloned.font!.bold = false

            expect(appearance.font?.bold).toBe(true)
            expect(cloned.font?.bold).toBe(false)
        })

        it('should clone empty appearance', () => {
            const appearance: ConditionalAppearance = {}
            const cloned = cloneConditionalAppearance(appearance)
            expect(cloned).toEqual({})
        })

        it('should clone all properties', () => {
            const appearance: ConditionalAppearance = {
                backgroundColor: '#ca8a04',
                textColor: '#0f172a',
                font: { bold: true, italic: true, underline: true, strikeout: true, size: 14 },
                format: 'ЧГ="0,00"',
                horizontalAlign: 'center',
                verticalAlign: 'bottom',
                textOrientation: 'bottomToTop',
                mirror: 'horizontal',
                markNegatives: true,
                markIncomplete: false,
                text: 'Custom',
            }

            const cloned = cloneConditionalAppearance(appearance)
            expect(cloned).toEqual(appearance)
        })
    })

    describe('cloneConditionalFormattingRule', () => {
        it('should deep clone rule with all properties', () => {
            const cond = createSelectionCondition('name', { comparison: 'contains', value: 'test' })
            const rule: ConditionalFormattingRule = {
                id: 'rule-1',
                enabled: false,
                presentation: 'Test Rule',
                appearance: { backgroundColor: '#4dca83', textColor: '#0f172a' },
                conditionNodes: [cond],
                targetFields: ['name', 'code'],
                applyToSubstrings: true,
            }

            const cloned = cloneConditionalFormattingRule(rule)
            cloned.appearance.backgroundColor = '#ff0000'
            cloned.targetFields.push('newField')
            if (cloned.conditionNodes[0].kind === 'condition') cloned.conditionNodes[0].value = 'modified'

            expect(rule.appearance.backgroundColor).toBe('#4dca83')
            expect(cloned.appearance.backgroundColor).toBe('#ff0000')
            expect(rule.targetFields).toHaveLength(2)
            expect(cloned.targetFields).toHaveLength(3)
        })
    })

    describe('cloneConditionalFormattingSettingsState', () => {
        it('should deep clone state with multiple rules', () => {
            const state: ConditionalFormattingSettingsState = {
                conditionalFormattingRules: [
                    createConditionalFormattingRule('name'),
                    createConditionalFormattingRule('code'),
                ],
            }

            const cloned = cloneConditionalFormattingSettingsState(state)
            cloned.conditionalFormattingRules[0].enabled = false

            expect(state.conditionalFormattingRules[0].enabled).toBe(true)
            expect(cloned.conditionalFormattingRules[0].enabled).toBe(false)
        })
    })

    // ==================== PARSE ====================

    describe('parseConditionalFormattingSettingsState', () => {
        it('should parse modern format', () => {
            const modernRule = createConditionalFormattingRule('name')
            const raw = {
                conditionalFormattingRules: [modernRule],
            }

            const result = parseConditionalFormattingSettingsState(raw)
            expect(result.conditionalFormattingRules).toHaveLength(1)
            expect(result.conditionalFormattingRules[0].id).toBe(modernRule.id)
        })

        it('should parse legacy format', () => {
            const raw = {
                rules: [
                    {
                        id: 'legacy-1',
                        enabled: true,
                        appearance: { backgroundColor: '#ca8a04' },
                        condition: { field: 'name', comparison: 'eq', value: 'test' },
                        targetFields: ['name'],
                    },
                ],
            }

            const result = parseConditionalFormattingSettingsState(raw)
            expect(result.conditionalFormattingRules).toHaveLength(1)
            expect(result.conditionalFormattingRules[0].id).toBe('legacy-1')
            expect(result.conditionalFormattingRules[0].enabled).toBe(true)
        })

        it('should return empty state for null input', () => {
            const result = parseConditionalFormattingSettingsState(null)
            expect(result.conditionalFormattingRules).toHaveLength(0)
        })

        it('should return empty state for invalid input', () => {
            const result = parseConditionalFormattingSettingsState('invalid' as unknown)
            expect(result.conditionalFormattingRules).toHaveLength(0)
        })

        it('should return empty state for empty object', () => {
            const result = parseConditionalFormattingSettingsState({})
            expect(result.conditionalFormattingRules).toHaveLength(0)
        })

        it('should filter out invalid rules from legacy format', () => {
            const raw = {
                rules: [
                    {
                        id: 'legacy-valid',
                        enabled: true,
                        appearance: { backgroundColor: '#ff0000' },
                        condition: { field: 'name', comparison: 'eq', value: 'test' },
                        targetFields: ['name'],
                    }, // valid legacy format
                    'invalid', // invalid
                    42, // invalid
                    null, // invalid
                ],
            }

            const result = parseConditionalFormattingSettingsState(raw)
            expect(result.conditionalFormattingRules).toHaveLength(1)
            expect(result.conditionalFormattingRules[0].id).toBe('legacy-valid')
        })

        it('should filter out invalid rules from modern format', () => {
            const raw = {
                conditionalFormattingRules: [
                    createConditionalFormattingRule('name'),
                    null as unknown,
                    'invalid' as unknown,
                ],
            }

            const result = parseConditionalFormattingSettingsState(raw)
            expect(result.conditionalFormattingRules).toHaveLength(1)
        })

        it('should migrate legacy rule without appearance', () => {
            const raw = {
                rules: [
                    {
                        id: 'legacy-2',
                        enabled: false,
                        conditionNodes: [],
                        targetFields: [],
                    },
                ],
            }

            const result = parseConditionalFormattingSettingsState(raw)
            expect(result.conditionalFormattingRules).toHaveLength(1)
            expect(result.conditionalFormattingRules[0].enabled).toBe(false)
            expect(result.conditionalFormattingRules[0].appearance).toEqual({})
        })
    })

    describe('emptyConditionalFormattingSettingsState', () => {
        it('should return state with empty rules array', () => {
            const result = emptyConditionalFormattingSettingsState()
            expect(result.conditionalFormattingRules).toEqual([])
        })
    })

    // ==================== FORMAT ====================

    describe('formatAppearanceSummary', () => {
        it('should return "—" for empty appearance', () => {
            expect(formatAppearanceSummary({})).toBe('—')
        })

        it('should list all enabled appearance properties', () => {
            const appearance: ConditionalAppearance = {
                backgroundColor: '#ca8a04',
                textColor: '#0f172a',
                font: { bold: true },
                format: 'ЧГ="0,00"',
                horizontalAlign: 'center',
                verticalAlign: 'top',
                textOrientation: 'bottomToTop',
                mirror: 'horizontal',
                markNegatives: true,
                markIncomplete: false,
                text: 'Test',
            }

            const summary = formatAppearanceSummary(appearance)
            expect(summary).toContain('Цвет фона')
            expect(summary).toContain('Цвет текста')
            expect(summary).toContain('Шрифт')
            expect(summary).toContain('Формат')
            expect(summary).toContain('Выравнивание')
            expect(summary).toContain('Вертикальное положение')
            expect(summary).toContain('Ориентация текста')
            expect(summary).toContain('Отразить зеркально')
            expect(summary).toContain('Отрицательные')
        })

        it('should not include disabled properties', () => {
            const appearance: ConditionalAppearance = {
                backgroundColor: '#ca8a04',
            }

            const summary = formatAppearanceSummary(appearance)
            expect(summary).toBe('Цвет фона')
        })

        it('should handle markIncomplete false', () => {
            const appearance: ConditionalAppearance = {
                markIncomplete: true,
            }

            const summary = formatAppearanceSummary(appearance)
            expect(summary).toBe('Незаполненные')
        })
    })

    describe('getAppearancePreviewColor', () => {
        it('should return backgroundColor', () => {
            const appearance: ConditionalAppearance = { backgroundColor: '#ff0000' }
            expect(getAppearancePreviewColor(appearance)).toBe('#ff0000')
        })

        it('should fallback to textColor if no backgroundColor', () => {
            const appearance: ConditionalAppearance = { textColor: '#00ff00' }
            expect(getAppearancePreviewColor(appearance)).toBe('#00ff00')
        })

        it('should return undefined for empty appearance', () => {
            expect(getAppearancePreviewColor({})).toBeUndefined()
        })
    })

    describe('formatTargetFieldsSummary', () => {
        const getFieldLabel = (key: string): string => {
            const labels: Record<string, string> = {
                name: 'Имя',
                code: 'Код',
                description: 'Описание',
            }
            return labels[key] || key
        }

        it('should return "<Все поля>" for empty array', () => {
            expect(formatTargetFieldsSummary([], getFieldLabel)).toBe('<Все поля>')
        })

        it('should format single field', () => {
            expect(formatTargetFieldsSummary(['name'], getFieldLabel)).toBe('Имя')
        })

        it('should format multiple fields', () => {
            const result = formatTargetFieldsSummary(['name', 'code'], getFieldLabel)
            expect(result).toBe('Имя, Код')
        })

        it('should use field key as fallback for unknown labels', () => {
            expect(formatTargetFieldsSummary(['unknownField'], getFieldLabel)).toBe('unknownField')
        })
    })

    // ==================== CONDITION SUMMARY ====================

    describe('formatConditionSummary', () => {
        it('should format simple condition', () => {
            const cond: SelectionCondition = createSelectionCondition('name', {
                comparison: 'eq',
                value: 'test',
            })

            const summary = formatConditionSummary(cond)
            expect(summary).toBe('name = "test"')
        })

        it('should format filled condition', () => {
            const cond: SelectionCondition = createSelectionCondition('name', {
                comparison: 'filled',
            })

            const summary = formatConditionSummary(cond)
            expect(summary).toBe('name заполнено')
        })

        it('should format group with AND logic', () => {
            const condA = createSelectionCondition('fieldA', { comparison: 'eq', value: '1' })
            const condB = createSelectionCondition('fieldB', { comparison: 'eq', value: '2' })
            const group = createSelectionGroup([condA, condB], 'and')

            const summary = formatConditionSummary(group)
            expect(summary).toContain('fieldA')
            expect(summary).toContain('fieldB')
            expect(summary).toContain('и')
        })

        it('should format group with OR logic', () => {
            const condA = createSelectionCondition('fieldA', { comparison: 'eq', value: '1' })
            const condB = createSelectionCondition('fieldB', { comparison: 'eq', value: '2' })
            const group = createSelectionGroup([condA, condB], 'or')

            const summary = formatConditionSummary(group)
            expect(summary).toContain('или')
        })

        it('should format empty group', () => {
            const group = createSelectionGroup([], 'and')
            expect(formatConditionSummary(group)).toBe('—')
        })
    })

    // ==================== CONDITION NODE MATCHES ====================

    describe('conditionNodeMatches', () => {
        describe('equal comparison', () => {
            it('should match equal values (case-insensitive)', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'eq',
                    value: 'test',
                })
                expect(conditionNodeMatches({ name: 'TEST' }, cond)).toBe(true)
                expect(conditionNodeMatches({ name: 'test' }, cond)).toBe(true)
            })

            it('should not match different values', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'eq',
                    value: 'test',
                })
                expect(conditionNodeMatches({ name: 'other' }, cond)).toBe(false)
            })

            it('should not match empty value', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'eq',
                    value: 'test',
                })
                expect(conditionNodeMatches({ name: '' }, cond)).toBe(false)
            })
        })

        describe('not equal comparison', () => {
            it('should not match equal values', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'ne',
                    value: 'test',
                })
                expect(conditionNodeMatches({ name: 'test' }, cond)).toBe(false)
            })

            it('should match different values', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'ne',
                    value: 'test',
                })
                expect(conditionNodeMatches({ name: 'other' }, cond)).toBe(true)
            })
        })

        describe('contains comparison', () => {
            it('should match when value contains substring', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'contains',
                    value: 'test',
                })
                expect(conditionNodeMatches({ name: 'testing' }, cond)).toBe(true)
                expect(conditionNodeMatches({ name: 'my-test-value' }, cond)).toBe(true)
            })

            it('should not match when substring is missing', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'contains',
                    value: 'test',
                })
                expect(conditionNodeMatches({ name: 'other' }, cond)).toBe(false)
            })
        })

        describe('notContains comparison', () => {
            it('should not match when value contains substring', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'notContains',
                    value: 'test',
                })
                expect(conditionNodeMatches({ name: 'testing' }, cond)).toBe(false)
            })

            it('should match when substring is missing', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'notContains',
                    value: 'test',
                })
                expect(conditionNodeMatches({ name: 'other' }, cond)).toBe(true)
            })
        })

        describe('gt/gte/lt/lte comparisons', () => {
            it('should match greater than', () => {
                const cond: SelectionCondition = createSelectionCondition('value', {
                    comparison: 'gt',
                    value: '10',
                })
                expect(conditionNodeMatches({ value: '20' }, cond)).toBe(true)
                expect(conditionNodeMatches({ value: '10' }, cond)).toBe(false)
            })

            it('should match greater than or equal', () => {
                const cond: SelectionCondition = createSelectionCondition('value', {
                    comparison: 'gte',
                    value: '10',
                })
                expect(conditionNodeMatches({ value: '10' }, cond)).toBe(true)
                expect(conditionNodeMatches({ value: '11' }, cond)).toBe(true)
                expect(conditionNodeMatches({ value: '9' }, cond)).toBe(false)
            })

            it('should match less than', () => {
                const cond: SelectionCondition = createSelectionCondition('value', {
                    comparison: 'lt',
                    value: '10',
                })
                expect(conditionNodeMatches({ value: '5' }, cond)).toBe(true)
                expect(conditionNodeMatches({ value: '10' }, cond)).toBe(false)
            })

            it('should match less than or equal', () => {
                const cond: SelectionCondition = createSelectionCondition('value', {
                    comparison: 'lte',
                    value: '10',
                })
                expect(conditionNodeMatches({ value: '10' }, cond)).toBe(true)
                expect(conditionNodeMatches({ value: '9' }, cond)).toBe(true)
                expect(conditionNodeMatches({ value: '11' }, cond)).toBe(false)
            })
        })

        describe('filled/empty comparisons', () => {
            it('should match filled', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'filled',
                })
                expect(conditionNodeMatches({ name: 'test' }, cond)).toBe(true)
                expect(conditionNodeMatches({ name: '' }, cond)).toBe(false)
            })

            it('should not match filled for null/undefined', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'filled',
                })
                expect(conditionNodeMatches({ name: null }, cond)).toBe(false)
                expect(conditionNodeMatches({ name: undefined }, cond)).toBe(false)
            })

            it('should match empty', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'empty',
                })
                expect(conditionNodeMatches({ name: '' }, cond)).toBe(true)
            })

            it('should match empty for null/undefined', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'empty',
                })
                expect(conditionNodeMatches({ name: null }, cond)).toBe(true)
                expect(conditionNodeMatches({ name: undefined }, cond)).toBe(true)
            })
        })

        describe('disabled node', () => {
            it('should always match when disabled', () => {
                const cond: SelectionCondition = createSelectionCondition('name', {
                    comparison: 'eq',
                    value: 'test',
                    enabled: false,
                })
                expect(conditionNodeMatches({ name: 'anything' }, cond)).toBe(true)
            })
        })

        describe('group node', () => {
            it('should match all children for AND', () => {
                const condA = createSelectionCondition('fieldA', { comparison: 'eq', value: '1' })
                const condB = createSelectionCondition('fieldB', { comparison: 'eq', value: '2' })
                const group = createSelectionGroup([condA, condB], 'and')

                expect(conditionNodeMatches({ fieldA: '1', fieldB: '2' }, group)).toBe(true)
                expect(conditionNodeMatches({ fieldA: '1', fieldB: 'other' }, group)).toBe(false)
            })

            it('should match any child for OR', () => {
                const condA = createSelectionCondition('fieldA', { comparison: 'eq', value: '1' })
                const condB = createSelectionCondition('fieldB', { comparison: 'eq', value: '2' })
                const group = createSelectionGroup([condA, condB], 'or')

                expect(conditionNodeMatches({ fieldA: '1', fieldB: '2' }, group)).toBe(true)
                expect(conditionNodeMatches({ fieldA: '1', fieldB: 'other' }, group)).toBe(true)
                expect(conditionNodeMatches({ fieldA: 'other', fieldB: '2' }, group)).toBe(true)
                expect(conditionNodeMatches({ fieldA: 'other', fieldB: 'other' }, group)).toBe(false)
            })

            it('should not match for NOT (negation of AND)', () => {
                const condA = createSelectionCondition('fieldA', { comparison: 'eq', value: '1' })
                const condB = createSelectionCondition('fieldB', { comparison: 'eq', value: '2' })
                const group = createSelectionGroup([condA, condB], 'not')

                expect(conditionNodeMatches({ fieldA: '1', fieldB: '2' }, group)).toBe(false)
                expect(conditionNodeMatches({ fieldA: 'other', fieldB: 'other' }, group)).toBe(true)
            })

            it('should not match empty group children', () => {
                const group = createSelectionGroup([], 'and')
                expect(conditionNodeMatches({}, group)).toBe(false)
            })

            it('should skip disabled children', () => {
                const condA = createSelectionCondition('fieldA', { comparison: 'eq', value: '1', enabled: false })
                const condB = createSelectionCondition('fieldB', { comparison: 'eq', value: '2' })
                const group = createSelectionGroup([condA, condB], 'and')

                expect(conditionNodeMatches({ fieldB: '2' }, group)).toBe(true)
                expect(conditionNodeMatches({ fieldA: '1', fieldB: '2' }, group)).toBe(true)
            })
        })
    })
})
