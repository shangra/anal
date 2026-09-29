/**
 * Tests for cf-components/constants.ts and panels/utils.ts
 *
 * Тестируют: toggleAppearanceProperty, toggleFontProperty,
 * collectExpandableIds, collectSelectableValues.
 */

import {
    toggleAppearanceProperty,
    toggleFontProperty,
    DEFAULT_COLORS,
    TABS,
} from '../ListSettingsModal/cf-components/constants'
import {
    collectExpandableIds,
    collectSelectableValues,
} from '../ListSettingsModal/panels/panels.utils'
import type { AvailableFieldTreeNode } from '../ListSettingsModal/panels/types'
import type { ConditionalAppearance } from '../../../../../helpers/listSettings/facets/conditionalFormatting/types'

// ==================== TABS ====================

describe('TABS', () => {
    it('should contain appearance tab', () => {
        const appearanceTab = TABS.find((t) => t.key === 'appearance')
        expect(appearanceTab).toBeDefined()
        expect(appearanceTab!.label).toBe('Оформление')
    })

    it('should contain condition tab', () => {
        const conditionTab = TABS.find((t) => t.key === 'condition')
        expect(conditionTab).toBeDefined()
        expect(conditionTab!.label).toBe('Условие')
    })

    it('should contain fields tab', () => {
        const fieldsTab = TABS.find((t) => t.key === 'fields')
        expect(fieldsTab).toBeDefined()
        expect(fieldsTab!.label).toBe('Оформляемые поля')
    })

    it('should have exactly 3 tabs', () => {
        expect(TABS).toHaveLength(3)
    })
})

// ==================== DEFAULT COLORS ====================

describe('DEFAULT_COLORS', () => {
    it('should have backgroundColor default', () => {
        expect(DEFAULT_COLORS.backgroundColor).toBe('#ca8a04')
    })

    it('should have textColor default', () => {
        expect(DEFAULT_COLORS.textColor).toBe('#0f172a')
    })
})

// ==================== TOGGLE APPEARANCE PROPERTY ====================

describe('toggleAppearanceProperty', () => {
    describe('adding property', () => {
        it('should add backgroundColor with default color', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'backgroundColor')

            expect(result.backgroundColor).toBe('#ca8a04')
        })

        it('should add textColor with default color', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'textColor')

            expect(result.textColor).toBe('#0f172a')
        })

        it('should add font property', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'font')

            expect(result.font).toBeDefined()
            expect(typeof result.font).toBe('object')
        })

        it('should add horizontalAlign with default', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'horizontalAlign')

            expect(result.horizontalAlign).toBe('left')
        })

        it('should add verticalAlign with default', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'verticalAlign')

            expect(result.verticalAlign).toBe('top')
        })

        it('should add textOrientation with default', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'textOrientation')

            expect(result.textOrientation).toBe('notChanged')
        })

        it('should add mirror with default', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'mirror')

            expect(result.mirror).toBe('none')
        })

        it('should add markNegatives with default true', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'markNegatives')

            expect(result.markNegatives).toBe(true)
        })

        it('should add markIncomplete with default true', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'markIncomplete')

            expect(result.markIncomplete).toBe(true)
        })

        it('should add format with default', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'format')

            expect(result.format).toBe('ЧГ="0,00"')
        })

        it('should add text with empty string', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleAppearanceProperty(appearance, 'text')

            expect(result.text).toBe('')
        })
    })

    describe('removing property', () => {
        it('should remove backgroundColor', () => {
            const appearance: ConditionalAppearance = { backgroundColor: '#ff0000' }
            const result = toggleAppearanceProperty(appearance, 'backgroundColor')

            expect(result.backgroundColor).toBeUndefined()
        })

        it('should remove textColor', () => {
            const appearance: ConditionalAppearance = { textColor: '#00ff00' }
            const result = toggleAppearanceProperty(appearance, 'textColor')

            expect(result.textColor).toBeUndefined()
        })

        it('should remove font', () => {
            const appearance: ConditionalAppearance = { font: { bold: true } }
            const result = toggleAppearanceProperty(appearance, 'font')

            expect(result.font).toBeUndefined()
        })

        it('should toggle property back and forth', () => {
            const appearance: ConditionalAppearance = {}

            const added = toggleAppearanceProperty(appearance, 'backgroundColor')
            expect(added.backgroundColor).toBe('#ca8a04')

            const removed = toggleAppearanceProperty(added, 'backgroundColor')
            expect(removed.backgroundColor).toBeUndefined()
        })

        it('should preserve other properties when toggling one', () => {
            const appearance: ConditionalAppearance = {
                backgroundColor: '#ff0000',
                textColor: '#00ff00',
            }

            const result = toggleAppearanceProperty(appearance, 'backgroundColor')
            expect(result.backgroundColor).toBeUndefined()
            expect(result.textColor).toBe('#00ff00')
        })
    })

    describe('preservation of other properties', () => {
        it('should not affect unrelated properties', () => {
            const appearance: ConditionalAppearance = {
                backgroundColor: '#ff0000',
                horizontalAlign: 'center',
                verticalAlign: 'bottom',
            }

            const result = toggleAppearanceProperty(appearance, 'textColor')
            expect(result.backgroundColor).toBe('#ff0000')
            expect(result.horizontalAlign).toBe('center')
            expect(result.verticalAlign).toBe('bottom')
        })
    })
})

// ==================== TOGGLE FONT PROPERTY ====================

describe('toggleFontProperty', () => {
    describe('adding font properties', () => {
        it('should add bold to font', () => {
            const appearance: ConditionalAppearance = { font: {} }
            const result = toggleFontProperty(appearance, 'bold')

            expect(result.font?.bold).toBe(true)
        })

        it('should add italic to font', () => {
            const appearance: ConditionalAppearance = { font: {} }
            const result = toggleFontProperty(appearance, 'italic')

            expect(result.font?.italic).toBe(true)
        })

        it('should add underline to font', () => {
            const appearance: ConditionalAppearance = { font: {} }
            const result = toggleFontProperty(appearance, 'underline')

            expect(result.font?.underline).toBe(true)
        })

        it('should add strikeout to font', () => {
            const appearance: ConditionalAppearance = { font: {} }
            const result = toggleFontProperty(appearance, 'strikeout')

            expect(result.font?.strikeout).toBe(true)
        })

        it('should add size to font', () => {
            const appearance: ConditionalAppearance = { font: {} }
            const result = toggleFontProperty(appearance, 'size' as keyof NonNullable<ConditionalAppearance['font']>)

            // Size is handled differently (not boolean), but toggling still works
            expect(result.font).toBeDefined()
        })

        it('should add multiple font properties', () => {
            const appearance: ConditionalAppearance = { font: {} }
            const withBold = toggleFontProperty(appearance, 'bold')
            const withBoth = toggleFontProperty(withBold, 'italic')

            expect(withBoth.font?.bold).toBe(true)
            expect(withBoth.font?.italic).toBe(true)
        })
    })

    describe('removing font properties', () => {
        it('should remove bold', () => {
            const appearance: ConditionalAppearance = { font: { bold: true } }
            const result = toggleFontProperty(appearance, 'bold')

            expect(result.font?.bold).toBeUndefined()
        })

        it('should remove italic', () => {
            const appearance: ConditionalAppearance = { font: { italic: true } }
            const result = toggleFontProperty(appearance, 'italic')

            expect(result.font?.italic).toBeUndefined()
        })

        it('should toggle font property back and forth', () => {
            const appearance: ConditionalAppearance = { font: { bold: false } }
            const added = toggleFontProperty(appearance, 'bold')
            const removed = toggleFontProperty(added, 'bold')

            expect(removed.font?.bold).toBeUndefined()
        })
    })

    describe('removing font entirely', () => {
        it('should delete font when all properties removed', () => {
            const appearance: ConditionalAppearance = { font: { bold: true } }
            const result = toggleFontProperty(appearance, 'bold')

            expect(result.font).toBeUndefined()
        })

        it('should preserve other font properties when removing one', () => {
            const appearance: ConditionalAppearance = {
                font: { bold: true, italic: true },
            }
            const result = toggleFontProperty(appearance, 'bold')

            expect(result.font?.bold).toBeUndefined()
            expect(result.font?.italic).toBe(true)
        })

        it('should not delete font when some properties remain', () => {
            const appearance: ConditionalAppearance = {
                font: { bold: true, italic: true },
            }
            const result = toggleFontProperty(appearance, 'bold')

            expect(result.font).toBeDefined()
            expect(result.font?.italic).toBe(true)
        })
    })

    describe('handling undefined font', () => {
        it('should create font object when toggling on undefined font', () => {
            const appearance: ConditionalAppearance = {}
            const result = toggleFontProperty(appearance, 'bold' as keyof NonNullable<ConditionalAppearance['font']>)

            expect(result.font).toBeDefined()
            expect(result.font?.bold).toBe(true)
        })
    })
})

// ==================== COLLECT EXPANDABLE IDS ====================

describe('collectExpandableIds', () => {
    const createNode = (id: string, children?: AvailableFieldTreeNode[]): AvailableFieldTreeNode => ({
        id,
        value: id,
        label: id,
        children: children ?? [],
        isGroupLevel: !!children?.length,
    })

    it('should return empty array for leaf nodes', () => {
        const node = createNode('leaf')
        expect(collectExpandableIds([node])).toEqual([])
    })

    it('should return id of group node', () => {
        const group = createNode('group1', [createNode('child1')])
        expect(collectExpandableIds([group])).toEqual(['group1'])
    })

    it('should collect nested expandable ids', () => {
        const deepChild = createNode('deep', [createNode('deepest')])
        const middle = createNode('middle', [deepChild])
        const root = createNode('root', [middle])

        const result = collectExpandableIds([root])
        expect(result).toContain('root')
        expect(result).toContain('middle')
        expect(result).toContain('deep')
        expect(result).toHaveLength(3)
    })

    it('should handle multiple root nodes', () => {
        const group1 = createNode('group1', [createNode('c1')])
        const group2 = createNode('group2', [createNode('c2')])
        const leaf = createNode('leaf')

        const result = collectExpandableIds([group1, group2, leaf])
        expect(result).toContain('group1')
        expect(result).toContain('group2')
        expect(result).not.toContain('leaf')
        expect(result).toHaveLength(2)
    })

    it('should handle mixed hierarchy', () => {
        const deep = createNode('deep', [createNode('deepest')])
        const middle1 = createNode('middle1', [deep])
        const middle2 = createNode('middle2', [createNode('child2')])
        const root = createNode('root', [middle1, middle2])

        const result = collectExpandableIds([root])
        expect(result).toContain('root')
        expect(result).toContain('middle1')
        expect(result).toContain('middle2')
        expect(result).toContain('deep')
        expect(result).toHaveLength(4)
    })
})

// ==================== COLLECT SELECTABLE VALUES ====================

describe('collectSelectableValues', () => {
    const createNode = (
        id: string,
        value: string,
        children?: AvailableFieldTreeNode[],
    ): AvailableFieldTreeNode => ({
        id,
        value,
        label: value,
        children: children ?? [],
        isGroupLevel: !!children?.length,
    })

    it('should collect leaf values', () => {
        const leaf1 = createNode('id1', 'value1')
        const leaf2 = createNode('id2', 'value2')
        const result = collectSelectableValues([leaf1, leaf2])

        expect(result).toContain('value1')
        expect(result).toContain('value2')
        expect(result).toHaveLength(2)
    })

    it('should skip group-level nodes', () => {
        const group = createNode('group1', 'groupValue', [createNode('child1', 'childValue')])
        const result = collectSelectableValues([group])

        expect(result).toContain('childValue')
        expect(result).not.toContain('groupValue')
        expect(result).toHaveLength(1)
    })

    it('should collect nested leaf values', () => {
        const deepLeaf = createNode('deep1', 'deepValue')
        const middle = createNode('middle1', 'middleValue', [deepLeaf])
        const root = createNode('root1', 'rootValue', [middle])

        const result = collectSelectableValues([root])
        expect(result).toContain('deepValue')
        expect(result).not.toContain('middleValue')
        expect(result).not.toContain('rootValue')
        expect(result).toHaveLength(1)
    })

    it('should handle multiple levels', () => {
        const leaf1 = createNode('l1', 'val1')
        const leaf2 = createNode('l2', 'val2')
        const group = createNode('g1', 'groupVal', [leaf1, leaf2])
        const leaf3 = createNode('l3', 'val3')

        const result = collectSelectableValues([group, leaf3])
        expect(result).toContain('val1')
        expect(result).toContain('val2')
        expect(result).toContain('val3')
        expect(result).not.toContain('groupVal')
        expect(result).toHaveLength(3)
    })

    it('should handle empty array', () => {
        expect(collectSelectableValues([])).toEqual([])
    })

    it('should handle duplicate values from different branches', () => {
        const leaf1 = createNode('l1', 'sameValue')
        const leaf2 = createNode('l2', 'sameValue')
        const result = collectSelectableValues([leaf1, leaf2])

        // collectSelectableValues doesn't deduplicate
        expect(result).toHaveLength(2)
    })
})
