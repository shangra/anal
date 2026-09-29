import type { ConditionalAppearance } from '../../../../../../helpers/listSettings/facets/conditionalFormatting/types'
import type { PropertiesTab } from './types'

export const TABS: { key: PropertiesTab; label: string }[] = [
    { key: 'appearance', label: 'Оформление' },
    { key: 'condition', label: 'Условие' },
    { key: 'fields', label: 'Оформляемые поля' },
]

export const DEFAULT_COLORS = {
    backgroundColor: '#ca8a04',
    textColor: '#0f172a',
} as const

const DEFAULT_TEXT_FORMAT = 'ЧГ="0,00"' as const

function setAppearanceDefault<K extends keyof ConditionalAppearance>(
    next: ConditionalAppearance,
    key: K,
): void {
    switch (key) {
        case 'backgroundColor':
            next.backgroundColor = DEFAULT_COLORS.backgroundColor
            break
        case 'textColor':
            next.textColor = DEFAULT_COLORS.textColor
            break
        case 'font':
            next.font = {} as NonNullable<ConditionalAppearance['font']>
            break
        case 'horizontalAlign':
            next.horizontalAlign = 'left'
            break
        case 'verticalAlign':
            next.verticalAlign = 'top'
            break
        case 'textOrientation':
            next.textOrientation = 'notChanged'
            break
        case 'mirror':
            next.mirror = 'none'
            break
        case 'markNegatives':
            next.markNegatives = true
            break
        case 'markIncomplete':
            next.markIncomplete = true
            break
        case 'format':
            next.format = DEFAULT_TEXT_FORMAT
            break
        case 'text':
            next.text = ''
            break
    }
}

export function toggleAppearanceProperty(
    appearance: ConditionalAppearance,
    key: keyof ConditionalAppearance,
): ConditionalAppearance {
    const next: ConditionalAppearance = { ...appearance }
    if (key in next) {
        delete (next as Record<string, unknown>)[String(key)]
    } else {
        setAppearanceDefault(next, key)
    }
    return next
}

export function toggleFontProperty(
    appearance: ConditionalAppearance,
    key: keyof NonNullable<ConditionalAppearance['font']>,
): ConditionalAppearance {
    const next: ConditionalAppearance = { ...appearance }
    const currentFont: Record<string, unknown> = (next.font ?? {}) as Record<string, unknown>
    const fontKey = String(key)
    if (currentFont[fontKey]) {
        delete currentFont[fontKey]
    } else {
        currentFont[fontKey] = true
    }
    if (Object.keys(currentFont).length === 0) {
        delete next.font
    } else {
        next.font = currentFont as NonNullable<ConditionalAppearance['font']>
    }
    return next
}
