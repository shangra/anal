import type { AvailableFieldTreeNode } from './types'

export function collectExpandableIds(nodes: AvailableFieldTreeNode[]): string[] {
    const ids: string[] = []
    for (const node of nodes) {
        if (node.children?.length) {
            ids.push(node.id)
            ids.push(...collectExpandableIds(node.children))
        }
    }
    return ids
}

export function collectSelectableValues(nodes: AvailableFieldTreeNode[]): string[] {
    const values: string[] = []
    for (const node of nodes) {
        if (!node.isGroupLevel) values.push(node.value)
        if (node.children?.length) {
            values.push(...collectSelectableValues(node.children))
        }
    }
    return values
}
