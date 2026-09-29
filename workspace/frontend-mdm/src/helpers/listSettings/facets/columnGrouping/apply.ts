import type { IDataColumn } from '../../../../components/MetadataForms/ElementsList/types';
import { getColumnGroupingSettingsState } from './store';
import type { ColumnGroupingSettingsState, ColumnGroupNode, ColumnGroupOrientation } from './types';

/**
 * Рекурсивный тип для группировки колонок:
 * - одиночная колонка (IDataColumn)
 * - группа колонок (массив, который может содержать другие группы)
 *
 * Каждый массив-группа может нести свойство `title` для отображения заголовка
 * и `orientation` — направление группировки (вертикальная группа сворачивается
 * в одну колонку с ячейками в порядке иерархии).
 */
export interface IGroupedColumn extends Array<IGroupedColumn | IDataColumn> {
    title?: string;
    orientation?: ColumnGroupOrientation;
}

export type ColumnGroupEntry = IDataColumn | IGroupedColumn;

export type GroupedColumnsOutput = ColumnGroupEntry[];

/**
 * Приводит список колонок списка к структуре «Группировки столбцов»:
 * - колонки упорядочиваются согласно DFS-обходу дерева (root → группы → колонки);
 * - колонки, отсутствующие в дереве (скрытые/удалённые), исключаются;
 * - группы первого уровня превращаются во вложенные массивы колонок (для отрисовки
 *   групповых заголовков таблицы); вложенные группы объединяются со своим родителем.
 * На массиве группы первого уровня сохраняется название родительской группы (`title`),
 * по которому в шапке таблицы рисуется родительский столбец.
 * Если в дереве нет ни одной колонки (или фасет выключен), возвращаются исходные cols.
 */
export function applyColumnGroupingToCols(
    cols: IDataColumn[],
    state: ColumnGroupingSettingsState = getColumnGroupingSettingsState(),
): GroupedColumnsOutput {
    if (!Array.isArray(cols) || cols.length === 0) return cols;
    if (!state.root || state.root.children.length === 0) return cols;

    const byField = new Map<string, IDataColumn>();
    for (const col of cols) {
        if (col && col.field && !byField.has(col.field)) byField.set(col.field, col);
    }
    if (byField.size === 0) return cols;

    const usedFields = new Set<string>();
    const result: GroupedColumnsOutput = [];

    const collection = (node: ColumnGroupNode): IDataColumn | null => {
        if (node.kind !== 'column' || !node.fieldId) return null;
        // Выключенные через чекбокс колонки не участвуют в отображении таблицы.
        if (node.enabled === false) return null;
        const col = byField.get(node.fieldId);
        if (!col || usedFields.has(col.field)) return null;
        usedFields.add(col.field);
        // Переносим настройки внешнего вида ячеек из узла на колонку,
        // чтобы они дошли до рендера таблицы.
        return {
            ...col,
            cellWidth: node.width,
            cellFlexGrow: node.flexGrow,
            cellHeight: node.height,
            cellExpandVertical: node.expandVertical,
        };
    };

    /**
     * Рекурсивно преобразует узел дерева в ColumnGroupEntry.
     * - Для column: возвращает IDataColumn
     * - Для group: рекурсивно обрабатывает children и возвращает массив с title
     */
    const nodeToEntry = (node: ColumnGroupNode): ColumnGroupEntry | null => {
        if (node.kind === 'column') {
            return collection(node);
        }

        // group — рекурсивно обрабатываем children
        const children: (IDataColumn | IGroupedColumn)[] = [];
        for (const child of node.children) {
            const entry = nodeToEntry(child);
            if (entry) {
                children.push(entry);
            }
        }

        // Если группа выключена или все её дочерние колонки выключены — группу не показываем.
        if (node.enabled === false || children.length === 0) return null;

        // Создаем группу
        const groupEntry = children as IGroupedColumn;
        if (node.title && node.title.trim()) {
            groupEntry.title = node.title.trim();
        }
        if (node.orientation) {
            groupEntry.orientation = node.orientation;
        }
        return groupEntry;
    };

    for (const child of state.root.children) {
        if (child.kind === 'column') {
            const col = collection(child);
            if (col) result.push(col);
        } else if (child.kind === 'group') {
            const entry = nodeToEntry(child);
            if (entry) result.push(entry);
        }
    }

    return result;
}

/**
 * Рекурсивно разворачивает вложенные группы в плоский список видимых `IDataColumn`
 * (порядок сохранён) — для пайплайнов, не поддерживающих групповые заголовки.
 */
function flattenEntry(entry: ColumnGroupEntry): IDataColumn[] {
    if (Array.isArray(entry)) {
        const flat: IDataColumn[] = [];
        for (const child of entry) {
            flat.push(...flattenEntry(child));
        }
        return flat;
    }
    return [entry];
}

export function flattenGroupedColumns(grouped: GroupedColumnsOutput): IDataColumn[] {
    const flat: IDataColumn[] = [];
    for (const entry of grouped) {
        flat.push(...flattenEntry(entry));
    }
    return flat;
}
