import type { CSSProperties } from 'react'
import type { ConditionalFormattingRule, ConditionalAppearance } from './types'
import { conditionNodeMatches } from './types'

export interface ConditionalCellDecoration {
    style: CSSProperties
    text?: string
    formattedValue?: string
}

type FormatType = 'number' | 'dateTime' | 'date' | 'text' | 'string'

interface ParsedFormat {
    type: FormatType
    numberPattern?: string
    datePattern?: string
    textMode?: 'UPPER' | 'lower' | 'Title' | 'TRIM' | 'SHORT' | 'MASK'
}

export function parse1CFormatString(formatStr: string): ParsedFormat | null {
    if (!formatStr || typeof formatStr !== 'string') return null

    const trimmed = formatStr.trim()

    const dtMatch = trimmed.match(/^ДФ\s*=\s*"([^"]+)"/i)
    if (dtMatch) {
        return { type: 'dateTime', datePattern: dtMatch[1] }
    }

    const ldMatch = trimmed.match(/^ЛДФ\s*=\s*"([^"]+)"/i)
    if (ldMatch) {
        return { type: 'date', datePattern: ldMatch[1] }
    }

    const cgMatch = trimmed.match(/^ЧГ\s*=\s*"([^"]+)"/i)
    if (cgMatch) {
        return { type: 'number', numberPattern: cgMatch[1] }
    }

    const cfMatch = trimmed.match(/^ЧФ\s*=\s*"([^"]+)"/i)
    if (cfMatch) {
        return { type: 'number', numberPattern: cfMatch[1] }
    }

    const chMatch = trimmed.match(/^Ч\s*=\s*"([^"]+)"/i)
    if (chMatch) {
        return { type: 'number', numberPattern: chMatch[1] }
    }

    const strUpper = trimmed.match(/^СТР\s*=\s*"ВЕРХНИЙ"/i)
    if (strUpper) {
        return { type: 'text', textMode: 'UPPER' }
    }

    const strLower = trimmed.match(/^СТР\s*=\s*"нижний"/i)
    if (strLower) {
        return { type: 'text', textMode: 'lower' }
    }

    const strTitle = trimmed.match(/^СТР\s*=\s*"Заглавная"/i)
    if (strTitle) {
        return { type: 'text', textMode: 'Title' }
    }

    const strTrim = trimmed.match(/^СТР\s*=\s*"Обрезать"/i)
    if (strTrim) {
        return { type: 'text', textMode: 'TRIM' }
    }

    const strShort = trimmed.match(/^СТР\s*=\s*"Короткий\s*\((\d+)\)"/i)
    if (strShort) {
        return { type: 'text', textMode: 'SHORT', numberPattern: strShort[1] }
    }

    const strMask = trimmed.match(/^СТР\s*=?\s*"([^"]+)"/i)
    if (strMask && strMask[1].includes('@')) {
        return { type: 'text', textMode: 'MASK', numberPattern: strMask[1] }
    }

    if (/^[\d\.,\s#;]+$/.test(trimmed)) {
        return { type: 'number', numberPattern: trimmed }
    }

    return { type: 'string' }
}

function formatText1C(value: unknown, textMode: string, pattern?: string): string {
    const str = String(value ?? '')

    switch (textMode) {
        case 'UPPER':
            return str.toUpperCase()
        case 'lower':
            return str.toLowerCase()
        case 'Title':
            if (str.length === 0) return str
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
        case 'TRIM':
            return str.trim()
        case 'SHORT': {
            const maxLen = parseInt(pattern || '30', 10)
            return str.length > maxLen ? str.slice(0, maxLen).trimEnd() + '…' : str
        }
        case 'MASK': {
            const mask = pattern || '@'
            // Заменяем каждый @ на строку, обрабатывая последовательно
            let result = ''
            let maskIdx = 0
            while (maskIdx < mask.length) {
                const ch = mask[maskIdx]
                if (ch === '@') {
                    result += str
                } else {
                    result += ch
                }
                maskIdx++
            }
            return result
        }
        default:
            return str
    }
}

function formatNumber1C(value: unknown, pattern: string): string {
    const num = typeof value === 'number' ? value : parseFloat(String(value))
    if (isNaN(num)) return String(value)

    const parts = pattern.split(';')
    let sign = num >= 0 ? 0 : 1
    let targetPattern = parts[0]

    if (parts.length >= 3 && sign === 1) {
        targetPattern = parts[1] || parts[0]
    } else if (parts.length === 2 && sign === 1) {
        targetPattern = parts[1]
    } else if (num === 0 && parts.length >= 3) {
        targetPattern = parts[2]
    }

    const normalizedPattern = targetPattern.replace(',', '.')

    const dotIndex = normalizedPattern.indexOf('.')
    let fractionDigits = 0
    if (dotIndex !== -1) {
        const afterDot = normalizedPattern.substring(dotIndex + 1).replace(/[^0#]/g, '')
        if (afterDot.length === 0) {
            fractionDigits = 0
        } else if (afterDot.includes('#')) {
            const zeroCount = afterDot.split('0').length - 1
            if (zeroCount === 0) {
                fractionDigits = 0
            } else {
                fractionDigits = zeroCount
            }
        } else {
            fractionDigits = afterDot.length
        }
    }

    const hasGroupSeparator = normalizedPattern.includes(' ')

    try {
        const fmt = new Intl.NumberFormat('ru-RU', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
            useGrouping: hasGroupSeparator,
        })
        return fmt.format(num)
    } catch {
        if (dotIndex !== -1) {
            return num.toFixed(fractionDigits)
        }
        return String(Math.round(num))
    }
}

function formatDateTime1C(value: unknown, datePattern: string): string {
    let date: Date
    if (value instanceof Date) {
        date = value
    } else if (typeof value === 'string') {
        date = new Date(value)
        if (isNaN(date.getTime())) return String(value)
    } else if (typeof value === 'number') {
        date = new Date(value)
        if (isNaN(date.getTime())) return String(value)
    } else {
        return String(value)
    }

    const parts: Record<string, string | boolean | undefined> = {}
    if (datePattern.match(/yyyy/)) parts.year = 'numeric'
    if (datePattern.match(/MM/)) parts.month = '2-digit'
    else if (datePattern.match(/M(?![M])/)) parts.month = 'numeric'
    if (datePattern.match(/dd/)) parts.day = '2-digit'
    else if (datePattern.match(/d(?![d])/)) parts.day = 'numeric'
    if (datePattern.match(/HH/)) parts.hour = '2-digit'
    else if (datePattern.match(/hh/)) { parts.hour = '2-digit'; parts.hour12 = true }
    if (datePattern.match(/mm/)) parts.minute = '2-digit'
    if (datePattern.match(/ss/)) parts.second = '2-digit'

    try {
        return new Intl.DateTimeFormat('ru-RU', parts as Intl.DateTimeFormatOptions).format(date)
    } catch {
        return date.toLocaleString('ru-RU')
    }
}

export function formatCellBy1CFormat(
    value: unknown,
    formatStr: string,
): string {
    const parsed = parse1CFormatString(formatStr)
    if (!parsed) return String(value)

    switch (parsed.type) {
        case 'number':
            return formatNumber1C(value, parsed.numberPattern || '0,00')
        case 'dateTime':
            return formatDateTime1C(value, parsed.datePattern || 'dd.MM.yyyy HH:mm:ss')
        case 'date':
            return formatDateTime1C(value, parsed.datePattern || 'dd.MM.yyyy')
        case 'text':
            return formatText1C(value, parsed.textMode || 'UPPER', parsed.numberPattern)
        default:
            return String(value)
    }
}

export function appearanceToCssProperties(
    appearance: ConditionalAppearance,
    cellRaw?: unknown,
): CSSProperties {
    const css: CSSProperties = {}

    if (appearance.backgroundColor) {
        css.backgroundColor = appearance.backgroundColor
    }
    if (appearance.textColor) {
        css.color = appearance.textColor
    } else if (appearance.markNegatives && typeof cellRaw === 'number' && cellRaw < 0) {
        css.color = '#dc2626'
    }

    if (appearance.font) {
        const { font } = appearance
        if (font.bold) css.fontWeight = 700
        if (font.italic) css.fontStyle = 'italic'
        if (font.underline && font.strikeout) css.textDecoration = 'underline line-through'
        else if (font.underline) css.textDecoration = 'underline'
        else if (font.strikeout) css.textDecoration = 'line-through'
        if (font.size) css.fontSize = `${font.size}px`
        if (font.name) css.fontFamily = font.name
    }

    if (appearance.horizontalAlign && appearance.horizontalAlign !== 'auto') {
        css.textAlign = appearance.horizontalAlign
    }
    if (appearance.verticalAlign) {
        css.verticalAlign = appearance.verticalAlign
    }

    if (appearance.textOrientation) {
        switch (appearance.textOrientation) {
            case 'bottomToTop':
                css.writingMode = 'vertical-rl'
                break
            case 'topToBottom':
                css.writingMode = 'vertical-lr'
                break
        }
    }

    if (appearance.mirror) {
        switch (appearance.mirror) {
            case 'horizontal':
                css.transform = 'scaleX(-1)'
                break
            case 'vertical':
                css.transform = 'scaleY(-1)'
                break
        }
    }

    return css
}

export function applyMarkIncomplete(style: CSSProperties, cellRaw: unknown): CSSProperties {
    if (cellRaw === null || cellRaw === undefined || cellRaw === '') {
        style.borderBottom = '2px solid #ef4444'
    }
    return style
}

export function ruleMatchesCondition(
    rule: ConditionalFormattingRule,
    cells: Record<string, unknown>,
): boolean {
    const enabledNodes = rule.conditionNodes.filter((node) => node.enabled)
    if (enabledNodes.length === 0) return false

    return enabledNodes.every((node) =>
        conditionNodeMatches(cells, node),
    )
}

export function getRuleAppearanceForRow(
    rule: ConditionalFormattingRule,
    rowCells: Record<string, unknown>,
): ConditionalCellDecoration | null {
    if (!rule.enabled) return null

    const columnNames = rule.targetFields.length > 0 ? rule.targetFields : Object.keys(rowCells)

    for (const columnName of columnNames) {
        const cellCss = appearanceToCssProperties(rule.appearance, rowCells[columnName])
        let overrideText: string | undefined
        let formattedValue: string | undefined

        if (rule.appearance.text !== undefined && rule.appearance.text !== '') {
            overrideText = rule.appearance.text
        }

        if (rule.appearance.format && typeof rule.appearance.format === 'string') {
            const cellRaw = rowCells[columnName]
            formattedValue = formatCellBy1CFormat(cellRaw, rule.appearance.format!)
        }

        return {
            style: cellCss,
            text: overrideText,
            formattedValue,
        }
    }

    return null
}

export function resolveConditionalCellDecoration(
    rowCells: Record<string, unknown>,
    columnName: string,
    rules: ConditionalFormattingRule[],
): ConditionalCellDecoration | null {
    let mergedStyle: CSSProperties = {}
    let overrideText: string | undefined
    let formattedValue: string | undefined

    for (const rule of rules) {
        if (!rule.enabled) continue

        if (rule.targetFields.length > 0 && !rule.targetFields.includes(columnName)) continue

        if (!ruleMatchesCondition(rule, rowCells)) continue

        const cellCss = appearanceToCssProperties(rule.appearance, rowCells[columnName])
        mergedStyle = { ...mergedStyle, ...cellCss }

        if (rule.appearance.text !== undefined && rule.appearance.text !== '') {
            overrideText = rule.appearance.text
        }

        if (rule.appearance.format && typeof rule.appearance.format === 'string') {
            const cellRaw = rowCells[columnName]
            formattedValue = formatCellBy1CFormat(cellRaw, rule.appearance.format!)
        }
    }

    const cellValue = rowCells[columnName]
    mergedStyle = applyMarkIncomplete(mergedStyle, cellValue)

    if (Object.keys(mergedStyle).length === 0 && overrideText === undefined && formattedValue === undefined) {
        return null
    }

    return {
        style: mergedStyle,
        text: overrideText,
        formattedValue,
    }
}

export function resolveSubstringAppearance(
    _childRows: Record<string, unknown>[],
    rules: ConditionalFormattingRule[],
): CSSProperties {
    let mergedStyle: CSSProperties = {}

    for (const rule of rules) {
        if (!rule.enabled) continue
        if (!rule.applyToSubstrings) continue

        const cellCss = appearanceToCssProperties(rule.appearance)
        mergedStyle = { ...mergedStyle, ...cellCss }
    }

    return Object.keys(mergedStyle).length > 0 ? mergedStyle : {}
}

export function getActiveConditionalFormattingRules(
    rules: ConditionalFormattingRule[],
): ConditionalFormattingRule[] {
    return rules.filter((r) => r.enabled)
}
