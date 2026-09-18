import type { ComponentType } from 'react';
import { TreeDataControlled } from 'ui-kit';

export type NodeEvents = 'onClick' | 'onDoubleClick';

export type NodeEventsList = {
    [key in NodeEvents]?: { name: string; props: any };
};

export type NodeSort =
    | { strategy: 'db'; parent: string; classId: string }
    | { strategy: 'manifest'; ownerRowId: string; orderPath: string }
    | { strategy: 'none' };

export interface RawBaseNode {
    id: string;
    name: string;
    description: string;
    crud: string[];
    needToLoading: boolean;
    sort?: NodeSort;
    icon?: string | null;
    /** Включён ли RLS для объекта (settings.rls === true). Присылается бэкендом в узле дерева */
    rls?: boolean;
}
export interface RawRootNode extends RawBaseNode {}

export interface RawChildNode extends RawBaseNode {
    owner_id: string;
    class_id: string;
    class: string;
    routes: string;
    children?: RawChildNode[];
    events?: NodeEventsList;
}

export type RawNode = RawRootNode | RawChildNode;

export function isRawChildNode(node: RawNode): node is RawChildNode {
    return 'owner_id' in node;
}

export type LoadStatus = 'error' | undefined;

export type NodeLoadStrategy = 'lazy' | 'eager';

export interface NormalizedNode {
    nodeKey: string;
    id: string;
    name: string;
    description: string;
    crud: string[];
    needToLoading: boolean;
    ownerId: string | null;
    classId: string | null;
    class: string | null;
    routes: string | null;
    /** nodeKey непосредственного UI-предка в дереве.
     *  Используется для рендера (индент в ui-kit) и эвристик UI (иконка «Поля»).
     *  null для корня. Совпадает с ключом в TreeMap.
     *  Внимание: для запросов к backend (metadata/link, add/delete/update) используйте
     *  findNearestLazyAncestor — он ищет ближайшего lazy-предка вверх по дереву. */
    parentId: string | null;
    childrenIds: string[];

    depth: number;
    expandable: boolean;
    isExpanded: boolean;
    isLoading: boolean;
    isLoaded: boolean;
    sortOrder: undefined | 'asc' | 'desc';
    /** Статус последней попытки загрузки поддерева */
    loadStatus: LoadStatus;

    loadStrategy: NodeLoadStrategy;
    events: NodeEventsList;
    sort?: NodeSort;
    /** Токен иконки, присланный backend (см. flatAdapter.ts: icons). null — нет. */
    icon: string | null;
    /** Включён ли RLS для объекта (settings.rls === true). Используется для гейта кнопки EditAccess. */
    rls?: boolean;
}

export interface TreeAction {
    component: ComponentType<{ node: TreeDataControlled }>;
}

export type TreeMap = Map<string, NormalizedNode>;
