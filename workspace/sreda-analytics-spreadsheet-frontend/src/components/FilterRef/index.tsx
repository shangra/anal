import { Component, CSSProperties } from 'react';
import { IconButton, Select, SelectOption, TreeMultiSelect, UpdateIcon } from 'ui-kit';

import $api from '../../helpers/axios';
import { Timer } from '../../helpers/timer';
import { IndexDbContext } from '../IndexDb/IndexDb.context';
import styles from './styles.module.css';
import Tree, { extractBusinessId, makeNodeKey } from './Tree.class';
import type {
    ICacheData,
    ICacheService,
    IContainerItem,
    ILevelsOptions,
    ILevelsResponse,
    ILoadChildren,
    INode,
    INodePathsOptions,
    INodesOptions,
    INodesResponse,
    IOnChangeItem,
    IOnChangeResult,
    IProps,
    IState,
    ITree,
} from './types';
import { castIdByType } from './utils';

/**
 * Компонент древовидного фильтра.
 *
 * Ключевые соглашения:
 *  - INode.value  = nodeKey (составной уникальный ключ пути в дереве).
 *  - INode.id     = бизнес-идентификатор (исходный id с бэкенда).
 *  - state.value  = массив nodeKey выбранных узлов.
 *  - Во внешний onChange передаётся INode.id, а не nodeKey.
 */
export default class FilterRef extends Component<IProps, IState> {
    /**
     * Контекст сервиса кеширования
     */
    static contextType = IndexDbContext;

    /**
     * Флаг использования кеширования
     */
    private useCache: boolean = false;

    /**
     * Таймер отложенного вызова
     * @private
     */
    private debounceTimer: Timer = new Timer(1000);

    // ─── Статические / фабричные методы ──────────────────────────────────────

    /**
     * Метод получения данных дерева
     * @param options Дополнительные параметры
     */
    private static async getData(options: INodesOptions): Promise<INodesResponse[] | null> {
        const { server, ...rest } = options;

        const url = `${server ? `/to/${server}` : ''}/metadata/meta-filter`;
        const { data = [] } = await $api.post(url, rest);
        return data;
    }

    /**
     * Метод получения уровней
     * @param options Дополнительные параметры
     */
    private static async getLevels(options: ILevelsOptions): Promise<ILevelsResponse[]> {
        const { metaRefId, server } = options;
        const url = `${server ? `/to/${server}` : ''}/metadata/meta-filter/levels/${metaRefId}`;
        const { data = [] } = await $api.get(url);
        return data;
    }

    /**
     * Запрашивает полные пути от корня до каждого из переданных узлов.
     *
     * Эндпоинт принимает массив бизнес-id и возвращает дерево путей
     * в том же формате, что и обычный поиск (INodesResponse[]).
     * Каждый корневой элемент ответа содержит вложенных потомков вплоть
     * до запрошенного узла.
     */
    private static async getNodePaths(options: INodePathsOptions): Promise<INodesResponse[] | null> {
        const { server, metaRefId, items } = options;
        const url = `${server ? `/to/${server}` : ''}/metadata/meta-filter/path/${metaRefId}`;
        const { data = [] } = await $api.post(url, items);
        return data;
    }

    /**
     * Фабричный метод получения инстанса дерева
     * @private
     */
    private static getTree(nodes?: INode[]): ITree {
        return new Tree(nodes);
    }

    /**
     * Нормализует узел из кеша: восстанавливает id, если он отсутствует.
     *
     * FIX: при повреждённом кеше (или старом формате) поле id могло
     * быть утрачено. Восстанавливаем его из последнего сегмента nodeKey —
     * это всегда бизнес-id согласно соглашению makeNodeKey.
     */
    private static normalizeNode(node: INode): INode {
        if (node.id != null) return node;
        return { ...node, id: extractBusinessId(node.value) };
    }

    // ─── Вспомогательный метод приведения типа id ─────────────────────────────

    /**
     * Приводит бизнес-идентификатор к типу, определённому в props.type.
     * integer / float / number -> number; остальные -> string; null/undefined — без изменений.
     */
    private castId = (id: string | number | null | undefined): string | number | null | undefined =>
        castIdByType(id, this.props.type);

    // ─── Конструктор ──────────────────────────────────────────────────────────

    constructor(props: IProps) {
        super(props);

        this.state = {
            pageSize: 100, // Количество одновременно загружаемых элементов
            search: '', // Искомое значение
            value: [], // Выбранные значения
            levels: [], // Все уровни
            selectedLevel: 0, // Выбранный уровень
            tree: FilterRef.getTree(), // Абстрактное дерево, которое можно потом передавать через проп и подменять на необходимое
            searchResults: undefined, // Отдельное дерево для результатов поиска
            options: [], // Готовое дерево для ui
            hasMore: true, // Флаг для дозагрузки корневых элементов
            hasMoreBeforeSearch: undefined,
            isLoading: false, // Флаг загрузки
            error: undefined,
        };
    }

    componentDidMount() {
        this.init();
    }

    componentWillUnmount() {
        this.debounceTimer.stop();
    }

    // ─── Вспомогательные методы ───────────────────────────────────────────────

    /**
     * Вспомогательный метод отложенного вызова
     * @param callback Метод, который будет вызываться
     */
    private useDebouncing = (callback: (...args: unknown[]) => unknown) => {
        this.debounceTimer.start(callback);
    };

    /**
     * Преобразует «сырой» ответ бэкенда (INodesResponse[]) в плоский список INode[].
     *
     * Выделено из getNodes для переиспользования в loadSelectedPaths:
     * оба метода получают данные из разных эндпоинтов, но обрабатывают
     * их одинаковым BFS-алгоритмом.
     *
     * @param data    - ответ бэкенда (дерево с вложенными детьми)
     * @param context - parentKey / parent для верхнего уровня (актуально при дозагрузке)
     * @param levels  - уровни для вычисления canExpand
     */
    private parseNodesResponse = (
        data: INodesResponse[],
        context: Pick<INodesOptions, 'parentKey' | 'parent'>,
        levels: SelectOption<number>[] | null,
    ): INode[] => {
        const activeLevels = levels !== undefined ? levels : this.state.levels;
        const queue = [...data].reverse();
        const result: INode[] = [];

        /**
         * Локальный индекс для разрешения nodeKey внутри одного ответа.
         * Ключ: бизнес-id узла, значение: его nodeKey.
         * Нужен чтобы дочерний узел мог найти nodeKey своего родителя,
         * обработанного ранее в этом же цикле.
         */
        const localKeyMap = new Map<string | number, string>();

        while (queue.length) {
            const item = queue.pop();
            if (item?.id == null) continue;

            const businessId = this.castId(item.id) as string | number;

            // ── Определяем бизнес-id родителя ───────────────────────────────
            let parentBusinessId: string | number | null = null;
            if (item.parent != null && (typeof item.parent === 'string' || typeof item.parent === 'number')) {
                parentBusinessId = this.castId(item.parent) as string | number;
            } else if (context.parent != null) {
                parentBusinessId = this.castId(context.parent) as string | number;
            }

            // ── Определяем nodeKey родителя ──────────────────────────────────
            // Приоритет: 1) контекст (при дозагрузке детей),
            //            2) localKeyMap (родитель из этого же ответа),
            //            3) основное дерево (родитель уже был добавлен ранее).
            let parentKey: string | null = null;
            if (parentBusinessId != null) {
                if (context.parentKey && parentBusinessId === context.parent) {
                    parentKey = context.parentKey;
                } else if (localKeyMap.has(parentBusinessId)) {
                    parentKey = localKeyMap.get(parentBusinessId)!;
                } else {
                    const parentNodes = this.state.tree.getNodesByBusinessId(parentBusinessId);
                    parentKey = parentNodes[0]?.value ?? null;
                }
            }

            // ── Составной nodeKey для текущего узла ──────────────────────
            const nodeKey = makeNodeKey(businessId, parentKey);

            // ── Вычисляем level ──────────────────────────────────────────────
            const parentNode = parentKey ? this.state.tree.getNode(parentKey) : null;
            let level = 0;
            if (parentNode) {
                level = parentNode.level + 1;
            } else if (typeof item.level === 'number') {
                level = item.level;
            }

            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            const canExpand = activeLevels?.length ? activeLevels.length - 1 > level : hasChildren;

            const newNode: INode = {
                id: businessId,
                value: nodeKey,
                label: item.name || 'Без названия',
                parentId: parentBusinessId,
                parentKey,
                isLoading: false,
                isExpanded: false,
                hasChildren: canExpand,
                hasMore: true,
                children: [],
                level,
            };

            localKeyMap.set(businessId, nodeKey);
            result.push(newNode);

            // ── Рекурсивная обработка детей, пришедших в ответе ─────────────
            if (item.children?.length) {
                newNode.isExpanded = true;

                if (item.children.length < this.state.pageSize) {
                    newNode.hasMore = false;
                }

                const childItems = item.children.map((child) => ({
                    ...child,
                    parent: item.id,
                    level: level + 1,
                }));

                queue.push(...childItems);
            }
        }

        return result;
    };

    /**
     * Строит INode[] из ответа бэкенда.
     * Делегирует разбор ответа в parseNodesResponse.
     */
    private getNodes = async (options: INodesOptions, levels?: SelectOption<number>[] | null): Promise<INode[]> => {
        try {
            const data = (await FilterRef.getData(options)) || [];
            const activeLevels = levels !== undefined ? levels : this.state.levels;

            // ── Обновляем флаг hasMore для родителя ─────────────────────────
            const rootParent = options.parentKey ? this.state.tree.getNode(options.parentKey) : null;
            if (rootParent && data.length < this.state.pageSize) {
                rootParent.hasMore = false;
            } else if (!options.parentKey && data.length < this.state.pageSize) {
                this.setState(() => ({ hasMore: false }));
            }

            return this.parseNodesResponse(data, options, activeLevels ?? null);
        } catch (e) {
            console.error((e as Error).message);
            throw e;
        }
    };

    /**
     * Метод получения уровней
     * @param options Дополнительные параметры
     */
    private getLevels = async (options: ILevelsOptions): Promise<SelectOption<number>[]> => {
        try {
            const data = await FilterRef.getLevels(options);
            return data.map((item) => ({
                label: item.description || item.name,
                value: item.level,
            }));
        } catch (e) {
            console.error((e as Error).message);
            throw e;
        }
    };

    // ─── Инициализация ────────────────────────────────────────────────────────

    /**
     * Загружает состояние из IndexDB-кеша.
     * Возвращает пустой объект, если кеш отключён или недоступен.
     */
    private loadCachedData = async (): Promise<Partial<ICacheData>> => {
        if (!this.useCache) return {};
        const cacheService = this.context as ICacheService;
        return ((await cacheService?.read(this.props.metaRefId)) as Partial<ICacheData>) || {};
    };

    /**
     * Извлекает и нормализует узлы из props.container.cached.
     *
     * @param levels - уровни для вычисления hasMore
     */
    private getContainerCachedNodes = (levels: SelectOption<number>[] | null): INode[] => {
        if (!this.props.field || !this.props.container.cached?.length) return [];

        return (this.props.container.cached as INode[])
            .filter((item) => !!item.value)
            .map((item) => {
                const normalized = FilterRef.normalizeNode(item);
                const castedId = this.castId(normalized.id) as string | number;
                const hasMore =
                    normalized.hasMore === undefined && levels?.length && levels.length - 1 > normalized.level
                        ? true
                        : normalized.hasMore;
                const isExpanded = normalized.children?.length ? true : normalized.isExpanded;
                return { ...normalized, id: castedId, hasMore, isExpanded };
            });
    };

    /**
     * Добавляет узлы в дерево, пропуская дубликаты по nodeKey.
     * Используется при первичном заполнении (init, search, path loading).
     */
    private populateTree = (nodes: INode[]): void => {
        for (const node of nodes) {
            if (node.value && !this.state.tree.getNode(node.value)) {
                this.state.tree.addNode(node);
            }
        }
    };

    /**
     * Встраивает узлы в дерево с сохранением порядка сортировки из ответа сервера.
     *
     * В отличие от populateTree (пропускает существующие узлы),
     * использует addOrMoveNode: если узел уже был в дереве —
     * перемещает его в конец родительского Set согласно текущему порядку массива.
     *
     * Используется только при «Загрузить ещё», где порядок сервера
     * должен быть авторитетным даже для предзагруженных элементов.
     */
    private populateTreeOrdered = (nodes: INode[]): void => {
        for (const node of nodes) {
            if (node.value) {
                this.state.tree.addOrMoveNode(node);
            }
        }
    };

    /**
     * Восстанавливает массив nodeKey выбранных узлов.
     *
     * @param overrideItems - переопределяет источник (используется после $ne-инверсии).
     *   Если не передан — читает из props.container.items.
     */
    private restoreSelectedValues = (overrideItems?: Array<{ value: string | number }>): string[] => {
        const sourceItems: Array<{ value: string | number }> | undefined = overrideItems ?? this.props.container?.items;
        if (!sourceItems?.length) return [];

        const value: string[] = [];
        for (const item of sourceItems) {
            const matchingNodes = this.state.tree.getNodesByBusinessId(this.castId(item.value) as string | number);
            for (const node of matchingNodes) {
                value.push(node.value);
            }
        }
        return value;
    };

    /**
     * Загружает полные пути от корня до каждого из выбранных узлов.
     *
     * Используется в init() когда:
     *  - container.cached отсутствует (нет кешированной структуры дерева),
     *  - но container.items содержит выбранные бизнес-id.
     *
     * Без этого шага restoreSelectedValues() не нашла бы узлы в дереве
     * (они не были бы загружены), и выбранные значения потерялись бы.
     *
     * Ответ эндпоинта имеет тот же формат, что и обычный поиск:
     * каждый корневой элемент содержит вложенную цепочку потомков
     * вплоть до запрошенного узла.
     *
     * @param selectedIds - бизнес-id выбранных элементов (из container.items)
     * @param levels      - уровни для вычисления canExpand
     */
    private loadSelectedPaths = async (
        selectedIds: Array<{ id: string | number; level: number }>,
        levels: SelectOption<number>[] | null,
    ): Promise<INode[]> => {
        if (!selectedIds.length) return [];

        try {
            const data = await FilterRef.getNodePaths({
                server: this.props.server,
                metaRefId: this.props.metaRefId,
                items: selectedIds,
            });

            if (!data?.length) return [];

            // Контекст пустой: пути начинаются с корневых узлов (нет внешнего родителя)
            return this.parseNodesResponse(data, {}, levels);
        } catch (e) {
            // Не бросаем ошибку наружу: отсутствие путей — некритично,
            // дерево отобразится без контекста выбранных элементов.
            console.warn('Ошибка при загрузке путей выбранных узлов:', e);
            return [];
        }
    };

    /**
     * Разрешает условие $ne: инвертирует «исключить X» в «выбрать всех соседей кроме X».
     *
     * @param neItems      - элементы с флагом $ne
     * @param regularItems - обычные (не $ne) элементы: определяют стратегию подъёма
     *                       и используются для проверки покрытия предком
     * @param levels       - уровни для вычисления canExpand
     */
    private resolveNeCondition = async (
        neItems: Array<{ value: string | number; level?: number }>,
        regularItems: Array<{ value: string | number; level?: number }>,
        levels: SelectOption<number>[] | null,
    ): Promise<{
        nodes: INode[];
        pathNodes: INode[];
        selectedItems: Array<{ value: string | number; level?: number }>;
    }> => {
        if (!neItems.length) return { nodes: [], pathNodes: [], selectedItems: [] };

        // ── 1. Узлы путей до $ne-элементов ───────────────────────────────────────
        //
        // levels = null -> плоский справочник: все элементы на уровне 0, нет иерархии.
        // Путевой запрос не нужен — создаём синтетические корневые узлы напрямую.
        // levels != null -> иерархический справочник: запрашиваем реальные пути.
        const nePathNodes: INode[] =
            levels !== null
                ? await this.loadSelectedPaths(
                      neItems.map((item) => ({ id: item.value, level: item.level ?? 0 })),
                      levels,
                  )
                : this.parseNodesResponse(
                      neItems.map(
                          (item): INodesResponse => ({
                              id: item.value,
                              level: 0,
                              name: '',
                              children: [],
                          }),
                      ),
                      {},
                      null,
                  );

        const allNodes: INode[] = [...nePathNodes];
        const selectedItems: Array<{ value: string | number; level?: number }> = [];

        if (!nePathNodes.length) return { nodes: allNodes, pathNodes: nePathNodes, selectedItems };

        // ── 2. Временное дерево для определения иерархии $ne-элементов ───────────
        const tempTree = FilterRef.getTree(nePathNodes);

        // ── 3. Множество исключённых: сами $ne-узлы + все их предки ────────────
        const excludedBusinessIds = new Set<string | number>(neItems.map((i) => i.value));

        for (const neItem of neItems) {
            const neNode = tempTree.getNodesByBusinessId(neItem.value)[0];
            if (!neNode) continue;
            let cur: INode | undefined = neNode;
            while (cur?.parentKey) {
                cur = tempTree.getNode(cur.parentKey);
                if (cur) excludedBusinessIds.add(cur.id);
            }
        }

        // ── 4. Загрузка всех страниц соседей для одного уровня ───────────────────
        const processedGroups = new Set<string>();

        const processExcludedNode = async (excludedNode: INode): Promise<void> => {
            const parentBusinessId = excludedNode.parentId ?? null;
            const parentNodeKey = excludedNode.parentKey ?? null;
            const nodeLevel = excludedNode.level;
            const groupKey = `${parentBusinessId ?? '__root__'}::${nodeLevel}`;

            if (processedGroups.has(groupKey)) return;
            processedGroups.add(groupKey);

            // Загружаем ВСЕ страницы соседей, чтобы не пропустить элементы сверх pageSize
            let offset = 0;
            let keepLoading = true;

            while (keepLoading) {
                try {
                    const siblingData =
                        // eslint-disable-next-line no-await-in-loop
                        (await FilterRef.getData({
                            id: this.props.metaRefId,
                            server: this.props.server,
                            level: nodeLevel,
                            limit: this.state.pageSize,
                            offset,
                            ...(parentBusinessId ? { parent: parentBusinessId } : {}),
                        })) || [];

                    // Передаём parentNodeKey из temp-дерева для корректных составных nodeKey
                    const siblingNodes = this.parseNodesResponse(
                        siblingData,
                        {
                            parent: parentBusinessId ?? undefined,
                            parentKey: parentNodeKey ?? undefined,
                        },
                        levels,
                    );

                    allNodes.push(...siblingNodes);

                    // Выбираем соседей, не входящих в исключённое множество.
                    // На уровне самого $ne-узла — его братья/сёстры.
                    // На уровнях предков — братья/сёстры данного предка.
                    for (const sibling of siblingNodes) {
                        if (!excludedBusinessIds.has(sibling.id)) {
                            selectedItems.push({ value: sibling.id, level: sibling.level });
                        }
                    }

                    // Переходим к следующей странице, если текущая заполнена полностью
                    keepLoading = siblingData.length >= this.state.pageSize;
                    offset += this.state.pageSize;
                } catch (e) {
                    console.warn('Ошибка при загрузке соседей для $ne-условия:', e);
                    keepLoading = false;
                }
            }
        };

        // ── 5. Множество бизнес-id обычных элементов для быстрого поиска ───────────
        const regularItemIds = new Set(regularItems.map((item) => item.value));

        // ── 6. Обход каждого $ne-узла ─────────────────────────────────────────────
        for (const neItem of neItems) {
            const neNode = tempTree.getNodesByBusinessId(neItem.value)[0];
            if (!neNode) continue;

            // Собственный уровень обрабатывается всегда
            // eslint-disable-next-line no-await-in-loop
            await processExcludedNode(neNode);

            // Строим цепочку предков: ancestors[0] — ближайший родитель, последний — корень
            const ancestors: INode[] = [];
            let cur: INode | undefined = neNode;
            while (cur?.parentKey) {
                cur = tempTree.getNode(cur.parentKey);
                if (!cur) break;
                ancestors.push(cur);
            }

            // Корневой neItem — подниматься некуда
            if (ancestors.length === 0) continue;

            if (regularItems.length === 0) {
                for (const ancestor of ancestors) {
                    // eslint-disable-next-line no-await-in-loop
                    await processExcludedNode(ancestor);
                }
            } else {
                // Есть regularItems: ищем ближайшего предка, входящего в regularItems
                // findIndex идёт от ближайшего родителя к корню — находим первое совпадение
                const regularAncestorIndex = ancestors.findIndex((ancestor) => regularItemIds.has(ancestor.id));

                if (regularAncestorIndex !== -1) {
                    for (let i = 0; i < regularAncestorIndex; i++) {
                        // eslint-disable-next-line no-await-in-loop
                        await processExcludedNode(ancestors[i]);
                    }
                }
            }
        }

        // Дедупликация
        const seenIds = new Set<string | number>();
        const deduplicatedSelectedItems = selectedItems.filter(({ value }) => {
            const key = value;
            if (seenIds.has(key)) return false;
            seenIds.add(key);
            return true;
        });

        return { nodes: allNodes, pathNodes: nePathNodes, selectedItems: deduplicatedSelectedItems };
    };

    /**
     * Метод инициализации.
     * Оркестрирует: кеш -> уровни -> $ne-инверсия -> узлы -> пути -> дерево -> выделение.
     */
    private init = async () => {
        try {
            this.setState(() => ({ isLoading: true, error: undefined }));

            // ── 1. Загружаем закешированные данные ───────────────────────────
            const cached = await this.loadCachedData();
            let levels: SelectOption<number>[] | null = cached.levels ?? [];
            let nodes: INode[] = cached.nodes ?? [];
            const search = cached.search ?? '';
            const selectedLevel = cached.selectedLevel ?? 0;
            let hasMore = cached.hasMore ?? true;

            // ── 2. Загружаем уровни с сервера, если нет кешированных ─────────
            if (!levels?.length) {
                const fetched = await this.getLevels({
                    server: this.props.server,
                    metaRefId: this.props.metaRefId,
                });
                // Для плоских справочников уровней нет — устанавливаем null
                levels = fetched.length ? fetched : null;
            }

            // ── 3. Объединяем с узлами из props.container.cached ─────────────
            const containerNodes = this.getContainerCachedNodes(levels);
            if (containerNodes.length) {
                // Узлы контейнера имеют приоритет; кешированные дополняют их
                const containerKeys = new Set(containerNodes.map((n) => n.value));
                nodes = [...containerNodes, ...nodes.filter((n) => !containerKeys.has(n.value))];
            }

            // ── 4. Разрешаем условие $ne (обратная совместимость) ────────────
            //
            // Если container.items содержит элементы с filterBy: '$ne', это означает
            // «выбрать всё КРОМЕ указанных». Инвертируем условие:
            // загружаем соседей и устанавливаем их как выбранные.
            //
            // После разрешения $ne условие исчезает из результата —
            // onChange сохраняет свежие items без $ne-флагов.
            const containerItems: IContainerItem[] = (this.props.container?.items ?? []).map((item) => ({
                ...item,
                // TODO: Это когда-то сломалось и сохранилось в схемы...
                // Удалить через какое-то время.
                // @ts-ignore
                level: item.level?.level ?? item.level,
                value: this.castId(item.value) as string | number,
            }));
            const neItems = containerItems.filter((item) => item.filterBy === '$ne');
            const regularItems = containerItems.filter((item) => item.filterBy !== '$ne');

            let neResolutionNodes: INode[] = [];
            // узлы путей $ne-элементов (для коррекции hasMore)
            let nePathNodes: INode[] = [];
            let resolvedFromNe: Array<{ value: string | number; level?: number }> = [];

            if (neItems.length) {
                const resolved = await this.resolveNeCondition(neItems, regularItems, levels);
                neResolutionNodes = resolved.nodes;
                nePathNodes = resolved.pathNodes;
                resolvedFromNe = resolved.selectedItems;
            }

            const notNeItems = regularItems.filter(
                (item) => !nePathNodes.find((neItem) => item.value === neItem.id && item.level === neItem.level),
            );

            // Эффективный список выбранных: обычные элементы + разрешённые из $ne
            const effectiveSelectedItems: Array<{
                value: string | number;
                level?: number;
                label?: string;
                name?: string;
            }> = [...notNeItems, ...resolvedFromNe];

            // ── 5. Загружаем пути до выбранных узлов ────────────────────────
            const hasCachedStructure = nodes.length > 0;
            const hasSelectedItems = effectiveSelectedItems.length > 0;

            let pathNodesPromise: Promise<INode[]> = Promise.resolve([]);
            if (hasSelectedItems && !hasCachedStructure) {
                if (neItems.length > 0) {
                    // После разрешения $ne соседи уже в neResolutionNodes.
                    // При levels != null нужны пути только для обычных элементов
                    // (они могут быть на уровнях, не затронутых $ne-резолюцией).
                    // При levels == null все плоские узлы (включая regularItems)
                    // уже загружены processExcludedNode — дополнительный запрос не нужен.
                    if (regularItems.length > 0 && levels !== null) {
                        pathNodesPromise = this.loadSelectedPaths(
                            regularItems.map((item) => ({ id: item.value, level: item.level ?? 0 })),
                            levels,
                        );
                    }
                } else if (levels !== null) {
                    // Нет $ne-элементов, иерархический справочник — стандартная загрузка путей
                    pathNodesPromise = this.loadSelectedPaths(
                        effectiveSelectedItems.map((item) => ({ id: item.value, level: item.level ?? 0 })).filter(Boolean),
                        levels,
                    );
                } else {
                    // Нет $ne-элементов, плоский справочник — создаём узлы без запроса
                    pathNodesPromise = Promise.resolve(
                        this.parseNodesResponse(
                            effectiveSelectedItems
                                .map(
                                    (item): INodesResponse => ({
                                        id: item.value,
                                        level: item.level ?? 0,
                                        name: item.name ?? item.label ?? '',
                                        children: [],
                                    }),
                                )
                                .filter(Boolean),
                            {},
                            levels,
                        ),
                    );
                }
            }

            const rootNodesPromise: Promise<INode[]> = !nodes.length
                ? this.getNodes(
                      {
                          server: this.props.server,
                          id: this.props.metaRefId,
                          limit: this.state.pageSize,
                          name: search ? `%${search}%` : undefined,
                          level: 0,
                      },
                      levels,
                  )
                : Promise.resolve(nodes);

            const [pathNodes, rootNodes] = await Promise.all([pathNodesPromise, rootNodesPromise]);

            if (!nodes.length) {
                nodes = rootNodes;
            }

            // ── 7. Вычисляем hasMore по корневым узлам ───────────────────────
            // pathNodes и neResolutionNodes не являются страницей пагинации.
            if (!this.useCache) {
                hasMore = nodes.length >= this.state.pageSize;
            }

            // ── 8. Заполняем дерево ──────────────────────────────────────────
            // Порядок важен: сначала корневые (скелет), затем пути и $ne-узлы (детали).
            // populateTree пропускает дубликаты.
            this.populateTree(nodes);
            this.populateTree(pathNodes);
            this.populateTree(neResolutionNodes);

            // ── 9. Помечаем предков из путей как hasMore=true ─────────────────────────
            //
            // Узлы, пришедшие из path-запросов (pathNodes и nePathNodes), могут вернуться
            // с hasMore=false, если в ответе путей пришло < pageSize детей. Реально
            // у этих предков могут быть незагруженные дочерние элементы, поэтому
            // принудительно ставим hasMore=true.
            //
            // Соседей из neResolutionNodes НЕ включаем: они загружены постранично до
            // исчерпания (пагинационный цикл в resolveNeCondition), их hasMore корректен.
            for (const node of [...pathNodes, ...nePathNodes]) {
                if (node.parentKey) {
                    const parent = this.state.tree.getNode(node.parentKey);
                    if (parent) parent.hasMore = true;
                }
            }

            // ── 10. Восстанавливаем выбранные значения ────────────────────────
            // Если были $ne-элементы, используем разрешённый список (соседи минус $ne).
            // Иначе — стандартное восстановление из props.container.items.
            const value = neItems.length ? this.restoreSelectedValues(effectiveSelectedItems) : this.restoreSelectedValues();

            // ── 11. Обновляем state ──────────────────────────────────────────
            this.setState(
                (prevState) => ({
                    levels,
                    value,
                    hasMore,
                    hasMoreBeforeSearch: hasMore,
                    search,
                    isLoading: false,
                    selectedLevel,
                    options: prevState.tree.getFullTree(),
                }),
                () => {
                    if (this.useCache) {
                        // Сохраняем все узлы (корневые + пути) через getAllData()
                        this.saveCache({ levels, selectedLevel, search, hasMore });
                    }
                },
            );
        } catch (e) {
            console.warn('Произошла ошибка при инициализации компонента', e);
            this.setState(() => ({ isLoading: false, error: e as Error }));
        }
    };

    // ─── Кеширование ─────────────────────────────────────────────────────────

    /**
     * Метод кеширования значений
     * @param options Опции для кеширования
     */
    private saveCache = async (options?: Partial<ICacheData>) => {
        if (!this.useCache) return;
        const service = this.context as ICacheService;
        if (!service?.save) return;

        await service.save({
            id: this.props.metaRefId,
            createdAt: +new Date(),
            search: options?.search ?? this.state.search ?? '',
            levels: options?.levels !== undefined ? options.levels : this.state.levels,
            selectedLevel: options?.selectedLevel ?? this.state.selectedLevel,
            nodes: options?.nodes ?? this.state.tree.getAllData(),
            hasMore: options?.hasMore ?? this.state.hasMore ?? true,
        });
    };

    /**
     * Метод очистки кешированных значений
     */
    // private clearCache = async () => {
    //     if (!this.useCache) {
    //         return;
    //     }

    //     const service = this.context as ICacheService;

    //     if (!service?.deleteById) {
    //         return;
    //     }

    //     await service.deleteById(this.props.metaRefId);
    // };

    private handleReset = async () => {
        try {
            if (this.props.reset) {
                this.props.reset();
            }

            // Очищаем дерево
            this.state.tree.clear();

            await this.init();
        } catch (error) {
            this.setState(() => ({ isLoading: false }));
        }
    };

    // ─── Поиск ───────────────────────────────────────────────────────────────

    /**
     * Метод поиска данных
     */
    private search = async () => {
        try {
            this.setState((prev) => ({
                isLoading: true,
                hasMoreBeforeSearch: prev.hasMoreBeforeSearch ?? prev.hasMore,
                error: undefined,
            }));

            const options: INodesOptions = {
                id: this.props.metaRefId,
                level: this.state.selectedLevel || 0,
                server: this.props.server,
                limit: this.state.pageSize,
            };

            if (this.state.search) {
                options.name = `%${this.state.search}%`;
            }

            // Получаем новое дерево
            const searchNodes = await this.getNodes(options);

            // Добавляем найденные узлы в основное дерево
            for (const node of searchNodes) {
                if (!this.state.tree.getNode(node.value)) {
                    this.state.tree.addNode(node);
                }
            }

            // Помечаем родителей найденных узлов как hasMore=true
            for (const node of searchNodes) {
                if (node.parentKey) {
                    const parent = this.state.tree.getNode(node.parentKey);
                    if (parent) parent.hasMore = true;
                }
            }

            // Строим отдельное дерево для отображения результатов поиска
            const searchTree = FilterRef.getTree(searchNodes);
            const searchResults = searchTree.getFullTree();

            /**
             * Помечаем промежуточные узлы (предков найденных элементов) флагом isSearchAncestor.
             * Критерий: узел имеет детей в дереве поиска — значит он не является найденным
             * листовым элементом, а лишь контекстом для отображения иерархии.
             *
             * Для таких узлов:
             * - Кнопка "Загрузить еще" не отображается
             * - Ленивая загрузка при expand не запускается
             * - isExpanded=true (раскрыты по умолчанию, установлено в getNodes)
             */
            this.markSearchAncestors(searchResults);

            this.setState(
                (prevState) => ({
                    isLoading: false,
                    options: prevState.tree.getFullTree(),
                    searchResults: prevState.search ? searchResults : undefined,
                }),
                () => {
                    // Используем актуальное состояние через this.state
                    if (this.useCache) this.saveCache({ nodes: this.state.tree.getAllData() });
                },
            );
        } catch (e) {
            console.error(e);
            this.setState(() => ({ isLoading: false, error: e as Error }));
            throw e;
        }
    };

    /**
     * Рекурсивно помечает узлы с детьми как промежуточных предков (isSearchAncestor=true).
     */
    private markSearchAncestors = (nodes: INode[]): void => {
        for (const node of nodes) {
            if (node.children && node.children.length > 0) {
                node.isSearchAncestor = true;
                this.markSearchAncestors(node.children as INode[]);
            }
        }
    };

    private resetParentHasMore = () => {
        this.setState((prev) => ({ options: prev.tree.getFullTree() }));
    };

    // ─── Выбор значений ───────────────────────────────────────────────────────

    /**
     * Обработчик изменения выбранных значений.
     *
     * @param value Массив nodeKey выбранных узлов.
     *   Во внешний onChange передаются бизнес-id (node.id), а не nodeKey.
     */
    onChange = (value: string[] = []) => {
        const selectedList = new Set(value);
        const selectedNodes = this.state.tree.getNodes(value);

        // ШАГ 1: при поиске помечаем родителей как hasMore=true
        if (this.state.search) {
            for (const node of selectedNodes) {
                if (node.parentKey) {
                    const parent = this.state.tree.getNode(node.parentKey);
                    if (parent) parent.hasMore = true;
                }
            }
        }

        // Формируем cached — минимальный набор для восстановления выделения
        const cached = new Set<INode>();
        const queue = [...selectedNodes];

        while (queue.length > 0) {
            const item = queue.pop();
            if (!item) continue;

            let isParentSelected = false;

            if (item.parentKey) {
                const parentNode = this.state.tree.getNode(item.parentKey);
                if (parentNode) {
                    isParentSelected = selectedList.has(parentNode.value);
                    queue.push(parentNode);
                }
            }

            if (!isParentSelected) {
                if (item.parentKey && selectedList.has(item.value)) {
                    const parentNode = this.state.tree.getNode(item.parentKey);
                    const withNeighbors = this.state.tree.getChildren(item.parentKey);
                    const parentHasMore = parentNode?.hasMore ?? false;
                    const allSiblingsSelected =
                        !parentHasMore &&
                        withNeighbors.length > 0 &&
                        withNeighbors.every((neighbor) => selectedList.has(neighbor.value));

                    if (allSiblingsSelected) {
                        for (const neighbor of withNeighbors) cached.add(neighbor);
                    } else {
                        cached.add(item);
                    }
                } else {
                    cached.add(item);
                }
            }
        }

        const items: IOnChangeItem[] = selectedNodes.map((node) => ({
            label: node.label,
            value: node.id,
            level: this.state.levels?.length ? node.level : undefined,
            type: 'ref',
            field: this.props.field,
        }));

        const allNodes = this.state.tree.getAllData();
        const result: IOnChangeResult = {
            id: this.props.container.id,
            filterBy: this.props.container.filterBy,
            comparison: this.props.container.comparison,
            type: this.props.container.type,
            items,
            cached: Array.from(allNodes),
        };

        this.setState(
            () => ({ value }),
            () => {
                this.props.onChange?.(result);
                if (this.useCache) this.saveCache();
            },
        );
    };

    // ─── Поисковая строка ─────────────────────────────────────────────────────

    /**
     * Метод события изменения строки поиска
     * @param value Искомое значение
     */
    onSearchChange = (value: string) => {
        this.setState((prevState) => ({
            search: value,
            // при вводе сохраняем текущие searchResults,
            // при пустой строке — очищаем
            searchResults: value.trim() ? prevState.searchResults : undefined,
        }));

        if (value.trim()) {
            this.useDebouncing(this.search);
        } else {
            // При сбросе строки поиска:
            // 1) перестраиваем options из дерева
            // 2) возвращаем корневой hasMore в состояние "как было до первого поиска"
            this.resetParentHasMore();
            this.setState((prev) => ({
                searchResults: undefined,
                hasMore: prev.hasMoreBeforeSearch ?? prev.hasMore,
            }));
        }
    };

    // ─── Раскрытие узла ───────────────────────────────────────────────────────

    /**
     * Обработчик раскрытия/сворачивания узла.
     * @param nodeKey nodeKey раскрываемого узла (INode.value).
     */
    onNodeExpand = (nodeKey: string) => {
        if (this.state.search) {
            // ── Режим поиска ──────────────────────────────────────────────────────
            const mainNode = this.state.tree.getNode(nodeKey);

            this.setState(
                (prev) => {
                    if (!prev.searchResults) {
                        // Поиск активен, но searchResults уже сброшены — просто
                        // обновляем основное дерево.
                        if (mainNode) mainNode.isExpanded = !mainNode.isExpanded;
                        return { options: prev.tree.getFullTree() };
                    }

                    // Вычисляем новое значение isExpanded из prev (актуального)
                    let newIsExpanded = false;
                    const toggle = (nodes: INode[]): INode[] =>
                        nodes.map((node) => {
                            if (node.value === nodeKey) {
                                newIsExpanded = !node.isExpanded;
                                return { ...node, isExpanded: newIsExpanded };
                            }
                            if (node.children?.length) {
                                return { ...node, children: toggle(node.children as INode[]) };
                            }
                            return node;
                        });

                    // prev.searchResults уже содержит детей, загруженных
                    // loadMoreNested (они попали туда через свой apдейтер ранее)
                    const newSearchResults = toggle(prev.searchResults);

                    // Синхронизируем узел основного дерева
                    if (mainNode) mainNode.isExpanded = newIsExpanded;

                    return {
                        options: prev.tree.getFullTree(),
                        searchResults: newSearchResults,
                    };
                },
                () => {
                    if (this.useCache) this.saveCache();
                },
            );
        } else {
            const node = this.state.tree.getNode(nodeKey);
            if (!node) return;
            node.isExpanded = !node.isExpanded;
            this.setState(
                (prev) => ({ options: prev.tree.getFullTree() }),
                () => {
                    if (this.useCache) this.saveCache();
                },
            );
        }
    };

    // ─── Ленивая загрузка ─────────────────────────────────────────────────────

    /**
     * Метод ленивой загрузки данных
     * @param parentNodeKey nodeKey родительского узла (или undefined для корня).
     */
    loadMore = async (parentNodeKey?: string): Promise<INode[]> => {
        if (parentNodeKey) return this.loadMoreNested(parentNodeKey);
        return this.loadMoreRoot();
    };

    /**
     * Обновляет детей указанного узла в дереве поиска после ленивой загрузки.
     * Намеренно НЕ изменяет isExpanded — им управляет onNodeExpand.
     * @param tree    Текущее дерево поиска
     * @param parentId Идентификатор родительского узла
     * @param newNodes Вновь загруженные узлы
     */
    private updateSearchTreeChildren = (tree: INode[], parentNodeKey: string, newNodes: INode[]): INode[] =>
        tree.map((node) => {
            if (node.value === parentNodeKey) {
                const existing = (node.children as INode[]) ?? [];
                const existingKeys = new Set(existing.map((c) => c.value));
                // Добавляем только те, которых ещё нет
                const toAdd = newNodes.filter((n) => !existingKeys.has(n.value));
                const children = [...existing, ...toAdd];
                return {
                    ...node,
                    isLoading: false,
                    hasMore: children.length >= this.state.pageSize,
                    children,
                };
            }
            if (node.children?.length) {
                return {
                    ...node,
                    children: this.updateSearchTreeChildren(node.children as INode[], parentNodeKey, newNodes),
                };
            }
            return node;
        });

    /**
     * Дозагрузка дочерних элементов.
     * @param parentNodeKey nodeKey раскрываемого узла.
     */
    private loadMoreNested = async (parentNodeKey: string): Promise<INode[]> => {
        const node = this.state.tree.getNode(parentNodeKey);
        if (!node) return [];

        try {
            node.isLoading = true;
            this.setState((prev) => ({ options: prev.tree.getFullTree() }));

            const data = await this.loadChildren({
                nodeKey: node.value,
                parentBusinessId: node.id,
                parentKey: node.value,
                level: node.level ?? 0,
            });

            this.populateTreeOrdered(data);
            node.isLoading = false;

            // Получаем обновленные элементы
            const updatedChildren = this.state.tree.getChildren(node.value);
            // Если элементов совсем нет, то выставляем флаг
            if (!updatedChildren?.length) node.hasChildren = false;

            // Записываем и кешируем новые значения только если включено кеширование
            this.setState(
                (prev) => {
                    // Синхронизируем searchResults с вновь загруженными потомками
                    const updatedSearchResults =
                        prev.search && prev.searchResults
                            ? this.updateSearchTreeChildren(prev.searchResults, parentNodeKey, data)
                            : prev.searchResults;

                    return {
                        options: prev.tree.getFullTree(),
                        searchResults: updatedSearchResults,
                    };
                },
                () => {
                    if (this.useCache) {
                        this.saveCache({
                            levels: this.state.levels,
                            nodes: this.state.tree.getAllData(),
                        });
                    }
                },
            );

            return data;
        } catch (e) {
            node.isLoading = false;
            this.setState((prev) => ({ options: prev.tree.getFullTree() }));
            throw e;
        }
    };

    /**
     * Ленивая загрузка корневых элементов
     * @returns Возвращает массив добавленных узлов
     */
    private loadMoreRoot = async (): Promise<INode[]> => {
        try {
            this.setState(() => ({ isLoading: true, error: undefined }));

            const nodes = await this.loadChildren();

            this.populateTreeOrdered(nodes);

            this.setState(
                (prev) => {
                    // Синхронизируем searchResults с загруженными корневыми узлами
                    const updatedSearchResults =
                        prev.search && prev.searchResults
                            ? this.appendToSearchResults(prev.searchResults, nodes)
                            : prev.searchResults;

                    return {
                        options: prev.tree.getFullTree(),
                        searchResults: updatedSearchResults,
                        isLoading: false,
                    };
                },
                () => {
                    if (this.useCache) {
                        this.saveCache({
                            levels: this.state.levels,
                            nodes: this.state.tree.getAllData(),
                        });
                    }
                },
            );

            return nodes;
        } catch (e) {
            this.setState(() => ({ isLoading: false }));
            throw e;
        }
    };

    /**
     * Добавляет новые корневые узлы к дереву результатов поиска.
     */
    private appendToSearchResults = (tree: INode[], newNodes: INode[]): INode[] => {
        const existingKeys = new Set(tree.map((n) => n.value));
        const toAdd = newNodes.filter((n) => !existingKeys.has(n.value));
        if (!toAdd.length) return tree;
        return [...tree, ...toAdd];
    };

    /**
     * Метод загрузки дочерних элементов
     */
    private loadChildren = async (params?: ILoadChildren): Promise<INode[]> => {
        const { nodeKey, parentBusinessId, parentKey, level = -1 } = params || {};

        // Считаем офсет по уже загруженным детям (по nodeKey)
        const children = this.state.tree.getChildren(nodeKey) || [];
        // Загружаемая страница
        const page = Math.floor(children.length / this.state.pageSize);

        // количество загруженных результатов именно в searchResults. Без этого offset считался бы
        // от  основного дерева, где могут быть  элементы, не относящихся к текущему поиску
        const searchChildrenCount =
            this.state.search && !nodeKey && this.state.searchResults ? this.state.searchResults.length : 0;

        const effectivePage = searchChildrenCount ? Math.floor(searchChildrenCount / this.state.pageSize) : page;

        const options: INodesOptions = {
            id: this.props.metaRefId,
            server: this.props.server,
            limit: this.state.pageSize,
            offset: effectivePage * this.state.pageSize,
            level: level + 1,
            ...(parentBusinessId != null ? { parent: parentBusinessId } : {}),
            ...(parentKey ? { parentKey } : {}),
        };

        // Если загружаемое значение входил в группу искомых
        if (this.state.search && this.state.selectedLevel > level) {
            options.name = `%${this.state.search}%`;
            options.level = this.state.selectedLevel || 0;
        }

        return this.getNodes(options);
    };

    // ─── Уровни ───────────────────────────────────────────────────────────────

    /**
     * Метод события изменения уровня
     */
    onLevelChange = (value: number) => {
        this.setState(
            () => ({ selectedLevel: value ?? 0 }),
            () => {
                if (this.useCache) this.saveCache();
                if (this.state.search) this.search();
            },
        );
    };

    // ─── Рендер ───────────────────────────────────────────────────────────────

    render() {
        return (
            <div className={styles.container}>
                <TreeMultiSelect<string>
                    cascadeSelection
                    popoverPlacement="top"
                    placeholder="Выберите элементы"
                    hasSearch
                    hasSelectedAll
                    fullWidth
                    singline
                    resizable
                    disabled={this.state.isLoading}
                    hasMore={this.state.hasMore}
                    isLoading={this.state.isLoading}
                    search={this.state.search}
                    searchType="remote"
                    style={{ maxWidth: '608px' }}
                    value={this.state.value}
                    treeOptions={this.state.options}
                    searchTreeOptions={this.state.searchResults}
                    onChange={this.onChange}
                    onSearchChange={this.onSearchChange}
                    loadMore={this.loadMore}
                    onExpand={this.onNodeExpand}
                    popoverClassName={styles.treePopover}
                    searchContainerClassName={styles.searchContainer}
                    searchAfter={
                        this.state.levels &&
                        this.state.levels.length > 0 && (
                            <Select
                                style={
                                    {
                                        '--ui-kit-multi-select-height': '32px',
                                        marginLeft: '5px',
                                        width: 130,
                                        overflow: 'hidden !important',
                                    } as CSSProperties
                                }
                                resettable={false}
                                options={this.state.levels}
                                value={this.state.selectedLevel}
                                onChange={this.onLevelChange}
                                hasSearch={false}
                                fullWidth={false}
                            />
                        )
                    }
                    error={this.state.error}
                />

                <IconButton
                    title="Обновить"
                    color="primary"
                    variant="outlined"
                    icon={UpdateIcon}
                    onClick={this.handleReset}
                    disabled={!!this.state.search.trim()}
                />
            </div>
        );
    }
}
