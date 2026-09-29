import type { SelectionNode } from '../selection/types'

export type ConditionalHorizontalAlign =
    | 'left'
    | 'center'
    | 'right'
    | 'justify'
    | 'auto'

export type ConditionalVerticalAlign = 'top' | 'center' | 'bottom'

export type ConditionalTextOrientation = 'notChanged' | 'bottomToTop' | 'topToBottom'

export type ConditionalMirror = 'none' | 'horizontal' | 'vertical'

export interface ConditionalAppearance {
    backgroundColor?: string
    textColor?: string
    font?: {
        bold?: boolean
        italic?: boolean
        underline?: boolean
        strikeout?: boolean
        size?: number
        name?: string
    }
    format?: string
    horizontalAlign?: ConditionalHorizontalAlign
    verticalAlign?: ConditionalVerticalAlign
    textOrientation?: ConditionalTextOrientation
    mirror?: ConditionalMirror
    markNegatives?: boolean
    markIncomplete?: boolean
    text?: string
}

export interface ConditionalAppearanceOption {
    key: keyof ConditionalAppearance | 'font'
    label: string
    needsValue?: boolean
    controlType?: 'color' | 'checkbox' | 'select' | 'text' | 'font'
}

export const CONDITIONAL_APPEARANCE_OPTIONS: ConditionalAppearanceOption[] = [
    { key: 'backgroundColor', label: 'Цвет фона', controlType: 'color' },
    { key: 'textColor', label: 'Цвет текста', controlType: 'color' },
    { key: 'font', label: 'Шрифт', controlType: 'font' },
    { key: 'format', label: 'Формат', controlType: 'select' },
    { key: 'horizontalAlign', label: 'Горизонтальное положение', controlType: 'select' },
    { key: 'verticalAlign', label: 'Вертикальное положение', controlType: 'select' },
    { key: 'textOrientation', label: 'Ориентация текста', controlType: 'select' },
    { key: 'mirror', label: 'Отразить зеркально', controlType: 'select' },
    { key: 'markNegatives', label: 'Выделять отрицательные', controlType: 'checkbox' },
    { key: 'markIncomplete', label: 'Отметка незаполненного', controlType: 'checkbox' },
    { key: 'text', label: 'Текст', controlType: 'text' },
]

const HORIZONTAL_ALIGN_OPTIONS = [
    { value: 'left', label: 'По левому краю' },
    { value: 'center', label: 'По центру' },
    { value: 'right', label: 'По правому краю' },
    { value: 'justify', label: 'По ширине' },
    { value: 'auto', label: 'Автоматически' },
] as const

const VERTICAL_ALIGN_OPTIONS = [
    { value: 'top', label: 'По верху' },
    { value: 'center', label: 'По центру' },
    { value: 'bottom', label: 'По нижнему краю' },
] as const

const TEXT_ORIENTATION_OPTIONS = [
    { value: 'notChanged', label: 'Не менять' },
    { value: 'bottomToTop', label: 'Снизу вверх' },
    { value: 'topToBottom', label: 'Сверху вниз' },
] as const

const MIRROR_OPTIONS = [
    { value: 'none', label: 'Нет' },
    { value: 'horizontal', label: 'По горизонтали' },
    { value: 'vertical', label: 'По вертикали' },
] as const

const FORMAT_OPTIONS = [
    { value: 'ДФ="dd.MM.yyyy HH:mm:ss"', label: 'Дата и время (полное)' },
    { value: 'ДФ="dd.MM.yyyy HH:mm"', label: 'Дата и время' },
    { value: 'ДФ="dd.MM.yy HH:mm"', label: 'Дата (короткая)' },
    { value: 'ДФ="dd MMMM yyyy"', label: 'Дата (месяц прописью)' },
    { value: 'ДФ="dd MMMM yyyy HH:mm"', label: 'Дата + время (месяц прописью)' },
    { value: 'ДФ="yyyy-MM-dd"', label: 'Дата (ISO)' },
    { value: 'ДФ="yyyy-MM-dd HH:mm"', label: 'Дата + время (ISO)' },
    { value: 'ЛДФ="dd.MM.yyyy"', label: 'Дата без времени' },
    { value: 'ЛДФ="dd.MM.yy"', label: 'Дата (короткая без времени)' },
    { value: 'ЛДФ="dd.MM.yyyy HH:mm:ss"', label: 'Дата + время (ЛДФ)' },
    { value: 'ДФ="dd.MM.yyyy"', label: 'Дата (короткая)' },
    { value: 'ЧГ="0"', label: 'Целое число' },
    { value: 'ЧФ="0"', label: 'Целое число (без группировки)' },
    { value: 'ЧГ="0,0"', label: 'Число (1 знак)' },
    { value: 'ЧФ="0,0"', label: 'Число (1 знак, без группировки)' },
    { value: 'ЧГ="0,00"', label: 'Число (2 знака)' },
    { value: 'ЧФ="0,00"', label: 'Число (2 знака, без группировки)' },
    { value: 'ЧГ="0,000"', label: 'Число (3 знака)' },
    { value: 'ЧФ="0,000"', label: 'Число (3 знака, без группировки)' },
    { value: 'ЧГ="0,0000"', label: 'Число (4 знака)' },
    { value: 'ЧФ="0,0000"', label: 'Число (4 знака, без группировки)' },
    { value: 'ЧГ="0%"', label: 'Процент (целый)' },
    { value: 'ЧГ="0,0%"', label: 'Процент (1 знак)' },
    { value: 'ЧГ="0,00%"', label: 'Процент (2 знака)' },
    { value: 'ЧГ="0,00" р.', label: 'Денежное (рубли)' },
    { value: 'ЧГ="0,00" $', label: 'Денежное (доллары)' },
    { value: 'ЧГ="0,00" €', label: 'Денежное (евро)' },
    { value: 'ЧГ="0,00" ¥', label: 'Денежное (иены)' },
    { value: 'ЧГ="0,00" £', label: 'Денежное (фунты)' },
    { value: 'ЧГ="0,00E+00"', label: 'Научный (E+00)' },
    { value: 'ЧГ="0,00e+00"', label: 'Научный (e+00)' },
    { value: 'СТР="ВЕРХНИЙ"', label: 'ВЕРХНИЙ РЕГИСТР' },
    { value: 'СТР="нижний"', label: 'нижний регистр' },
    { value: 'СТР="Заглавная"', label: 'Заглавная буква' },
    { value: 'СТР="Обрезать"', label: 'Обрезать пробелы' },
    { value: 'СТР="Короткий (10)"', label: 'Короткий (до 10 символов)' },
    { value: 'СТР="Короткий (20)"', label: 'Короткий (до 20 символов)' },
    { value: 'СТР="Короткий (30)"', label: 'Короткий (до 30 символов)' },
    { value: 'СТР="@[№@] - "@', label: 'Предустановка (№) - (пробел)' },
] as const

export { HORIZONTAL_ALIGN_OPTIONS, VERTICAL_ALIGN_OPTIONS, TEXT_ORIENTATION_OPTIONS, MIRROR_OPTIONS, FORMAT_OPTIONS }

export interface ConditionalFormattingRule {
    id: string
    enabled: boolean
    presentation: string
    appearance: ConditionalAppearance
    conditionNodes: SelectionNode[]
    targetFields: string[]
    applyToSubstrings?: boolean
}

export interface ConditionalFormattingSettingsState {
    conditionalFormattingRules: ConditionalFormattingRule[]
}

const APPEARANCE_PALETTE = ['#ca8a04', '#4dca83', '#4786ff', '#f4515d', '#9fadb9', '#f5a623']
const ALL_CONDITIONAL_FORMATTING_RULES_STORE: ConditionalFormattingRule[] = []

function nextAppearanceColor(): string {
    const used = new Set<string>()
    for (const rule of ALL_CONDITIONAL_FORMATTING_RULES_STORE) {
        if (rule.appearance.backgroundColor) {
            used.add(rule.appearance.backgroundColor)
        }
    }
    for (const color of APPEARANCE_PALETTE) {
        if (!used.has(color)) return color
    }
    return '#ca8a04'
}

import {
    createSelectionCondition,
    type SelectionCondition,
    type SelectionComparison,
} from '../selection/types'
import { getCatalogFields } from '../../../grouping.helper'

function getAvailableFields(): Array<{ value: string; label: string }> {
    return getCatalogFields()
}

export function createConditionalFormattingRule(defaultField?: string): ConditionalFormattingRule {
    const catalog = getAvailableFields()
    const field = defaultField ?? (catalog[0]?.value ?? '')
    const color = nextAppearanceColor()

    return {
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        enabled: true,
        presentation: '',
        appearance: { backgroundColor: color },
        conditionNodes: [
            createSelectionCondition(field, { comparison: 'eq', value: '' }),
        ],
        targetFields: [field],
    }
}

export function cloneConditionalAppearance(appearance: ConditionalAppearance): ConditionalAppearance {
    const { font, ...rest } = appearance
    return {
        ...rest,
        font: font ? { ...font } : undefined,
    }
}

export function cloneConditionalFormattingRule(rule: ConditionalFormattingRule): ConditionalFormattingRule {
    return {
        ...rule,
        appearance: cloneConditionalAppearance(rule.appearance),
        conditionNodes: rule.conditionNodes.map((n) =>
            structuredClone
                ? structuredClone(n)
                : JSON.parse(JSON.stringify(n)),
        ),
        targetFields: [...rule.targetFields],
        applyToSubstrings: rule.applyToSubstrings,
    }
}

export function cloneConditionalFormattingSettingsState(
    state: ConditionalFormattingSettingsState,
): ConditionalFormattingSettingsState {
    return {
        conditionalFormattingRules: state.conditionalFormattingRules.map(cloneConditionalFormattingRule),
    }
}

export function parseConditionalFormattingSettingsState(
    raw: unknown,
): ConditionalFormattingSettingsState {
    try {
        const data = (raw ?? {}) as Record<string, unknown>

        if (Array.isArray(data.conditionalFormattingRules)) {
            const rules: ConditionalFormattingRule[] = []
            for (const item of data.conditionalFormattingRules) {
                if (isConditionalFormattingRule(item)) {
                    rules.push(item)
                }
            }
            return { conditionalFormattingRules: rules }
        }

        if (Array.isArray(data.rules)) {
            const rules: ConditionalFormattingRule[] = []
            for (const item of data.rules) {
                if (item == null || typeof item !== 'object' || Array.isArray(item)) continue
                try {
                    const migrated = migrateLegacyRule(item as Record<string, unknown>)
                    rules.push(migrated)
                } catch {
                    // Skip invalid legacy
                }
            }
            return { conditionalFormattingRules: rules }
        }

        return emptyConditionalFormattingSettingsState()
    } catch {
        return emptyConditionalFormattingSettingsState()
    }
}

function isConditionalFormattingRule(v: unknown): v is ConditionalFormattingRule {
    if (v == null || typeof v !== 'object' || Array.isArray(v)) return false
    const obj = v as Record<string, unknown>
    return (
        typeof obj.id === 'string' &&
        typeof obj.enabled === 'boolean' &&
        Array.isArray(obj.conditionNodes) &&
        Array.isArray(obj.targetFields)
    )
}

function migrateLegacyRule(raw: Record<string, unknown>): ConditionalFormattingRule {
    const appearanceRaw = raw.appearance as Record<string, unknown> | undefined
    let appearance: ConditionalAppearance = {}

    if (appearanceRaw && typeof appearanceRaw === 'object') {
        if (appearanceRaw.backgroundColor !== undefined) {
            appearance = appearanceRaw as ConditionalAppearance
        } else {
            const kind = appearanceRaw.kind as string | undefined
            const color = appearanceRaw.color as string | undefined
            if (kind && color) {
                appearance = { backgroundColor: color }
            }
        }
    }

    let conditionNodes: SelectionNode[] = []
    if (Array.isArray(raw.conditionNodes)) {
        conditionNodes = raw.conditionNodes as SelectionNode[]
    } else if (raw.condition && typeof raw.condition === 'object') {
        const cond = raw.condition as Record<string, unknown>
        conditionNodes = [
            createSelectionCondition(
                (cond.field as string) ?? '',
                { comparison: (cond.comparison as SelectionComparison) ?? 'eq', value: (cond.value as string) ?? '' },
            ),
        ]
    }

    return {
        id: (raw.id as string) ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
        presentation: (raw.presentation as string) ?? '',
        appearance,
        conditionNodes,
        targetFields: Array.isArray(raw.targetFields)
            ? (raw.targetFields as string[])
            : [],
    }
}

export function emptyConditionalFormattingSettingsState(): ConditionalFormattingSettingsState {
    return { conditionalFormattingRules: [] }
}

export function formatAppearanceSummary(appearance: ConditionalAppearance): string {
    const labels: string[] = []
    if (appearance.backgroundColor) labels.push('Цвет фона')
    if (appearance.textColor) labels.push('Цвет текста')
    if (appearance.font) labels.push('Шрифт')
    if (appearance.format) labels.push('Формат')
    if (appearance.horizontalAlign) labels.push('Выравнивание')
    if (appearance.verticalAlign) labels.push('Вертикальное положение')
    if (appearance.textOrientation) labels.push('Ориентация текста')
    if (appearance.mirror) labels.push('Отразить зеркально')
    if (appearance.markNegatives) labels.push('Отрицательные')
    if (appearance.markIncomplete) labels.push('Незаполненные')
    if (appearance.text) labels.push('Текст')
    return labels.length > 0 ? labels.join(', ') : '—'
}

export function getAppearancePreviewColor(appearance: ConditionalAppearance): string | undefined {
    return appearance.backgroundColor ?? appearance.textColor
}

export function formatTargetFieldsSummary(
    targetFields: string[],
    getFieldLabel: (key: string) => string,
): string {
    if (targetFields.length === 0) return '<Все поля>'
    return targetFields.map((f) => getFieldLabel(f) || f).join(', ')
}

export function formatConditionSummary(node: SelectionNode): string {
    if (node.kind === 'group') {
        const children = node.children.map(formatConditionSummary).filter(Boolean)
        if (children.length === 0) return '—'
        const separator = node.logic === 'and' ? ' и ' : node.logic === 'or' ? ' или ' : ' '
        return children.join(separator)
    }

    const cond = node as import('../selection/types').SelectionCondition
    const comparisonLabels: Record<string, string> = {
        eq: '=',
        ne: '≠',
        gt: '>',
        gte: '≥',
        lt: '<',
        lte: '≤',
        contains: 'содержит',
        notContains: 'не содержит',
        filled: 'заполнено',
        empty: 'пусто',
    }
    const label = comparisonLabels[cond.comparison] ?? cond.comparison
    return cond.value ? `${cond.field} ${label} "${cond.value}"` : `${cond.field} ${label}`
}

export function conditionNodeMatches(
    cells: Record<string, unknown>,
    node: SelectionNode,
): boolean {
    if (!node.enabled) return true

    if (node.kind === 'group') {
        const children = node.children.filter((c) => c.enabled)
        if (children.length === 0) return false
        switch (node.logic) {
            case 'and':
                return children.every((c) => conditionNodeMatches(cells, c))
            case 'or':
                return children.some((c) => conditionNodeMatches(cells, c))
            case 'not':
                return !children.every((c) => conditionNodeMatches(cells, c))
            default:
                return true
        }
    }

    const cond = node as SelectionCondition
    const raw = cells[cond.field]
    const cellValue = raw ?? ''

    const needsValue = cond.comparison === 'eq'
        || cond.comparison === 'ne'
        || cond.comparison === 'gt'
        || cond.comparison === 'gte'
        || cond.comparison === 'lt'
        || cond.comparison === 'lte'
        || cond.comparison === 'contains'
        || cond.comparison === 'notContains'

    if (needsValue && cond.value === '') return false

    const valueToCompare = Array.isArray(cond.value) ? cond.value[0] ?? '' : cond.value
    return compareCellValue(cellValue, cond.comparison, valueToCompare)
}

function compareCellValue(
    cellValue: unknown,
    comparison: string,
    conditionValue: string,
): boolean {
    const str = String(cellValue ?? '')
    const cmp = conditionValue.toLowerCase()
    const lower = str.toLowerCase()

    switch (comparison) {
        case 'eq':
            return lower === cmp
        case 'ne':
            return lower !== cmp
        case 'gt':
            return toOrderedValue(str) > toOrderedValue(conditionValue)
        case 'gte':
            return toOrderedValue(str) >= toOrderedValue(conditionValue)
        case 'lt':
            return toOrderedValue(str) < toOrderedValue(conditionValue)
        case 'lte':
            return toOrderedValue(str) <= toOrderedValue(conditionValue)
        case 'contains':
            return lower.includes(cmp)
        case 'notContains':
            return !lower.includes(cmp)
        case 'filled':
            return str !== '' && str !== 'null' && str !== 'undefined'
        case 'empty':
            return str === '' || str === 'null' || str === 'undefined'
        default:
            return lower === cmp
    }
}

function toOrderedValue(v: string): number {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
    return v.localeCompare('', 'ru')
}
