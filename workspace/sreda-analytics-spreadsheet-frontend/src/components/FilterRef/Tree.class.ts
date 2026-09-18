import { INode, ITree } from './types';

/**
 * Строит составной уникальный ключ узла.
 *
 * @param businessId - исходный id с бэкенда
 * @param parentKey  - nodeKey родителя (null / '' для корневых)
 */
export function makeNodeKey(businessId: string | number, parentKey: string | null | undefined): string {
    return parentKey ? `${parentKey}__${businessId}` : `${businessId}`;
}

/**
 * Извлекает бизнес-id из составного nodeKey.
 * "grandparent__parent__123" -> "123"
 */
export function extractBusinessId(nodeKey: string): string {
    const parts = nodeKey.split('__');
    return parts[parts.length - 1];
}

export default class Tree implements ITree {
    /** nodeKey -> INode */
    private nodes: Map<string, INode>;

    /** nodeKey корневых узлов */
    private roots: Set<string>;

    /** parentNodeKey -> Set<childNodeKey> */
    private childrenIndex: Map<string, Set<string>>;

    /**
     * Обратный индекс: businessId -> Set<nodeKey>.
     * Позволяет найти все вхождения узла с данным бизнес-id на разных уровнях.
     */
    private businessIdIndex: Map<string | number, Set<string>>;

    constructor(nodes?: INode[]) {
        // Основное хранилище узлов
        this.nodes = new Map();

        // Корни деревьев (могут быть несколько)
        this.roots = new Set();

        // Индекс parentId -> childrenIds
        this.childrenIndex = new Map();

        this.businessIdIndex = new Map();

        // Добавляем переданные узлы дерева
        if (nodes?.length) {
            for (const node of nodes) {
                this.addNode(node);
            }
        }
    }

    // ─── Внутренние хелперы ──────────────────────────────────────────────────

    private registerInBusinessIndex(businessId: string | number, nodeKey: string): void {
        if (!this.businessIdIndex.has(businessId)) {
            this.businessIdIndex.set(businessId, new Set());
        }
        this.businessIdIndex.get(businessId)!.add(nodeKey);
    }

    private linkToParent(nodeKey: string, parentKey: string): void {
        if (!this.childrenIndex.has(parentKey)) {
            this.childrenIndex.set(parentKey, new Set());
        }
        this.childrenIndex.get(parentKey)!.add(nodeKey);
    }

    /**
     * Гарантирует наличие поля id.
     * Если id отсутствует (например, пришёл повреждённый кеш) —
     * восстанавливает его из последнего сегмента nodeKey.
     */
    private normalizeNode(node: INode): INode {
        if (node.id != null) return node;
        const recoveredId = extractBusinessId(node.value);
        return { ...node, id: recoveredId };
    }

    // ─── Публичные методы ────────────────────────────────────────────────────

    /**
     * Добавление узла.
     * node.value — nodeKey (уникальный составной ключ).
     * node.id — бизнес-идентификатор.
     */
    addNode(node: INode): void {
        // Пропускаем узлы без nodeKey
        if (!node.value) return;

        const normalized = this.normalizeNode(node);
        const nodeKey = normalized.value;
        const { id: businessId, parentKey } = normalized;

        const existingNode = this.nodes.get(nodeKey);

        if (existingNode !== undefined) {
            // Случай 1: ранее добавлен как корневой, теперь уточнён parentKey.
            if (parentKey && !existingNode.parentKey) {
                this.roots.delete(nodeKey);
                this.linkToParent(nodeKey, parentKey);
                this.nodes.set(nodeKey, { ...existingNode, ...normalized });
                return;
            }
            // Случай 2: тот же parentKey — просто обновляем данные.
            if (parentKey === existingNode.parentKey) {
                this.nodes.set(nodeKey, { ...existingNode, ...normalized });
            }
            return;
        }

        this.nodes.set(nodeKey, normalized);
        this.registerInBusinessIndex(businessId, nodeKey);

        if (!parentKey) {
            this.roots.add(nodeKey);
        } else {
            this.linkToParent(nodeKey, parentKey);
        }
    }

    /**
     * Добавляет узел или, если он уже существует, обновляет данные и перемещает
     * его в конец родительского Set.
     *
     * Механизм: Set сохраняет порядок вставки. `delete` + `add`
     * перемещает ключ в конец. Поскольку items обрабатываются в порядке
     * сервера, итоговый порядок в Set совпадает с серверным.
     *
     * Пример (предзагружен C, сервер вернул [A, B, C, D, E]):
     *   обработка A: Set = [C, A]
     *   обработка B: Set = [C, A, B]
     *   обработка C: delete+add -> Set = [A, B, C] <- C на нужной позиции
     *   обработка D: Set = [A, B, C, D]
     *   обработка E: Set = [A, B, C, D, E]
     */
    addOrMoveNode(node: INode): void {
        if (!node.value) return;

        const normalized = this.normalizeNode(node);
        const nodeKey = normalized.value;
        const { id: businessId, parentKey } = normalized;

        const existingNode = this.nodes.get(nodeKey);

        if (existingNode !== undefined) {
            // Обновляем данные узла
            this.nodes.set(nodeKey, { ...existingNode, ...normalized });

            // Перемещаем в конец коллекции для сохранения порядка
            if (parentKey) {
                const children = this.childrenIndex.get(parentKey);
                if (children) {
                    children.delete(nodeKey);
                    children.add(nodeKey);
                }
            } else {
                this.roots.delete(nodeKey);
                this.roots.add(nodeKey);
            }
            return;
        }

        // Новый узел
        this.nodes.set(nodeKey, normalized);
        this.registerInBusinessIndex(businessId, nodeKey);

        if (!parentKey) {
            this.roots.add(nodeKey);
        } else {
            this.linkToParent(nodeKey, parentKey);
        }
    }

    addNodes(nodes: INode[]): void {
        for (const node of nodes) {
            this.addNode(node);
        }
    }

    /** Получение узла по nodeKey — O(1). */
    getNode(nodeKey: string): INode | undefined {
        return this.nodes.get(nodeKey);
    }

    /** Получение узлов по массиву nodeKey. */
    getNodes(nodeKeys: string[] = []): INode[] {
        return nodeKeys.reduce((acc: INode[], key: string) => {
            const node = this.nodes.get(key);
            if (node) acc.push(node);
            return acc;
        }, []);
    }

    /**
     * Получение всех узлов с заданным бизнес-id.
     * Может вернуть несколько экземпляров, если id повторяется на разных уровнях.
     */
    getNodesByBusinessId(businessId: string | number): INode[] {
        const keys = this.businessIdIndex.get(businessId);
        if (!keys) return [];
        return Array.from(keys).reduce((acc: INode[], key) => {
            const node = this.nodes.get(key);
            if (node) acc.push(node);
            return acc;
        }, []);
    }

    /**
     * Плоский список всех узлов.
     */
    getAllData(): INode[] {
        return Array.from(this.nodes.values());
    }

    /**
     * Дочерние узлы — O(1).
     * @param parentNodeKey nodeKey родителя; без аргумента — корневые узлы.
     */
    getChildren(parentNodeKey?: string): INode[] {
        if (!parentNodeKey) {
            return Array.from(this.roots).reduce((acc: INode[], key: string) => {
                const node = this.nodes.get(key);
                if (node) acc.push(node);
                return acc;
            }, []);
        }

        const childKeys = this.childrenIndex.get(parentNodeKey);
        if (!childKeys) return [];

        return Array.from(childKeys).reduce((acc: INode[], key: string) => {
            const node = this.nodes.get(key);
            if (node) acc.push(node);
            return acc;
        }, []);
    }

    /** Поддерево от узла (для UI-компонента). */
    getSubtree(nodeKey: string): INode | null {
        const node = this.nodes.get(nodeKey);
        if (!node) return null;

        const childKeys = this.childrenIndex.get(nodeKey);
        const children: INode[] = childKeys
            ? Array.from(childKeys).reduce((acc: INode[], key: string) => {
                  const item = this.getSubtree(key);
                  if (item) acc.push(item);
                  return acc;
              }, [])
            : [];

        return { ...node, children };
    }

    /** Полное дерево (все поддеревья от корней) для UI-компонента. */
    getFullTree(): INode[] {
        return Array.from(this.roots).map((key) => this.getSubtree(key)!);
    }

    clear(): void {
        this.nodes.clear(); // очищаем все узлы
        this.roots.clear(); // очищаем корни
        this.childrenIndex.clear(); // очищаем индекс детей
        this.businessIdIndex.clear(); // очищаем индекс бизнес-идентификаторов
    }
}
