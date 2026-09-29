import {
    cloneColumnGroupNode,
    isColumnGroupNode,
    type ColumnCellAppearance,
    type ColumnGroupNode,
    type ColumnGroupingSettingsState,
    type ColumnGroupOrientation,
} from './types';

export function findColumnNode(root: ColumnGroupNode, id: string): ColumnGroupNode | null {
    if (root.id === id) return root;
    for (const child of root.children) {
        const found = findColumnNode(child, id);
        if (found) return found;
    }
    return null;
}

export function collectColumnNodeIds(root: ColumnGroupNode): string[] {
    const ids: string[] = [root.id];
    for (const child of root.children) {
        ids.push(...collectColumnNodeIds(child));
    }
    return ids;
}

/** Количество непосредственных детей узла (0, если узла нет). */
export function childrenCountOf(root: ColumnGroupNode, id: string): number {
    return findColumnNode(root, id)?.children.length ?? 0;
}

/** Индекс узла среди его братьев и сестёр (-1, если узел не найден или это корень). */
export function indexOfNodeById(root: ColumnGroupNode, id: string): number {
    const findIndex = (node: ColumnGroupNode): number => {
        for (let index = 0; index < node.children.length; index += 1) {
            const child = node.children[index];
            if (child.id === id) return index;
            const found = findIndex(child);
            if (found !== -1) return found;
        }
        return -1;
    };
    return findIndex(root);
}

export function collectColumnFieldIds(root: ColumnGroupNode): string[] {
    const fieldIds: string[] = [];
    for (const child of root.children) {
        if (child.kind === 'column') {
            if (child.fieldId) fieldIds.push(child.fieldId);
        } else {
            fieldIds.push(...collectColumnFieldIds(child));
        }
    }
    return fieldIds;
}

export function buildColumnNodeIndex(root: ColumnGroupNode): Map<string, ColumnGroupNode> {
    const index = new Map<string, ColumnGroupNode>();
    const walk = (node: ColumnGroupNode): void => {
        index.set(node.id, node);
        for (const child of node.children) walk(child);
    };
    walk(root);
    return index;
}

export function isAncestorOf(root: ColumnGroupNode, ancestorId: string, nodeId: string): boolean {
    if (ancestorId === nodeId) return true;
    const ancestor = findColumnNode(root, ancestorId);
    if (!ancestor || !isColumnGroupNode(ancestor)) return false;
    return findColumnNode(ancestor, nodeId) !== null;
}

export function updateColumnChildren(
    root: ColumnGroupNode,
    parentId: string,
    updater: (children: ColumnGroupNode[]) => ColumnGroupNode[],
): ColumnGroupNode {
    if (root.id === parentId) return { ...cloneColumnGroupNode(root), children: updater(root.children) };
    return {
        ...cloneColumnGroupNode(root),
        children: root.children.map((child) => {
            if (child.id === parentId) {
                return { ...cloneColumnGroupNode(child), children: updater(child.children) };
            }
            if (isColumnGroupNode(child)) {
                return updateColumnChildren(child, parentId, updater);
            }
            return cloneColumnGroupNode(child);
        }),
    };
}

/**
 * Удаляет узлы (и их поддеревья) из дерева. Удалённые узлы собираются в DFS-порядке.
 * Корень не может быть удалён.
 */
export function detachColumnNodes(
    root: ColumnGroupNode,
    ids: string[],
): { root: ColumnGroupNode; removed: ColumnGroupNode[] } {
    const toRemove = new Set(ids.filter((id) => id !== root.id));
    if (toRemove.size === 0) return { root: cloneColumnGroupNode(root), removed: [] };

    const removed: ColumnGroupNode[] = [];
    const walk = (node: ColumnGroupNode): ColumnGroupNode[] => {
        if (toRemove.has(node.id)) {
            removed.push(cloneColumnGroupNode(node));
            return [];
        }
        if (node.kind === 'column') return [cloneColumnGroupNode(node)];
        const children: ColumnGroupNode[] = [];
        for (const child of node.children) children.push(...walk(child));
        return [{ ...cloneColumnGroupNode(node), children }];
    };

    const rootChildren: ColumnGroupNode[] = [];
    for (const child of root.children) rootChildren.push(...walk(child));
    return { root: { ...cloneColumnGroupNode(root), children: rootChildren }, removed };
}

/**
 * Удаляет группы, поднимая их детей к родителю группы (место группы).
 * Дети, являющиеся группами, не входящими в `groupIds`, остаются группами со своими детьми.
 * Корень не может быть удалён.
 */
export function liftColumnGroups(root: ColumnGroupNode, groupIds: string[]): ColumnGroupNode {
    const toRemove = new Set(groupIds.filter((id) => id !== root.id));
    if (toRemove.size === 0) return cloneColumnGroupNode(root);

    const process = (node: ColumnGroupNode): ColumnGroupNode[] => {
        if (node.kind === 'column') {
            return toRemove.has(node.id) ? [] : [cloneColumnGroupNode(node)];
        }
        if (toRemove.has(node.id)) {
            const lifted: ColumnGroupNode[] = [];
            for (const child of node.children) lifted.push(...process(child));
            return lifted;
        }
        const children: ColumnGroupNode[] = [];
        for (const child of node.children) children.push(...process(child));
        return [{ ...cloneColumnGroupNode(node), children }];
    };

    const rootChildren: ColumnGroupNode[] = [];
    for (const child of root.children) rootChildren.push(...process(child));
    return { ...cloneColumnGroupNode(root), children: rootChildren };
}

/**
 * Удаляет только узлы-колонки по совпадающим fieldId.
 */
export function removeColumnNodesByFieldIds(root: ColumnGroupNode, fieldIds: string[]): ColumnGroupNode {
    const toRemove = new Set(fieldIds);
    const walk = (node: ColumnGroupNode): ColumnGroupNode[] => {
        if (node.kind === 'column') {
            return node.fieldId && toRemove.has(node.fieldId) ? [] : [cloneColumnGroupNode(node)];
        }
        const children: ColumnGroupNode[] = [];
        for (const child of node.children) children.push(...walk(child));
        return [{ ...cloneColumnGroupNode(node), children }];
    };
    const rootChildren: ColumnGroupNode[] = [];
    for (const child of root.children) rootChildren.push(...walk(child));
    return { ...cloneColumnGroupNode(root), children: rootChildren };
}

/** Переименовывает группу по id (на месте узла, без затрагивания детей). */
export function renameColumnGroup(root: ColumnGroupNode, groupId: string, title: string): ColumnGroupNode {
    const walk = (node: ColumnGroupNode): ColumnGroupNode => {
        if (node.id === groupId && node.kind === 'group') {
            return { ...cloneColumnGroupNode(node), title };
        }
        if (node.kind === 'column') return cloneColumnGroupNode(node);
        return { ...cloneColumnGroupNode(node), children: node.children.map(walk) };
    };
    return walk(root);
}

/** Устанавливает направление группировки для группы (горизонтальное/вертикальное). */
export function updateColumnGroupOrientation(
    root: ColumnGroupNode,
    groupIds: ReadonlySet<string>,
    orientation: ColumnGroupOrientation,
): ColumnGroupNode {
    const walk = (node: ColumnGroupNode): ColumnGroupNode => {
        if (node.kind === 'column') return cloneColumnGroupNode(node);
        const children = node.children.map(walk);
        if (node.kind === 'group' && groupIds.has(node.id)) {
            return { ...cloneColumnGroupNode(node), orientation, children };
        }
        return { ...cloneColumnGroupNode(node), children };
    };
    return walk(root);
}

/** Обновляет настройки внешнего вида ячеек только для указанных узлов-колонок. */
export function updateColumnAppearance(
    root: ColumnGroupNode,
    nodeIds: ReadonlySet<string>,
    patch: Partial<ColumnCellAppearance>,
): ColumnGroupNode {
    const walk = (node: ColumnGroupNode): ColumnGroupNode => {
        if (node.kind === 'column') {
            if (!nodeIds.has(node.id)) return cloneColumnGroupNode(node);
            const next = cloneColumnGroupNode(node);
            if ('width' in patch) next.width = patch.width;
            if ('flexGrow' in patch) next.flexGrow = patch.flexGrow;
            if ('height' in patch) next.height = patch.height;
            if ('expandVertical' in patch) next.expandVertical = patch.expandVertical;
            return next;
        }
        return { ...cloneColumnGroupNode(node), children: node.children.map(walk) };
    };
    return walk(root);
}

/** Переключает флаг участвия (enabled) узла по его id. Корень не переключается. */
export function updateColumnEnabled(root: ColumnGroupNode, nodeId: string, enabled: boolean): ColumnGroupNode {
    const walk = (node: ColumnGroupNode): ColumnGroupNode => {
        if (node.id === nodeId && node.kind !== 'root') {
            return { ...cloneColumnGroupNode(node), enabled };
        }
        if (node.kind === 'column') return cloneColumnGroupNode(node);
        return { ...cloneColumnGroupNode(node), children: node.children.map(walk) };
    };
    return walk(root);
}

export function getFlatDragRows(
    state: ColumnGroupingSettingsState,
    expandedGroupIds: ReadonlySet<string>,
): import('./types').ColumnGroupFlatRow[] {
    const rows: import('./types').ColumnGroupFlatRow[] = [];
    const walk = (node: ColumnGroupNode, depth: number, parentId: string | null, expandChildren: boolean): void => {
        rows.push({
            nodeId: node.id,
            parentId,
            kind: node.kind,
            depth,
            title: node.title ?? node.fieldId ?? node.id,
            fieldId: node.fieldId,
            hasChildren: node.kind !== 'column' && node.children.length > 0,
            orientation: node.orientation,
            enabled: node.kind === 'root' ? true : (node.enabled ?? true),
            width: node.width,
            flexGrow: node.flexGrow,
            height: node.height,
            expandVertical: node.expandVertical,
        });
        if (!expandChildren) return;
        for (const child of node.children) {
            const isExpanded = child.kind === 'column' || expandedGroupIds.has(child.id);
            walk(child, depth + 1, node.id, isExpanded);
        }
    };
    walk(state.root, 0, null, expandedGroupIds.has(state.root.id));
    return rows;
}
