/**
 * Tests for column grouping apply (facets/columnGrouping/apply.ts)
 *
 * Тестируют: применение дерева «Группировки столбцов» к колонкам списка
 * (порядок, скрытие, групповые заголовки, проброс настроек внешнего вида ячеек).
 */

import {
    applyColumnGroupingToCols,
    flattenGroupedColumns,
} from '../../../../../helpers/listSettings/facets/columnGrouping/apply';
import type { ColumnGroupingSettingsState } from '../../../../../helpers/listSettings/facets/columnGrouping/types';
import type { IDataColumn } from '../../../ElementsList/types';

const cols: IDataColumn[] = ['id', 'name', 'price', 'date'].map((field) => ({
    field,
    type: 'string',
    name: field,
    description: field,
    len: 20,
    show: true,
}));

function node(
    id: string,
    kind: 'group' | 'column',
    children: ColumnGroupingSettingsState['root']['children'] = [],
    title?: string,
    appearance: { width?: number; height?: number; flexGrow?: boolean } = {},
    enabled?: boolean,
) {
    if (kind === 'column') {
        return { id: `col_${id}`, kind: 'column' as const, fieldId: id, children: [], ...appearance, enabled };
    }
    return { id, kind: 'group' as const, title, children, enabled };
}

function stateFrom(children: ColumnGroupingSettingsState['root']['children']): ColumnGroupingSettingsState {
    return {
        root: { id: 'root', kind: 'root', title: 'Список столбцов', children },
    };
}

describe('applyColumnGroupingToCols', () => {
    it('should return original cols when tree is empty', () => {
        const state = stateFrom([]);
        expect(applyColumnGroupingToCols(cols, state)).toEqual(cols);
    });

    it('should order columns according to the tree', () => {
        const state = stateFrom([node('name', 'column'), node('date', 'column'), node('id', 'column')]);
        const result = applyColumnGroupingToCols(cols, state);
        expect(
            result.map((entry) => {
                if (Array.isArray(entry)) return (entry[0] as IDataColumn).field;
                return (entry as IDataColumn).field;
            }),
        ).toEqual(['name', 'date', 'id']);
    });

    it('should hide columns not present in the tree', () => {
        const state = stateFrom([node('name', 'column'), node('id', 'column')]);
        const result = applyColumnGroupingToCols(cols, state);
        const fields = flattenGroupedColumns(result).map((col) => col.field);
        expect(fields).toEqual(['name', 'id']);
    });

    it('should group top-level group children into nested arrays', () => {
        const state = stateFrom([
            node('group1', 'group', [node('name', 'column'), node('date', 'column')], 'Основные'),
            node('price', 'column'),
        ]);
        const result = applyColumnGroupingToCols(cols, state);
        expect(result).toHaveLength(2);
        expect(Array.isArray(result[0])).toBe(true);
        expect((result[0] as IDataColumn[]).map((col) => col.field)).toEqual(['name', 'date']);
        expect(result[1]).toEqual(cols.find((c) => c.field === 'price'));
    });

    it('should carry the parent group title on a top-level group', () => {
        const state = stateFrom([node('group1', 'group', [node('name', 'column'), node('date', 'column')], 'Основные')]);
        const result = applyColumnGroupingToCols(cols, state);
        const group = result[0] as IDataColumn[] & { title?: string };
        expect(group.title).toBe('Основные');
    });

    it('should preserve nested group titles', () => {
        const state = stateFrom([
            node(
                'group1',
                'group',
                [node('group2', 'group', [node('name', 'column'), node('date', 'column')], 'Под')],
                'Основные',
            ),
        ]);
        const result = applyColumnGroupingToCols(cols, state);
        const group = result[0] as (IDataColumn | (IDataColumn[] & { title?: string }))[] & { title?: string };
        expect(group.title).toBe('Основные');
    });

    it('should preserve nested group structure (not flatten)', () => {
        const state = stateFrom([
            node(
                'group1',
                'group',
                [node('group2', 'group', [node('name', 'column'), node('date', 'column')], 'Под')],
                'Основные',
            ),
        ]);
        const result = applyColumnGroupingToCols(cols, state);
        expect(result).toHaveLength(1);
        const group = result[0] as (IDataColumn | (IDataColumn[] & { title?: string }))[] & { title?: string };
        expect(group.title).toBe('Основные');
        // Вложенная группа должна быть массивом внутри parent group
        const nestedGroup = group[0] as IDataColumn[] & { title?: string };
        expect(Array.isArray(nestedGroup)).toBe(true);
        expect(nestedGroup.title).toBe('Под');
        expect(nestedGroup.map((col) => col.field)).toEqual(['name', 'date']);
    });

    it('should support mixed columns and nested groups', () => {
        const state = stateFrom([
            node(
                'group1',
                'group',
                [node('group2', 'group', [node('name', 'column')], 'Вложенная'), node('price', 'column')],
                'Основные',
            ),
        ]);
        const result = applyColumnGroupingToCols(cols, state);
        expect(result).toHaveLength(1);
        const group = result[0] as (IDataColumn | (IDataColumn[] & { title?: string }))[] & { title?: string };
        expect(group.title).toBe('Основные');
        expect(group).toHaveLength(2);
        // Первый элемент — вложенная группа
        expect(Array.isArray(group[0])).toBe(true);
        expect((group[0] as IDataColumn[] & { title?: string }).title).toBe('Вложенная');
        expect((group[0] as IDataColumn[]).map((col) => col.field)).toEqual(['name']);
        // Второй элемент — обычная колонка
        expect(Array.isArray(group[1])).toBe(false);
        expect((group[1] as IDataColumn).field).toBe('price');
    });

    it('should not duplicate a column referenced twice', () => {
        const state = stateFrom([node('name', 'column'), node('name', 'column')]);
        const result = applyColumnGroupingToCols(cols, state);
        expect(result).toHaveLength(1);
    });

    it('should carry cell appearance on a single column', () => {
        const state = stateFrom([node('name', 'column', [], undefined, { width: 220, height: 40, flexGrow: true })]);
        const result = applyColumnGroupingToCols(cols, state);
        const col = result[0] as IDataColumn;
        expect(col.cellWidth).toBe(220);
        expect(col.cellHeight).toBe(40);
        expect(col.cellFlexGrow).toBe(true);
    });

    it('should hide a top-level disabled column', () => {
        const state = stateFrom([node('name', 'column', [], undefined, {}, false), node('date', 'column')]);
        const result = applyColumnGroupingToCols(cols, state);
        const fields = flattenGroupedColumns(result).map((col) => col.field);
        expect(fields).toEqual(['date']);
    });

    it('should exclude disabled columns from a group', () => {
        const state = stateFrom([
            node(
                'group1',
                'group',
                [node('name', 'column', [], undefined, {}, false), node('date', 'column')],
                'Основные',
            ),
        ]);
        const result = applyColumnGroupingToCols(cols, state);
        expect(result).toHaveLength(1);
        const group = result[0] as IDataColumn[];
        expect(group.map((col) => col.field)).toEqual(['date']);
    });

    it('should drop a group whose columns are all disabled', () => {
        const state = stateFrom([
            node('group1', 'group', [node('name', 'column', [], undefined, {}, false)], 'Основные'),
            node('price', 'column'),
        ]);
        const result = applyColumnGroupingToCols(cols, state);
        const fields = flattenGroupedColumns(result).map((col) => col.field);
        expect(fields).toEqual(['price']);
    });

    it('should carry cell appearance on the leaves of a grouped column', () => {
        const state = stateFrom([
            node(
                'group1',
                'group',
                [
                    node('name', 'column', [], undefined, { width: 160, height: 48 }),
                    node('date', 'column', [], undefined, { width: 240, height: 32 }),
                ],
                'Основные',
            ),
        ]);
        const result = applyColumnGroupingToCols(cols, state);
        const group = result[0] as IDataColumn[];
        const name = group[0] as IDataColumn;
        const date = group[1] as IDataColumn;
        expect(name.field).toBe('name');
        expect(name.cellWidth).toBe(160);
        expect(name.cellHeight).toBe(48);
        expect(date.cellWidth).toBe(240);
        expect(date.cellHeight).toBe(32);
    });
});

describe('flattenGroupedColumns', () => {
    it('should flatten groups preserving order', () => {
        const grouped = applyColumnGroupingToCols(
            cols,
            stateFrom([node('g', 'group', [node('name', 'column'), node('date', 'column')]), node('id', 'column')]),
        );
        expect(flattenGroupedColumns(grouped).map((c) => c.field)).toEqual(['name', 'date', 'id']);
    });
});
