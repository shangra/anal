import {
    cloneSelectionNode,
    createSelectionGroup,
    isSelectionGroup,
    type SelectionGroupLogic,
    type SelectionNode,
} from './types'

export interface NodeLocation {
    parentId: string | null
    parentChildren: SelectionNode[]
    index: number
    node: SelectionNode
}

export function findNodeLocation(nodes: SelectionNode[], id: string, parentId: string | null = null): NodeLocation | null {
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index]
        if (node.id === id) return { parentId, parentChildren: nodes, index, node }
        if (isSelectionGroup(node)) {
            const found = findNodeLocation(node.children, id, node.id)
            if (found) return found
        }
    }
    return null
}

function updateChildrenAt(
    nodes: SelectionNode[],
    parentId: string | null,
    updater: (children: SelectionNode[]) => SelectionNode[],
): SelectionNode[] {
    if (parentId === null) return updater(nodes.map(cloneSelectionNode))

    return nodes.map((node) => {
        if (!isSelectionGroup(node)) return cloneSelectionNode(node)
        if (node.id === parentId) return { ...node, children: updater(node.children.map(cloneSelectionNode)) }
        return { ...node, children: updateChildrenAt(node.children, parentId, updater) }
    })
}

export function mapSelectionTree(nodes: SelectionNode[], mapper: (node: SelectionNode) => SelectionNode): SelectionNode[] {
    return nodes.map((node) => {
        const mapped = mapper(cloneSelectionNode(node))
        if (isSelectionGroup(mapped)) return { ...mapped, children: mapSelectionTree(mapped.children, mapper) }
        return mapped
    })
}

export function updateSelectionNodeById(nodes: SelectionNode[], id: string, patch: Partial<SelectionNode>): SelectionNode[] {
    return mapSelectionTree(nodes, (node) => {
        if (node.id !== id) return node
        if (isSelectionGroup(node)) return { ...node, ...patch, kind: 'group', children: node.children }
        return { ...node, ...patch, kind: 'condition' } as SelectionNode
    })
}

export function removeSelectionNodesByIds(nodes: SelectionNode[], ids: string[]): SelectionNode[] {
    const toRemove = new Set(ids)

    const walk = (list: SelectionNode[]): SelectionNode[] =>
        list
            .filter((node) => !toRemove.has(node.id))
            .map((node) => {
                if (!isSelectionGroup(node)) return cloneSelectionNode(node)
                return { ...node, children: walk(node.children) }
            })

    return walk(nodes)
}

export function groupSelectionNodes(nodes: SelectionNode[], ids: string[], logic: SelectionGroupLogic = 'and'): SelectionNode[] {
    if (ids.length < 2) return nodes.map(cloneSelectionNode)

    const locations = ids
        .map((id) => findNodeLocation(nodes, id))
        .filter((loc): loc is NodeLocation => loc !== null)

    if (locations.length < 2) return nodes.map(cloneSelectionNode)

    const parentId = locations[0].parentId
    if (!locations.every((loc) => loc.parentId === parentId)) return nodes.map(cloneSelectionNode)

    const selected = new Set(ids)
    return updateChildrenAt(nodes, parentId, (children) => {
        const selectedNodes: SelectionNode[] = []
        const next: SelectionNode[] = []
        let insertAt = -1

        children.forEach((child, index) => {
            if (selected.has(child.id)) {
                if (insertAt < 0) insertAt = index
                selectedNodes.push(child)
            } else {
                next.push(child)
            }
        })

        if (selectedNodes.length < 2 || insertAt < 0) return children

        const group = createSelectionGroup(selectedNodes, logic)
        next.splice(Math.min(insertAt, next.length), 0, group)
        return next
    })
}

export function ungroupSelectionNodes(nodes: SelectionNode[], ids: string[]): SelectionNode[] {
    const toUngroup = new Set(ids)

    const walk = (list: SelectionNode[]): SelectionNode[] => {
        const result: SelectionNode[] = []
        for (const node of list) {
            if (isSelectionGroup(node) && toUngroup.has(node.id)) {
                result.push(...walk(node.children))
                continue
            }
            if (isSelectionGroup(node)) {
                result.push({ ...node, children: walk(node.children) })
                continue
            }
            result.push(cloneSelectionNode(node))
        }
        return result
    }

    return walk(nodes)
}

export function setSelectionGroupLogic(nodes: SelectionNode[], groupId: string, logic: SelectionGroupLogic): SelectionNode[] {
    return updateSelectionNodeById(nodes, groupId, { logic } as Partial<SelectionNode>)
}

export function moveSelectionNodes(nodes: SelectionNode[], ids: string[], direction: 'up' | 'down'): SelectionNode[] {
    const selected = new Set(ids)
    if (selected.size === 0) return nodes.map(cloneSelectionNode)

    const locations = ids
        .map((id) => findNodeLocation(nodes, id))
        .filter((loc): loc is NodeLocation => loc !== null)

    if (locations.length === 0) return nodes.map(cloneSelectionNode)

    const parentId = locations[0].parentId
    if (!locations.every((loc) => loc.parentId === parentId)) return nodes.map(cloneSelectionNode)

    return updateChildrenAt(nodes, parentId, (children) => {
        const list = children.map(cloneSelectionNode)

        if (direction === 'up') {
            if (list.length > 0 && selected.has(list[0].id)) return list
            for (let i = 1; i < list.length; i += 1) {
                if (selected.has(list[i].id) && !selected.has(list[i - 1].id)) {
                    [list[i - 1], list[i]] = [list[i], list[i - 1]]
                }
            }
        } else {
            if (list.length > 0 && selected.has(list[list.length - 1].id)) return list
            for (let i = list.length - 2; i >= 0; i -= 1) {
                if (selected.has(list[i].id) && !selected.has(list[i + 1].id)) {
                    [list[i], list[i + 1]] = [list[i + 1], list[i]]
                }
            }
        }

        return list
    })
}

export function canGroupSelectionNodes(nodes: SelectionNode[], ids: string[]): boolean {
    if (ids.length < 2) return false
    const locations = ids
        .map((id) => findNodeLocation(nodes, id))
        .filter((loc): loc is NodeLocation => loc !== null)
    if (locations.length < 2) return false
    const parentId = locations[0].parentId
    return locations.every((loc) => loc.parentId === parentId)
}

export function canUngroupSelectionNodes(nodes: SelectionNode[], ids: string[]): boolean {
    return ids.some((id) => {
        const loc = findNodeLocation(nodes, id)
        return loc !== null && isSelectionGroup(loc.node)
    })
}
