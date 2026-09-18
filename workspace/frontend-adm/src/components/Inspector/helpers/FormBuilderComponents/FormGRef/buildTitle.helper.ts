import $api from 'helpers/axios';
import { RawChildNode } from 'components/MetadataHier/types';
import { buildUrl } from 'helpers/buildUrl';
import { FormGRefMetadataLink } from 'components/Inspector/helpers/FormBuilderComponents/FormGRef/types';

/**
 * Заголовки групп нельзя взять напрямую из ответа /metadata/link: поле class содержит
 * техническое имя класса, а не человекочитаемое имя узла, как оно отображается в дереве
 * метаданных. Прямой запрос объекта по id не позволяет получить узел метаданных
 * с loadingStrategy = "eager", поэтому повторяем путь дерева:
 *   1) находим в /metadata/link первый элемент с нужным class_id;
 *   2) запрашиваем ветку дерева /metadata/v3/tree/<owner_id этого элемента>
 *      (если задан parent — достаточно одного запроса /metadata/v3/tree/<parent>);
 *   3) рекурсивно ищем в ветке узел с id === class_id и берём его name.
 * Fallback, если узел в дереве не найден, — поле class из /metadata/link.
 * Если запрос дерева вернулся с ошибкой — оставляем «голый» class_id.
 */
export async function buildTitleLabels(
    sortedData: FormGRefMetadataLink[],
    parent: string,
    server: string,
): Promise<Record<string, string>> {
    // class_id может прийти строкой со значениями через запятую — работаем с уникальными атомарными id
    const classIds = Array.from(new Set(sortedData.map((item) => item.class_id)));
    const titleLabels: Record<string, string> = {};

    const fetchTree = async (rootId: string): Promise<RawChildNode[]> => {
        const url = buildUrl(server, 'metadata', 'v3/tree', rootId);
        const response = await $api.get<RawChildNode[]>(url);
        return response.data ?? [];
    };

    // Дерево от одного и того же корня запрашивается один раз за вызов
    const treeCache = new Map<string, Promise<RawChildNode[]>>();
    const fetchTreeCached = (rootId: string): Promise<RawChildNode[]> => {
        if (!treeCache.has(rootId)) {
            treeCache.set(rootId, fetchTree(rootId));
        }
        return treeCache.get(rootId) as Promise<RawChildNode[]>;
    };

    for (const classId of classIds) {
        const item = sortedData.find((i) => i.class_id === classId);
        if (!item) {
            titleLabels[classId] = classId;
            continue;
        }

        try {
            // С parent достаточно одного дерева; без него — ветка owner_id каждого class_id
            const tree = await fetchTreeCached(parent || item.owner_id);
            const node = findTreeNode(tree, classId);
            titleLabels[classId] = node ? node.name || node.description : item.class || classId;
        } catch {
            // Ошибка запроса дерева — оставляем id как есть
            titleLabels[classId] = classId;
        }
    }

    return titleLabels;
}

function findTreeNode(nodes: RawChildNode[], id: string): RawChildNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = node.children?.length ? findTreeNode(node.children, id) : null;
        if (found) return found;
    }
    return null;
}
