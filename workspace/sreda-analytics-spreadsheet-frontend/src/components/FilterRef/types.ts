import { SelectOption, TreeSelectOption } from 'ui-kit';

import { TFilterBy } from '../FilterComplexCMP/FilterModal/types';

/**
 * Интерфейс узла дерева.
 *
 * value (из TreeSelectOption) — составной уникальный ключ (nodeKey).
 *   Формат: «parentNodeKey__businessId» для дочерних, «businessId» для корневых.
 *   Используется TreeMultiSelect для onExpand / loadMore / выделения.
 *
 * id — исходный бизнес-идентификатор с бэкенда.
 *   Используется при обращениях к API и во внешнем выводе onChange.
 */
export interface INode extends TreeSelectOption {
    /** Исходный бизнес-идентификатор (id с бэкенда). */
    id: string | number;
    /** nodeKey родительского узла. null у корневых. */
    parentKey: string | null;
    /** Бизнес-id родителя (для API-запросов). null у корневых. */
    parentId: string | number | null;
    /** Номер уровня текущего элемента. */
    level: number;
    /**
     * Флаг: узел является промежуточным предком в дереве поиска.
     * Для таких узлов не отображается кнопка "Загрузить ещё".
     */
    isSearchAncestor?: boolean;
}

/**
 * Абстрактный интерфейс дерева.
 * Все методы принимают / возвращают nodeKey (INode.value).
 */
export interface ITree {
    /** Поиск узла по nodeKey. */
    getNode(nodeKey: string): INode | undefined;
    /** Поиск узлов по массиву nodeKey. */
    getNodes(nodeKeys: string[]): INode[];
    /** Поиск узлов по бизнес-id (может вернуть несколько, если id повторяется). */
    getNodesByBusinessId(businessId: string | number): INode[];
    /** Плоский список всех узлов. */
    getAllData(): INode[];
    /** Дочерние узлы; без аргумента — корневые узлы. */
    getChildren(parentNodeKey?: string): INode[];
    addNode(node: INode): void;
    addNodes(nodes: INode[]): void;
    getFullTree(): INode[];
    /**
     * Добавляет узел или, если он уже существует, обновляет данные и перемещает
     * в конец родительского Set для сохранения порядка сортировки из ответа сервера.
     */
    addOrMoveNode(node: INode): void;

    clear(): void;
}

/**
 * Один элемент в container.items (передаётся в FilterRef через props).
 * Содержит filterBy, value и опциональные мета-поля.
 */
export interface IContainerItem {
    filterBy: TFilterBy;
    value: string | number;
    level?: number;
    label?: string;
    /** Отображаемое имя узла — может присутствовать при flat-режиме без уровней. */
    name?: string;
}

/**
 * Контейнер фильтра, передаваемый в FilterRef через props.
 */
export interface IContainer {
    id: string;
    filterBy: TFilterBy;
    comparison: 'or' | 'and';
    type: string;
    items?: IContainerItem[];
    cached?: INode[];
}

/**
 * Один элемент в результирующем items, который FilterRef
 * передаёт во внешний onChange.
 */
export interface IOnChangeItem {
    label: string;
    value: string | number;
    level?: number;
    type: string;
    field: string;
}

/**
 * Результат, который FilterRef передаёт во внешний onChange.
 */
export interface IOnChangeResult {
    id: string;
    filterBy: TFilterBy;
    comparison: 'or' | 'and';
    type: string;
    items: IOnChangeItem[];
    cached: INode[];
}

export interface IState {
    pageSize: number;
    search: string;
    value: string[];
    tree: ITree;
    levels: SelectOption<number>[] | null;
    selectedLevel: number;
    options: INode[];
    searchResults?: INode[];
    hasMore: boolean;
    hasMoreBeforeSearch?: boolean;
    isLoading: boolean;
    error: undefined | Error;
}

export interface IProps {
    field: string;
    container: IContainer;
    type: string;
    metaRefId: string;
    server?: string;
    onChange?: (result: IOnChangeResult) => void;
    reset?: () => void;
}

export interface INodesOptions {
    id: string | number;
    level: number;
    parent?: string | number;
    parentKey?: string;
    name?: string;
    where?: Record<string, unknown>;
    server?: string;
    limit?: number;
    offset?: number;
}

export interface INodesResponse {
    id: string | number;
    name: string;
    children: INodesResponse[];
    [key: string]: unknown;
}

export interface ILevelsOptions {
    metaRefId: string;
    server?: string;
}

export interface ILevelsResponse {
    description: string;
    level: number;
    name: string;
}

/**
 * Параметры запроса полных путей до выбранных узлов.
 * Используется когда container.cached отсутствует, но container.items содержит выбранные id.
 */
export interface INodePathsOptions {
    /** metaRefId справочника */
    metaRefId: string;
    /** Массив бизнес-id, для которых нужно восстановить пути */
    items: Array<{ id: string | number; level: number }>;
    server?: string;
}

export interface ICacheService {
    save(data: unknown): Promise<unknown>;
    read(id: string | number): Promise<unknown>;
    readAll(): Promise<unknown>;
    deleteById(id: string): Promise<unknown>;
}

export interface ICacheData {
    id: string;
    createdAt: number;
    search: string;
    levels: SelectOption<number>[] | null;
    selectedLevel: number;
    nodes: INode[];
    hasMore?: boolean;
}

export interface ILoadChildren {
    /** nodeKey раскрываемого узла (для tree.getChildren). */
    nodeKey?: string;
    /** Бизнес-id родителя (для API-запроса). */
    parentBusinessId?: string | number;
    /** nodeKey родителя (для построения ключей новых узлов). */
    parentKey?: string;
    level?: number;
}
