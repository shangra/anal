import { resolveListSettingsScope, noteListSettingsWrite } from '../../core/activeScope';
import { createFacetStore } from '../../core/createFacetStore';
import { getSortSettingsState } from '../sort/store';
import type { GroupingFieldTreeNode } from '../../../../components/MetadataForms/Buttons/Group/ListSettingsModal/shared/types';
import {
    cloneColumnGroupingSettingsState,
    createColumnGroupId,
    createColumnNode,
    emptyColumnGroupingSettingsState,
    parseColumnGroupingSettingsState,
    ROOT_GROUP_ID,
    type ColumnCellAppearance,
    type ColumnGroupingSettingsState,
    type ColumnGroupFlatRow,
    type ColumnGroupOrientation,
} from './types';
import {
    buildColumnNodeIndex,
    collectColumnFieldIds,
    detachColumnNodes,
    findColumnNode,
    getFlatDragRows,
    isAncestorOf,
    liftColumnGroups,
    removeColumnNodesByFieldIds,
    renameColumnGroup,
    updateColumnAppearance,
    updateColumnChildren,
    updateColumnEnabled,
    updateColumnGroupOrientation,
} from './tree';

const store = createFacetStore<ColumnGroupingSettingsState>({
    id: 'columnGrouping',
    storageKey: 'list-settings-column-grouping',
    keys: ['root'],
    empty: emptyColumnGroupingSettingsState,
    parse: parseColumnGroupingSettingsState,
    clone: cloneColumnGroupingSettingsState,
});

export function getColumnGroupingSettingsState(scope?: string): ColumnGroupingSettingsState {
    return store.getState(scope);
}

// Каталог колонок свой у каждой таблицы: иначе «Добавить колонку» подмешивает чужой список.
const columnCatalogs = new Map<string, GroupingFieldTreeNode[]>();

function effectiveColumnCatalog(scope?: string): GroupingFieldTreeNode[] {
    const key = resolveListSettingsScope(scope);
    const catalog = columnCatalogs.get(key) ?? [];
    return catalog.length > 0 ? catalog : getSortSettingsState(key).availableFields;
}

export function setColumnGroupingCatalog(fields: GroupingFieldTreeNode[]): void {
    columnCatalogs.set(resolveListSettingsScope(), Array.isArray(fields) ? fields : []);
    noteListSettingsWrite();
}

export function getColumnGroupingCatalog(scope?: string): GroupingFieldTreeNode[] {
    return effectiveColumnCatalog(scope);
}

export { cloneColumnGroupingSettingsState };

export function getUsedColumnFieldIds(state?: ColumnGroupingSettingsState): string[] {
    const source = state ?? store.getState();
    return collectColumnFieldIds(source.root);
}

export function getFlatColumnGroupRows(
    expandedGroupIds: ReadonlySet<string>,
    state?: ColumnGroupingSettingsState,
): ColumnGroupFlatRow[] {
    const source = state ?? store.getState();
    return getFlatDragRows(source, expandedGroupIds);
}

function clampIndex(index: number, length: number): number {
    return Math.max(0, Math.min(index, length));
}

function columnLabel(fieldId: string): string | undefined {
    return effectiveColumnCatalog().find((column) => column.value === fieldId)?.label;
}

export const columnGroupingSettingsActions = {
    /**
     * Заполняет корень дерева всеми колонками из каталога ElementList,
     * если дерево ещё пустое (первое открытие / нет сохранённой структуры).
     * Существующая структура (сохранённые группы/колонки) не перезаписывается.
     */
    seedColumnsFromCatalog(): void {
        const state = store.getState();
        const catalog = effectiveColumnCatalog();
        if (state.root.children.length > 0) return;
        if (!Array.isArray(catalog) || catalog.length === 0) return;

        const used = new Set(collectColumnFieldIds(state.root));
        const cols = catalog
            .filter((column) => !column.isGroupLevel && column.value && !used.has(column.value))
            .map((column) => createColumnNode(column.value, column.label));
        if (cols.length === 0) return;

        store.commit({ root: { ...state.root, children: cols } });
    },

    createGroup(parentId: string, title?: string, index?: number): string {
        const state = store.getState();
        const target = findColumnNode(state.root, parentId);
        if (!target || target.kind === 'column') return '';

        const id = createColumnGroupId();
        const group = {
            id,
            kind: 'group' as const,
            title: title && title.trim() ? title.trim() : 'Новая группа',
            children: [],
        };
        const next = updateColumnChildren(state.root, target.id, (children) => {
            const nextChildren = [...children];
            nextChildren.splice(clampIndex(index ?? nextChildren.length, nextChildren.length), 0, group);
            return nextChildren;
        });
        store.commit({ root: next });
        return id;
    },

    renameGroup(groupId: string, title: string): void {
        const state = store.getState();
        const target = findColumnNode(state.root, groupId);
        if (!target || target.kind !== 'group') return;
        const nextTitle = title && title.trim() ? title.trim() : 'Группа';
        store.commit({ root: renameColumnGroup(state.root, groupId, nextTitle) });
    },

    /** Устанавливает направление группировки (горизонтальное/вертикальное) для групп. */
    setGroupOrientation(groupIds: string[], orientation: ColumnGroupOrientation): void {
        const state = store.getState();
        const ids = new Set(groupIds.filter((id) => id !== ROOT_GROUP_ID));
        if (ids.size === 0) return;
        store.commit({ root: updateColumnGroupOrientation(state.root, ids, orientation) });
    },

    /**
     * Обновляет настройки внешнего вида ячеек только для колонок из nodeIds.
     * Патч применяется по всем переданным колонкам.
     */
    setColumnCellSettings(nodeIds: string[], patch: Partial<ColumnCellAppearance>): void {
        const state = store.getState();
        const ids = new Set(nodeIds.filter((id) => id !== ROOT_GROUP_ID));
        if (ids.size === 0) return;
        store.commit({ root: updateColumnAppearance(state.root, ids, patch) });
    },

    removeGroups(groupIds: string[]): void {
        const state = store.getState();
        const next = liftColumnGroups(state.root, groupIds);
        store.commit({ root: next });
    },

    addColumns(parentId: string, fieldIds: string[], index?: number): void {
        if (fieldIds.length === 0) return;
        const state = store.getState();
        const target = findColumnNode(state.root, parentId);
        if (!target || target.kind === 'column') return;

        const used = new Set(collectColumnFieldIds(state.root));
        const toAdd = fieldIds.filter((fieldId) => fieldId && !used.has(fieldId));
        if (toAdd.length === 0) return;

        const next = updateColumnChildren(state.root, target.id, (children) => {
            const nextChildren = [...children];
            const insertAt = clampIndex(index ?? nextChildren.length, nextChildren.length);
            nextChildren.splice(insertAt, 0, ...toAdd.map((fieldId) => createColumnNode(fieldId, columnLabel(fieldId))));
            return nextChildren;
        });
        store.commit({ root: next });
    },

    removeColumns(fieldIds: string[]): void {
        if (fieldIds.length === 0) return;
        const state = store.getState();
        store.commit({ root: removeColumnNodesByFieldIds(state.root, fieldIds) });
    },

    /** Включает/выключает участие колонки или группы в дереве по её id. */
    toggleEnabled(nodeId: string, enabled: boolean): void {
        if (!nodeId || nodeId === ROOT_GROUP_ID) return;
        const state = store.getState();
        if (!findColumnNode(state.root, nodeId)) return;
        store.commit({ root: updateColumnEnabled(state.root, nodeId, enabled) });
    },

    moveNodes(nodeIds: string[], targetParentId: string, index?: number): void {
        const state = store.getState();
        const liveIndex = buildColumnNodeIndex(state.root);

        const nodes = nodeIds.filter((id) => id !== ROOT_GROUP_ID && liveIndex.has(id));
        if (nodes.length === 0) return;

        const target = findColumnNode(state.root, targetParentId);
        if (!target || target.kind === 'column') return;

        // Запрет циклов: ни один переносимый узел не должен быть предком цели.
        for (const id of nodes) {
            if (isAncestorOf(state.root, id, targetParentId)) return;
        }

        // Проверка дублирующихся fieldId при переносе колонок.
        const movedFieldIds = new Set(
            nodes
                .map((id) => liveIndex.get(id))
                .filter((node) => node && node.kind === 'column')
                .map((node) => node!.fieldId)
                .filter((fieldId): fieldId is string => Boolean(fieldId)),
        );
        if (movedFieldIds.size > 0) {
            const movingSet = new Set(nodes);
            for (const child of target.children) {
                if (child.kind === 'column' && child.fieldId && movedFieldIds.has(child.fieldId) && !movingSet.has(child.id)) {
                    return;
                }
            }
        }

        const { root: afterDetach, removed } = detachColumnNodes(state.root, nodes);
        if (removed.length === 0) return;

        const childLen = targetChildrenLength(afterDetach, target.id);
        const insertAt = clampIndex(index ?? childLen, childLen);
        const next = updateColumnChildren(afterDetach, target.id, (children) => {
            const nextChildren = [...children];
            nextChildren.splice(insertAt, 0, ...removed);
            return nextChildren;
        });
        store.commit({ root: next });
    },

    reorderNodes(parentId: string, nodeIds: string[], toIndex?: number): void {
        const state = store.getState();
        const target = findColumnNode(state.root, parentId);
        if (!target || target.kind === 'column') return;

        const set = new Set(nodeIds);
        const {children} = target;
        const moved = children.filter((child) => set.has(child.id));
        if (moved.length === 0) return;

        // toIndex трактуем как итоговый индекс первого переносимого узла в результирующем массиве:
        // вставляем блок в позицию после удаления переносимых узлов из оставшегося списка.
        const remaining = children.filter((child) => !set.has(child.id));
        const insertAt = clampIndex(toIndex ?? remaining.length, remaining.length);
        remaining.splice(insertAt, 0, ...moved);
        store.commit({ root: updateColumnChildren(state.root, target.id, () => remaining) });
    },

    restoreSnapshot(snapshot: ColumnGroupingSettingsState): void {
        store.restore(snapshot);
    },
};

function targetChildrenLength(root: import('./types').ColumnGroupNode, parentId: string): number {
    const target = findColumnNode(root, parentId);
    return target ? target.children.length : 0;
}
