import { NormalizedNode, TreeMap } from 'components/MetadataHier/types';
import {
    AccessGiveIcon,
    AttachmentIcon,
    AxisIcon,
    EditIcon,
    FolderIcon,
    IndicatorBarIcon,
    SettingWrenchIcon,
    type FlatTreeNode,
} from 'ui-kit';
import { getContextMenuActions } from 'components/MetadataHier/lib/getActions';

const icons = {
    folder: FolderIcon,
    wrench: SettingWrenchIcon,
    axis: AxisIcon,
    pencil: EditIcon,
    indexes: IndicatorBarIcon,
    keys: AccessGiveIcon,
    fkeys: AttachmentIcon,
};

const getIcon = (node: NormalizedNode, nodes: TreeMap) => {
    // Иконка с backend имеет приоритет; если backend не прислал распознанный
    // токен — используем прежнюю эвристику по depth/class/родителю без изменений.
    if (node.icon && node.icon in icons) {
        return icons[node.icon as keyof typeof icons];
    }

    if (node.depth === 1) return icons.folder;
    if (node.depth === 2) return icons.wrench;
    if (node.class === 'Fields') return icons.axis;
    if (node.class === 'Indexes') return icons.indexes;
    if (node.class === 'Keys') return icons.keys;
    if (node.class === 'ForeignKeys') return icons.fkeys;
    if (node.depth === 4 && nodes.get(node.parentId ?? '')?.name === 'Поля') return icons.pencil;
    return icons.folder;
};

function getSortedChildren(node: NormalizedNode, nodes: TreeMap): string[] {
    if (!node.sortOrder) return node.childrenIds;

    const direction = node.sortOrder === 'desc' ? -1 : 1;

    return [...node.childrenIds].sort((a, b) => {
        const nameA = nodes.get(a)?.name ?? '';
        const nameB = nodes.get(b)?.name ?? '';
        return nameA.localeCompare(nameB, 'ru') * direction;
    });
}

export function buildFlatFromMap(
    rootKey: string,
    nodes: TreeMap,
    expandedIds: Set<string>,
    selectedIds: Set<string>,
    server: string,
): FlatTreeNode[] {
    const result: FlatTreeNode[] = [];
    const walk = (nodeKey: string, level: number) => {
        const node = nodes.get(nodeKey);
        if (!node) return;
        const isExpanded = expandedIds.has(nodeKey);

        const sortedChildrenKeys = getSortedChildren(node, nodes);

        result.push({
            id: node.nodeKey,
            title: node.name,
            parentId: node.parentId,
            level,
            opened: isExpanded,
            icon: {
                icon: getIcon(node, nodes),
                color: 'secondary',
                size: 'medium',
            },
            contextMenuActions: getContextMenuActions(node, server),
            hasChildren: node.expandable,
            loading: node.isLoading,
            isSelected: selectedIds.has(node.nodeKey),
        });
        if (isExpanded) sortedChildrenKeys.forEach((c) => walk(c, level + 1));
    };
    walk(rootKey, -1);
    return result;
}

export function adaptSingleNode(
    node: NormalizedNode,
    nodes: TreeMap,
    server: string,
    expandedIds: Set<string> = new Set(),
    selectedIds: Set<string> = new Set(),
): FlatTreeNode {
    return {
        id: node.nodeKey,
        title: node.name,
        parentId: node.parentId,
        level: node.depth - 1,
        opened: expandedIds.has(node.nodeKey),
        contextMenuActions: getContextMenuActions(node, server),
        icon: {
            icon: getIcon(node, nodes),
            color: 'secondary',
            size: 'medium',
        },
        hasChildren: node.expandable,
        loading: node.isLoading,
        isSelected: selectedIds.has(node.nodeKey),
    };
}
