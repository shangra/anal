import type { ListFieldDataType } from '../../fields/types'

export type SelectionComparison =
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'notContains'
    | 'filled'
    | 'empty'
    | 'between'

export type SelectionGroupLogic = 'and' | 'or' | 'not'

export interface SelectionCondition {
    id: string
    kind?: 'condition'
    field: string
    comparison: SelectionComparison
    value: string | [string, string]
    enabled: boolean
    useRange?: boolean
}

export interface SelectionGroup {
    id: string
    kind: 'group'
    logic: SelectionGroupLogic
    enabled: boolean
    children: SelectionNode[]
}

export type SelectionNode = SelectionCondition | SelectionGroup

export interface SelectionSettingsState {
    selectionNodes: SelectionNode[]
}

export interface SelectionComparisonOption {
    value: SelectionComparison
    label: string
    needsValue: boolean
}

export const SELECTION_COMPARISON_OPTIONS: SelectionComparisonOption[] = [
    { value: 'eq', label: 'Равно', needsValue: true },
    { value: 'ne', label: 'Не равно', needsValue: true },
    { value: 'gt', label: 'Больше', needsValue: true },
    { value: 'gte', label: 'Больше или равно', needsValue: true },
    { value: 'lt', label: 'Меньше', needsValue: true },
    { value: 'lte', label: 'Меньше или равно', needsValue: true },
    { value: 'contains', label: 'Содержит', needsValue: true },
    { value: 'notContains', label: 'Не содержит', needsValue: true },
    { value: 'between', label: 'В диапазоне', needsValue: true },
    { value: 'filled', label: 'Заполнено', needsValue: false },
    { value: 'empty', label: 'Не заполнено', needsValue: false },
]

export const SELECTION_GROUP_LOGIC_OPTIONS: { value: SelectionGroupLogic; label: string }[] = [
    { value: 'and', label: 'Группа "И"' },
    { value: 'or', label: 'Группа "Или"' },
    { value: 'not', label: 'Группа "Не"' },
]

export const COMPARISONS_BY_FIELD_TYPE: Record<ListFieldDataType, readonly SelectionComparison[]> = {
    string: ['eq', 'ne', 'contains', 'notContains', 'filled', 'empty'],
    number: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'filled', 'empty'],
    date: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'between'],
    boolean: ['eq', 'ne'],
    uuid: ['eq', 'ne', 'contains', 'notContains', 'filled', 'empty'],
    unknown: ['eq', 'ne', 'contains', 'notContains', 'filled', 'empty'],
}

export function comparisonNeedsValue(comparison: SelectionComparison): boolean {
    return SELECTION_COMPARISON_OPTIONS.find((option) => option.value === comparison)?.needsValue ?? true
}

export function getComparisonsForFieldType(dataType: ListFieldDataType = 'unknown'): SelectionComparisonOption[] {
    const allowed = new Set(COMPARISONS_BY_FIELD_TYPE[dataType] ?? COMPARISONS_BY_FIELD_TYPE.unknown)
    return SELECTION_COMPARISON_OPTIONS.filter((option) => allowed.has(option.value))
}

export function isComparisonAllowedForFieldType(comparison: SelectionComparison, dataType: ListFieldDataType = 'unknown'): boolean {
    return (COMPARISONS_BY_FIELD_TYPE[dataType] ?? COMPARISONS_BY_FIELD_TYPE.unknown).includes(comparison)
}

export function defaultComparisonForFieldType(dataType: ListFieldDataType = 'unknown'): SelectionComparison {
    return (COMPARISONS_BY_FIELD_TYPE[dataType] ?? COMPARISONS_BY_FIELD_TYPE.unknown)[0] ?? 'eq'
}

export function isSelectionGroup(node: SelectionNode): node is SelectionGroup {
    return (node as SelectionGroup).kind === 'group'
}

export function isSelectionCondition(value: unknown): value is SelectionCondition {
    if (!value || typeof value !== 'object') return false
    const item = value as Partial<SelectionCondition>
    const isValidValue = typeof item.value === 'string' || (Array.isArray(item.value) && item.value.length === 2 && typeof item.value[0] === 'string' && typeof item.value[1] === 'string')
    return (
        typeof item.id === 'string' &&
        typeof item.field === 'string' &&
        typeof item.comparison === 'string' &&
        isValidValue &&
        typeof item.enabled === 'boolean' &&
        (item as { kind?: string }).kind !== 'group'
    )
}

export function isSelectionGroupNode(value: unknown): value is SelectionGroup {
    if (!value || typeof value !== 'object') return false
    const item = value as Partial<SelectionGroup>
    return (
        item.kind === 'group' &&
        typeof item.id === 'string' &&
        (item.logic === 'and' || item.logic === 'or' || item.logic === 'not') &&
        typeof item.enabled === 'boolean' &&
        Array.isArray(item.children)
    )
}

export function createSelectionCondition(
    field: string,
    partial?: Partial<Omit<SelectionCondition, 'id' | 'field'>>,
): SelectionCondition {
    return {
        id: `sel-${field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'condition',
        field,
        comparison: partial?.comparison ?? 'eq',
        value: partial?.value ?? '',
        enabled: partial?.enabled ?? true,
        useRange: partial?.useRange ?? false,
    }
}

export function createSelectionGroup(children: SelectionNode[], logic: SelectionGroupLogic = 'and'): SelectionGroup {
    return {
        id: `sel-group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'group',
        logic,
        enabled: true,
        children: children.map(cloneSelectionNode),
    }
}

export function cloneSelectionNode(node: SelectionNode): SelectionNode {
    if (isSelectionGroup(node)) return { ...node, children: node.children.map(cloneSelectionNode) }
    return {
        ...node,
        useRange: (node as SelectionCondition).useRange ?? false,
    }
}

export function cloneSelectionSettingsState(state: SelectionSettingsState): SelectionSettingsState {
    return { selectionNodes: state.selectionNodes.map(cloneSelectionNode) }
}

function parseSelectionNode(value: unknown): SelectionNode | null {
    if (isSelectionGroupNode(value)) {
        return {
            id: value.id,
            kind: 'group',
            logic: value.logic,
            enabled: value.enabled,
            children: value.children.map(parseSelectionNode).filter((node): node is SelectionNode => node !== null),
        }
    }
    if (isSelectionCondition(value)) {
        return {
            ...value,
            kind: 'condition',
            useRange: (value as Partial<SelectionCondition>).useRange ?? false,
        } as SelectionCondition
    }
    return null
}

export function parseSelectionSettingsState(raw: unknown): SelectionSettingsState {
    const data = (raw ?? {}) as { selectionNodes?: unknown[]; selectionConditions?: unknown[] }
    const list = Array.isArray(data.selectionNodes)
        ? data.selectionNodes
        : Array.isArray(data.selectionConditions)
          ? data.selectionConditions
          : []
    return {
        selectionNodes: list.map(parseSelectionNode).filter((node): node is SelectionNode => node !== null),
    }
}

export function emptySelectionSettingsState(): SelectionSettingsState {
    return { selectionNodes: [] }
}

export function flattenEnabledConditions(nodes: SelectionNode[]): SelectionCondition[] {
    const result: SelectionCondition[] = []
    for (const node of nodes) {
        if (isSelectionGroup(node)) {
            if (!node.enabled) continue
            result.push(...flattenEnabledConditions(node.children))
        } else if (node.enabled) {
            result.push(node)
        }
    }
    return result
}

export function collectNodeIds(nodes: SelectionNode[]): string[] {
    const ids: string[] = []
    for (const node of nodes) {
        ids.push(node.id)
        if (isSelectionGroup(node)) ids.push(...collectNodeIds(node.children))
    }
    return ids
}

export function findNodeById(nodes: SelectionNode[], id: string): SelectionNode | null {
    for (const node of nodes) {
        if (node.id === id) return node
        if (isSelectionGroup(node)) {
            const found = findNodeById(node.children, id)
            if (found) return found
        }
    }
    return null
}

export type SelectionFlatRow =
    | { type: 'condition'; node: SelectionCondition; depth: number; parentId: string | null }
    | { type: 'group'; node: SelectionGroup; depth: number; parentId: string | null }

export function flattenSelectionForRender(nodes: SelectionNode[], depth = 0, parentId: string | null = null): SelectionFlatRow[] {
    const rows: SelectionFlatRow[] = []
    for (const node of nodes) {
        if (isSelectionGroup(node)) {
            rows.push({ type: 'group', node, depth, parentId })
            rows.push(...flattenSelectionForRender(node.children, depth + 1, node.id))
        } else {
            rows.push({ type: 'condition', node, depth, parentId })
        }
    }
    return rows
}

export function getGroupLogicLabel(logic: SelectionGroupLogic): string {
    return SELECTION_GROUP_LOGIC_OPTIONS.find((option) => option.value === logic)?.label ?? `Группа «${logic}»`
}

export function getActiveSelectionConditions(state: SelectionSettingsState): SelectionCondition[] {
    return flattenEnabledConditions(state.selectionNodes)
}

export function getActiveSelectionNodes(state: SelectionSettingsState): SelectionNode[] {
    return state.selectionNodes
}
