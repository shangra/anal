/**
 * Tests for column grouping store (facets/columnGrouping/store.ts)
 *
 * Тестируют: columnGroupingSettingsActions — create/rename/remove groups, add/remove columns,
 * moveNodes (валидация циклов/дублей/корня), reorderNodes, flat-проекция
 */

import {
    columnGroupingSettingsActions,
    getColumnGroupingSettingsState,
    getFlatColumnGroupRows,
    getUsedColumnFieldIds,
    cloneColumnGroupingSettingsState,
    getColumnGroupingCatalog,
    setColumnGroupingCatalog,
} from '../../../../../helpers/listSettings/facets/columnGrouping/store';
import {
    emptyColumnGroupingSettingsState,
    type ColumnGroupingSettingsState,
} from '../../../../../helpers/listSettings/facets/columnGrouping/types';
import { sortSettingsActions } from '../../../../../helpers/listSettings/facets/sort/store';
import type { GroupingFieldTreeNode } from '../ListSettingsModal/shared/types';

function reset(): void {
    columnGroupingSettingsActions.restoreSnapshot(emptyColumnGroupingSettingsState());
    setColumnGroupingCatalog([]);
    sortSettingsActions.setAvailableFields([]);
}

function getState(): ColumnGroupingSettingsState {
    return getColumnGroupingSettingsState();
}

describe('columnGrouping store', () => {
    beforeEach(() => {
        reset();
    });

    describe('createGroup / renameGroup', () => {
        it('should create a group inside root', () => {
            const groupId = columnGroupingSettingsActions.createGroup('root', 'Финансы');
            const state = getState();

            expect(groupId).not.toBe('');
            expect(state.root.children).toHaveLength(1);
            expect(state.root.children[0].kind).toBe('group');
            expect(state.root.children[0].title).toBe('Финансы');
        });

        it('should create a group inside a nested group', () => {
            const parentId = columnGroupingSettingsActions.createGroup('root', 'Основное');
            const childId = columnGroupingSettingsActions.createGroup(parentId, 'Подгруппа');

            const state = getState();
            const parent = state.root.children.find((node) => node.id === parentId);
            expect(parent?.children).toHaveLength(1);
            expect(parent?.children[0].id).toBe(childId);
        });

        it('should rename a group', () => {
            const groupId = columnGroupingSettingsActions.createGroup('root', 'Старое');
            columnGroupingSettingsActions.renameGroup(groupId, 'Новое');

            const state = getState();
            expect(state.root.children[0].title).toBe('Новое');
        });

        it('should ignore rename of a column', () => {
            columnGroupingSettingsActions.addColumns('root', ['field1']);
            const state = getState();
            const columnId = state.root.children[0].id;

            columnGroupingSettingsActions.renameGroup(columnId, 'X');
            expect(getState().root.children[0].title).toBeUndefined();
        });
    });

    describe('addColumns / removeColumns', () => {
        it('should add columns to root', () => {
            columnGroupingSettingsActions.addColumns('root', ['a', 'b', 'c']);

            expect(getState().root.children).toHaveLength(3);
            expect(getUsedColumnFieldIds()).toEqual(['a', 'b', 'c']);
        });

        it('should filter already used fieldIds', () => {
            columnGroupingSettingsActions.addColumns('root', ['a', 'b']);
            columnGroupingSettingsActions.addColumns('root', ['b', 'c']);

            const state = getState();
            expect(state.root.children).toHaveLength(3);
            expect(state.root.children.map((node) => node.fieldId)).toEqual(['a', 'b', 'c']);
        });

        it('should add a column to a nested group at given index', () => {
            const groupId = columnGroupingSettingsActions.createGroup('root', 'G');
            columnGroupingSettingsActions.addColumns('root', ['a']);
            columnGroupingSettingsActions.addColumns(groupId, ['b', 'c'], 0);

            const state = getState();
            const group = state.root.children.find((node) => node.id === groupId)!;
            expect(group.children.map((node) => node.fieldId)).toEqual(['b', 'c']);
        });

        it('should not add a column to a column target', () => {
            columnGroupingSettingsActions.addColumns('root', ['a']);
            const state = getState();
            const columnId = state.root.children[0].id;

            columnGroupingSettingsActions.addColumns(columnId, ['x']);
            expect(getUsedColumnFieldIds()).toEqual(['a']);
        });

        it('should remove a column by fieldId', () => {
            columnGroupingSettingsActions.addColumns('root', ['a', 'b']);
            columnGroupingSettingsActions.removeColumns(['a']);

            expect(getUsedColumnFieldIds()).toEqual(['b']);
        });
    });

    describe('removeGroups (children lift)', () => {
        it('should remove a group and lift its children to the parent', () => {
            const groupId = columnGroupingSettingsActions.createGroup('root', 'G');
            columnGroupingSettingsActions.addColumns(groupId, ['a', 'b']);

            columnGroupingSettingsActions.removeGroups([groupId]);

            const state = getState();
            expect(state.root.children.some((node) => node.id === groupId)).toBe(false);
            expect(state.root.children.map((node) => node.fieldId)).toEqual(['a', 'b']);
        });

        it('should keep a nested non-removed group intact', () => {
            const outer = columnGroupingSettingsActions.createGroup('root', 'Внешняя');
            const inner = columnGroupingSettingsActions.createGroup(outer, 'Внутренняя');
            columnGroupingSettingsActions.addColumns(inner, ['a']);

            columnGroupingSettingsActions.removeGroups([outer]);

            const state = getState();
            expect(state.root.children.some((node) => node.id === outer)).toBe(false);
            const liftedInner = state.root.children.find((node) => node.id === inner);
            expect(liftedInner).toBeDefined();
            expect(liftedInner?.children.map((node) => node.fieldId)).toEqual(['a']);
        });
    });

    describe('moveNodes', () => {
        it('should move a column into a group', () => {
            columnGroupingSettingsActions.addColumns('root', ['a']);
            const state0 = getState();
            const columnId = state0.root.children[0].id;
            const groupId = columnGroupingSettingsActions.createGroup('root', 'G');

            columnGroupingSettingsActions.moveNodes([columnId], groupId, 0);

            const state = getState();
            const group = state.root.children.find((node) => node.id === groupId)!;
            expect(group.children.map((node) => node.fieldId)).toEqual(['a']);
            expect(getUsedColumnFieldIds()).toEqual(['a']);
        });

        it('should reorder siblings when moving between parents', () => {
            columnGroupingSettingsActions.addColumns('root', ['a', 'b']);
            const state0 = getState();
            const idA = state0.root.children.find((node) => node.fieldId === 'a')!.id;

            columnGroupingSettingsActions.moveNodes([idA], 'root', 1);

            const state = getState();
            expect(state.root.children.map((node) => node.fieldId)).toEqual(['b', 'a']);
        });

        it('should reject moving root', () => {
            const before = cloneColumnGroupingSettingsState(getState());
            columnGroupingSettingsActions.moveNodes(['root'], 'root', 0);
            expect(getState().root.children).toHaveLength(before.root.children.length);
        });

        it('should reject moving a node into its own descendant (cycle)', () => {
            const outer = columnGroupingSettingsActions.createGroup('root', 'Внешняя');
            const inner = columnGroupingSettingsActions.createGroup(outer, 'Внутренняя');

            // перемещение внешней внутрь её потомка запрещено
            columnGroupingSettingsActions.moveNodes([outer], inner, 0);

            const state = getState();
            const outerNode = state.root.children.find((node) => node.id === outer)!;
            const innerNode = outerNode.children.find((node) => node.id === inner)!;
            expect(innerNode.children).toHaveLength(0);
        });

        it('should reject moving a group into itself', () => {
            const group = columnGroupingSettingsActions.createGroup('root', 'G');

            columnGroupingSettingsActions.moveNodes([group], group, 0);

            const state = getState();
            const groupNode = state.root.children.find((node) => node.id === group)!;
            expect(groupNode.children).toHaveLength(0);
        });

        it('should reject moving into a column target', () => {
            columnGroupingSettingsActions.addColumns('root', ['a']);
            const state0 = getState();
            const columnId = state0.root.children[0].id;
            const groupId = columnGroupingSettingsActions.createGroup('root', 'G');

            columnGroupingSettingsActions.moveNodes([groupId], columnId, 0);

            const state = getState();
            // группа осталась в корне
            expect(state.root.children.some((node) => node.id === groupId)).toBe(true);
        });
    });

    describe('reorderNodes', () => {
        it('should reorder siblings within the same parent', () => {
            columnGroupingSettingsActions.addColumns('root', ['a', 'b', 'c']);
            const state0 = getState();
            const idC = state0.root.children.find((node) => node.fieldId === 'c')!.id;

            columnGroupingSettingsActions.reorderNodes('root', [idC], 0);

            const state = getState();
            expect(state.root.children.map((node) => node.fieldId)).toEqual(['c', 'a', 'b']);
        });

        it('should move a single node down (swap with next sibling)', () => {
            columnGroupingSettingsActions.addColumns('root', ['a', 'b', 'c', 'd']);
            const idB = getState().root.children.find((node) => node.fieldId === 'b')!.id;

            // Переносим «b» (итоговый индекс первого узла = 2).
            columnGroupingSettingsActions.reorderNodes('root', [idB], 2);

            expect(getState().root.children.map((node) => node.fieldId)).toEqual(['a', 'c', 'b', 'd']);
        });

        it('should move a contiguous block down past the next sibling', () => {
            columnGroupingSettingsActions.addColumns('root', ['a', 'b', 'c', 'd']);
            const state0 = getState();
            const ids = ['b', 'c'].map((f) => state0.root.children.find((node) => node.fieldId === f)!.id);

            // Блок [b, c] двигаем вниз: итоговый индекс первого узла = 2.
            columnGroupingSettingsActions.reorderNodes('root', ids, 2);

            expect(getState().root.children.map((node) => node.fieldId)).toEqual(['a', 'd', 'b', 'c']);
        });

        it('should move a contiguous block up', () => {
            columnGroupingSettingsActions.addColumns('root', ['a', 'b', 'c', 'd']);
            const state0 = getState();
            const ids = ['b', 'c'].map((f) => state0.root.children.find((node) => node.fieldId === f)!.id);

            // Блок [b, c] двигаем вверх: итоговый индекс первого узла = 0.
            columnGroupingSettingsActions.reorderNodes('root', ids, 0);

            expect(getState().root.children.map((node) => node.fieldId)).toEqual(['b', 'c', 'a', 'd']);
        });
    });

    describe('restoreSnapshot', () => {
        it('should restore state from a snapshot', () => {
            columnGroupingSettingsActions.addColumns('root', ['a']);
            const snapshot = cloneColumnGroupingSettingsState(getState());

            columnGroupingSettingsActions.addColumns('root', ['b']);
            columnGroupingSettingsActions.restoreSnapshot(snapshot);

            expect(getUsedColumnFieldIds()).toEqual(['a']);
        });
    });

    describe('getFlatColumnGroupRows', () => {
        it('should project the tree depth-first including root', () => {
            const groupId = columnGroupingSettingsActions.createGroup('root', 'G');
            columnGroupingSettingsActions.addColumns(groupId, ['a']);
            columnGroupingSettingsActions.addColumns('root', ['b']);

            const expanded = new Set(['root', groupId]);
            const rows = getFlatColumnGroupRows(expanded);

            expect(rows.map((row) => row.nodeId)).toEqual(['root', groupId, `col_a`, `col_b`]);
            expect(rows[0].depth).toBe(0);
            expect(rows[2].depth).toBe(2);
            expect(rows[3].parentId).toBe('root');
        });

        it('should hide children of collapsed groups', () => {
            const groupId = columnGroupingSettingsActions.createGroup('root', 'G');
            columnGroupingSettingsActions.addColumns(groupId, ['a']);

            const rows = getFlatColumnGroupRows(new Set(['root']));
            const ids = rows.map((row) => row.nodeId);
            expect(ids).toContain(groupId);
            expect(ids).not.toContain('col_a');
        });
    });

    describe('column catalog', () => {
        it('should return the empty catalog by default', () => {
            expect(getColumnGroupingCatalog()).toEqual([]);
        });

        it('should return catalog set from ElementList columns', () => {
            const columns: GroupingFieldTreeNode[] = [
                {
                    id: 'name',
                    label: 'Название',
                    value: 'name',
                    isGroupLevel: false,
                    children: [],
                    rawType: 'string',
                },
                {
                    id: 'price',
                    label: 'Цена',
                    value: 'price',
                    isGroupLevel: false,
                    children: [],
                    rawType: 'number',
                },
            ];
            setColumnGroupingCatalog(columns);

            expect(getColumnGroupingCatalog()).toHaveLength(2);
            expect(getColumnGroupingCatalog()[0].label).toBe('Название');
        });

        it('should ignore non-array catalog values', () => {
            setColumnGroupingCatalog([{ id: 'a', label: 'A', value: 'a', isGroupLevel: false, children: [] }]);
            setColumnGroupingCatalog(null as unknown as GroupingFieldTreeNode[]);
            expect(getColumnGroupingCatalog()).toEqual([]);
        });

        it('should fall back to sort availableFields when ElementList catalog is empty', () => {
            const sortFields: GroupingFieldTreeNode[] = [
                { id: 'name', label: 'Название', value: 'name', isGroupLevel: false, children: [] },
                { id: 'price', label: 'Цена', value: 'price', isGroupLevel: false, children: [] },
            ];
            sortSettingsActions.setAvailableFields(sortFields);

            // каталог ElementList пуст → берём поля сортировки (по образцу SortingTab)
            expect(getColumnGroupingCatalog()).toHaveLength(2);
        });
    });

    describe('seedColumnsFromCatalog', () => {
        it('should populate the root with catalog columns when empty', () => {
            setColumnGroupingCatalog([
                { id: 'a', label: 'A', value: 'a', isGroupLevel: false, children: [] },
                { id: 'b', label: 'B', value: 'b', isGroupLevel: false, children: [] },
                { id: 'c', label: 'C', value: 'c', isGroupLevel: false, children: [] },
            ]);

            columnGroupingSettingsActions.seedColumnsFromCatalog();

            expect(getUsedColumnFieldIds()).toEqual(['a', 'b', 'c']);
            expect(getState().root.children).toHaveLength(3);
        });

        it('should skip group-level catalog entries and used fields', () => {
            setColumnGroupingCatalog([
                { id: 'grp', label: 'Группа', value: 'grp', isGroupLevel: true, children: [] },
                { id: 'a', label: 'A', value: 'a', isGroupLevel: false, children: [] },
            ]);
            columnGroupingSettingsActions.addColumns('root', ['a']);

            columnGroupingSettingsActions.seedColumnsFromCatalog();

            // 'a' уже использована, 'grp' — группа: не добавляются
            expect(getState().root.children).toHaveLength(1);
            expect(getUsedColumnFieldIds()).toEqual(['a']);
        });

        it('should not overwrite an existing non-empty tree structure', () => {
            setColumnGroupingCatalog([{ id: 'a', label: 'A', value: 'a', isGroupLevel: false, children: [] }]);
            const groupId = columnGroupingSettingsActions.createGroup('root', 'G');
            columnGroupingSettingsActions.addColumns(groupId, ['x']);

            columnGroupingSettingsActions.seedColumnsFromCatalog();

            const state = getState();
            expect(state.root.children.some((node) => node.id === groupId)).toBe(true);
            expect(getUsedColumnFieldIds()).toEqual(['x']);
        });
    });

    describe('setColumnCellSettings', () => {
        function addTwoColumns(): string[] {
            columnGroupingSettingsActions.addColumns('root', ['a', 'b']);
            return getState().root.children.map((node) => node.id);
        }

        it('should apply appearance patch to the selected columns only', () => {
            const [idA, idB] = addTwoColumns();

            columnGroupingSettingsActions.setColumnCellSettings([idA], { width: 120, flexGrow: true });
            columnGroupingSettingsActions.setColumnCellSettings([idA, idB], { height: 40 });

            const [a, b] = getState().root.children;
            expect(a.width).toBe(120);
            expect(a.flexGrow).toBe(true);
            expect(a.height).toBe(40);
            // idB не был в первом патче — ширина/растягивание не должны примениться
            expect(b.width).toBeUndefined();
            expect(b.flexGrow).toBeUndefined();
            expect(b.height).toBe(40);
        });

        it('should clear a value when set to undefined', () => {
            const [idA] = addTwoColumns();
            columnGroupingSettingsActions.setColumnCellSettings([idA], { width: 100 });
            columnGroupingSettingsActions.setColumnCellSettings([idA], { width: undefined });

            expect(getState().root.children[0].width).toBeUndefined();
        });

        it('should ignore unknown/root ids and never touch groups', () => {
            columnGroupingSettingsActions.addColumns('root', ['a']);
            const groupId = columnGroupingSettingsActions.createGroup('root', 'G');
            const state = getState();
            const columnId = state.root.children.find((node) => node.kind === 'column')!.id;

            columnGroupingSettingsActions.setColumnCellSettings([groupId, 'root', 'nope'], { width: 999 });

            const after = getState().root.children.find((node) => node.id === columnId);
            expect(after?.width).toBeUndefined();
            const group = getState().root.children.find((node) => node.id === groupId);
            expectGroupAppearanceEmpty(group);
        });
    });

    describe('appearance persistence (clone/parse)', () => {
        it('cloneColumnGroupingSettingsState must preserve cell appearance', () => {
            columnGroupingSettingsActions.addColumns('root', ['a']);
            const [columnNode] = getState().root.children;
            columnGroupingSettingsActions.setColumnCellSettings([columnNode.id], {
                width: 150,
                flexGrow: true,
                height: 50,
                expandVertical: true,
            });

            const cloned = cloneColumnGroupingSettingsState(getState());
            const column = cloned.root.children[0];
            expect(column.width).toBe(150);
            expect(column.flexGrow).toBe(true);
            expect(column.height).toBe(50);
            expect(column.expandVertical).toBe(true);
        });
    });
});

function expectGroupAppearanceEmpty(node: unknown): void {
    const g = node as { width?: unknown; flexGrow?: unknown; height?: unknown; expandVertical?: unknown };
    expect(g.width).toBeUndefined();
    expect(g.flexGrow).toBeUndefined();
    expect(g.height).toBeUndefined();
    expect(g.expandVertical).toBeUndefined();
}
