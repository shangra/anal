export type ColumnGroupNodeKind = 'root' | 'group' | 'column';

/** Направление группировки колонок внутри группы. */
export type ColumnGroupOrientation = 'horizontal' | 'vertical';

/** Настройки внешнего вида ячейки колонки. */
export interface ColumnCellAppearance {
    /** Ширина ячейки колонки в px. */
    width?: number;
    /** Растягивать колонку по горизонтали (flex-grow). */
    flexGrow?: boolean;
    /** Высота строки ячейки колонки в px. */
    height?: number;
    /** Растягивать колонку по вертикали. */
    expandVertical?: boolean;
}

export interface ColumnGroupNode extends ColumnCellAppearance {
    id: string;
    kind: ColumnGroupNodeKind;
    title?: string; // group/root
    fieldId?: string; // column
    orientation?: ColumnGroupOrientation; // group
    /** Участвует ли колонка/группа в отображаемом дереве (вкл/выкл). */
    enabled?: boolean;
    children: ColumnGroupNode[]; // root/group
}

export interface ColumnGroupingSettingsState {
    root: ColumnGroupNode;
}

export const ROOT_GROUP_ID = 'root';

export function isColumnGroupNode(node: ColumnGroupNode): node is ColumnGroupNode & { kind: 'group' | 'root' } {
    return node.kind === 'group' || node.kind === 'root';
}

export function createColumnGroupId(): string {
    return `group_${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createColumnNode(fieldId: string, title?: string): ColumnGroupNode {
    return {
        id: `col_${fieldId}`,
        kind: 'column',
        title,
        fieldId,
        children: [],
        enabled: true,
    };
}

export function cloneColumnAppearance(node: ColumnGroupNode): ColumnCellAppearance {
    return {
        width: node.width,
        flexGrow: node.flexGrow,
        height: node.height,
        expandVertical: node.expandVertical,
    };
}

export function cloneColumnGroupNode(node: ColumnGroupNode): ColumnGroupNode {
    if (node.kind === 'column') {
        return {
            id: node.id,
            kind: node.kind,
            title: node.title,
            fieldId: node.fieldId,
            children: [],
            enabled: node.enabled,
            ...cloneColumnAppearance(node),
        };
    }
    return {
        id: node.id,
        kind: node.kind,
        title: node.title,
        orientation: node.orientation,
        enabled: node.enabled,
        children: node.children.map(cloneColumnGroupNode),
        ...cloneColumnAppearance(node),
    };
}

export function cloneColumnGroupingSettingsState(state: ColumnGroupingSettingsState): ColumnGroupingSettingsState {
    return { root: cloneColumnGroupNode(state.root) };
}

function isValidNode(raw: unknown): raw is ColumnGroupNode {
    if (!raw || typeof raw !== 'object') return false;
    const node = raw as Partial<ColumnGroupNode>;
    if (typeof node.id !== 'string') return false;
    if (node.kind === 'group' || node.kind === 'root') {
        return Array.isArray(node.children);
    }
    if (node.kind === 'column') {
        return typeof node.fieldId === 'string';
    }
    return false;
}

function isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isColumnGroupOrientation(value: unknown): value is ColumnGroupOrientation {
    return value === 'horizontal' || value === 'vertical';
}

function parseAppearance(raw: unknown): ColumnCellAppearance {
    const data = (raw ?? {}) as ColumnCellAppearance;
    return {
        width: isPositiveNumber(data.width) ? data.width : undefined,
        flexGrow: typeof data.flexGrow === 'boolean' ? data.flexGrow : undefined,
        height: isPositiveNumber(data.height) ? data.height : undefined,
        expandVertical: typeof data.expandVertical === 'boolean' ? data.expandVertical : undefined,
    };
}

function parseNode(raw: unknown, fallbackId: string, fallbackKind: ColumnGroupNodeKind): ColumnGroupNode {
    if (!isValidNode(raw)) {
        return {
            id: fallbackId,
            kind: fallbackKind,
            title: fallbackKind === 'column' ? undefined : 'Группа',
            children: [],
            enabled: true,
        };
    }
    const node = raw as ColumnGroupNode;
    if (node.kind === 'column') {
        return {
            id: node.id,
            kind: node.kind,
            title: typeof node.title === 'string' ? node.title : undefined,
            fieldId: node.fieldId,
            enabled: typeof node.enabled === 'boolean' ? node.enabled : true,
            children: [],
            ...parseAppearance(node),
        };
    }
    return {
        id: node.id,
        kind: node.kind,
        title: typeof node.title === 'string' && node.title ? node.title : 'Группа',
        orientation: isColumnGroupOrientation(node.orientation) ? node.orientation : undefined,
        enabled: typeof node.enabled === 'boolean' ? node.enabled : true,
        children: node.children
            .map((child, index) => parseNode(child, `${node.id}-child-${index}`, 'column'))
            .filter((child) => child.kind !== 'column' || typeof child.fieldId === 'string'),
        ...parseAppearance(node),
    };
}

export function parseColumnGroupingSettingsState(raw: unknown): ColumnGroupingSettingsState {
    const data = (raw ?? {}) as { root?: unknown };
    const root = parseNode(data.root, ROOT_GROUP_ID, 'root');
    return {
        root: {
            id: ROOT_GROUP_ID,
            kind: 'root',
            title: 'Список столбцов',
            children: root.children,
        },
    };
}

export function emptyColumnGroupingSettingsState(): ColumnGroupingSettingsState {
    return {
        root: {
            id: ROOT_GROUP_ID,
            kind: 'root',
            title: 'Список столбцов',
            children: [],
        },
    };
}

export interface ColumnGroupFlatRow extends ColumnCellAppearance {
    nodeId: string;
    parentId: string | null;
    kind: ColumnGroupNodeKind;
    depth: number;
    title: string;
    fieldId?: string;
    orientation?: ColumnGroupOrientation;
    hasChildren: boolean;
    enabled: boolean;
}
