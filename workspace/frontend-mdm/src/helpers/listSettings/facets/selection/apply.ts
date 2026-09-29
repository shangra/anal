import {
    isSelectionGroup,
    type SelectionComparison,
    type SelectionCondition,
    type SelectionNode,
} from './types'

export interface SelectionCellLike {
    columnName: string
    value: {
        originalData?: unknown
        viewedData?: unknown
    }
}

function getCellRaw(row: SelectionCellLike[], field: string): unknown {
    const cell = row.find((item) => item.columnName === field)
    return cell?.value.originalData ?? cell?.value.viewedData
}

function toComparableString(value: unknown): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return String(value)
}

function isEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    return false
}

type ComparisonFn = (cellValue: unknown, conditionValue: string | [string, string]) => boolean

function compareOrdered(
    left: string,
    right: string,
    predicate: (a: number | string, b: number | string) => boolean,
): boolean {
    const leftNum = Number(left)
    const rightNum = Number(right)
    const bothNumeric = left !== '' && right !== '' && !Number.isNaN(leftNum) && !Number.isNaN(rightNum)

    if (bothNumeric) return predicate(leftNum, rightNum)

    const leftTime = Date.parse(left)
    const rightTime = Date.parse(right)
    const bothDates = !Number.isNaN(leftTime) && !Number.isNaN(rightTime)
    if (bothDates) return predicate(leftTime, rightTime)

    return predicate(left, right)
}

function compareBetween(cellValue: unknown, conditionValue: [string, string]): boolean {
    const raw = cellValue
    if (isEmptyValue(raw)) return false
    if (!conditionValue[0] && !conditionValue[1]) return true
    
    const cellTime = Date.parse(String(raw))
    const bothDates = !Number.isNaN(cellTime)
    if (!bothDates) return false
    
    const [start, end] = conditionValue
    if (start && end) {
        const startParse = Date.parse(start)
        const endParse = Date.parse(end)
        if (!Number.isNaN(startParse) && !Number.isNaN(endParse)) {
            return cellTime >= startParse && cellTime <= endParse
        }
    }
    if (start) {
        const startParse = Date.parse(start)
        if (!Number.isNaN(startParse)) return cellTime >= startParse
    }
    if (end) {
        const endParse = Date.parse(end)
        if (!Number.isNaN(endParse)) return cellTime <= endParse
    }
    return false
}

const COMPARISON_HANDLERS: Record<SelectionComparison, ComparisonFn> = {
    filled: (cellValue) => !isEmptyValue(cellValue),
    empty: (cellValue) => isEmptyValue(cellValue),
    eq: (cellValue, conditionValue) => toComparableString(cellValue) === (typeof conditionValue === 'string' ? conditionValue : ''),
    ne: (cellValue, conditionValue) => toComparableString(cellValue) !== (typeof conditionValue === 'string' ? conditionValue : ''),
    contains: (cellValue, conditionValue) =>
        toComparableString(cellValue).toLowerCase().includes(typeof conditionValue === 'string' ? conditionValue.toLowerCase() : ''),
    notContains: (cellValue, conditionValue) =>
        !toComparableString(cellValue).toLowerCase().includes(typeof conditionValue === 'string' ? conditionValue.toLowerCase() : ''),
    gt: (cellValue, conditionValue) => compareOrdered(toComparableString(cellValue), typeof conditionValue === 'string' ? conditionValue : '', (a, b) => a > b),
    gte: (cellValue, conditionValue) => compareOrdered(toComparableString(cellValue), typeof conditionValue === 'string' ? conditionValue : '', (a, b) => a >= b),
    lt: (cellValue, conditionValue) => compareOrdered(toComparableString(cellValue), typeof conditionValue === 'string' ? conditionValue : '', (a, b) => a < b),
    lte: (cellValue, conditionValue) => compareOrdered(toComparableString(cellValue), typeof conditionValue === 'string' ? conditionValue : '', (a, b) => a <= b),
    between: (cellValue, conditionValue) => {
        if (Array.isArray(conditionValue)) {
            return compareBetween(cellValue, conditionValue)
        }
        return true
    },
}

function compareValues(cellValue: unknown, comparison: SelectionComparison, conditionValue: string | [string, string]): boolean {
    return COMPARISON_HANDLERS[comparison](cellValue, conditionValue)
}

function flattenRowCells(row: Array<SelectionCellLike | SelectionCellLike[]>): SelectionCellLike[] {
    return row.flatMap((cellOrGroup) => (Array.isArray(cellOrGroup) ? cellOrGroup : [cellOrGroup]))
}

function conditionMatches(cells: SelectionCellLike[], condition: SelectionCondition): boolean {
    const isBetween = condition.comparison === 'between'
    const isRangeValue = Array.isArray(condition.value)
    
    if (isBetween && isRangeValue) {
        const [start, end] = condition.value
        if (!start && !end) return true
    } else if (!isBetween && !isRangeValue && typeof condition.value === 'string' && condition.value.trim() === '' && condition.comparison !== 'filled' && condition.comparison !== 'empty') {
        return true
    }
    
    return compareValues(getCellRaw(cells, condition.field), condition.comparison, condition.value)
}

function activeChildren(nodes: SelectionNode[]): SelectionNode[] {
    return nodes.filter((node) => node.enabled)
}

export function nodeMatchesSelection(cells: SelectionCellLike[], node: SelectionNode): boolean {
    if (!node.enabled) return true
    if (!isSelectionGroup(node)) return conditionMatches(cells, node)

    const children = activeChildren(node.children)
    if (children.length === 0) return true

    if (node.logic === 'or') return children.some((child) => nodeMatchesSelection(cells, child))
    if (node.logic === 'not') return !children.every((child) => nodeMatchesSelection(cells, child))

    return children.every((child) => nodeMatchesSelection(cells, child))
}

export function rowMatchesSelectionTree(cells: SelectionCellLike[], nodes: SelectionNode[]): boolean {
    const roots = activeChildren(nodes)
    if (roots.length === 0) return true
    return roots.every((node) => nodeMatchesSelection(cells, node))
}

export function applySelectionToFlatRows<T extends SelectionCellLike[]>(rows: T[], nodes: SelectionNode[]): T[] {
    if (nodes.length === 0) return rows
    return rows.filter((row) => rowMatchesSelectionTree(row, nodes))
}

export function applySelectionToMixedRows<T extends Array<SelectionCellLike | SelectionCellLike[]>>(
    rows: T[],
    nodes: SelectionNode[],
): T[] {
    if (nodes.length === 0) return rows
    return rows.filter((row) => rowMatchesSelectionTree(flattenRowCells(row), nodes))
}
