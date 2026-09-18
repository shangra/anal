jest.mock('ui-kit', () => ({
    FolderIcon: { name: 'FolderIcon' },
    SettingWrenchIcon: { name: 'SettingWrenchIcon' },
    AxisIcon: { name: 'AxisIcon' },
    EditIcon: { name: 'EditIcon' },
    IndicatorBarIcon: { name: 'IndicatorBarIcon' },
    AccessGiveIcon: { name: 'AccessGiveIcon' },
    AttachmentIcon: { name: 'AttachmentIcon' },
}));

jest.mock('components/MetadataHier/lib/getActions', () => ({
    getContextMenuActions: jest.fn(() => ['mocked-action']),
}));

import {
    FolderIcon,
    SettingWrenchIcon,
    AxisIcon,
    EditIcon,
    IndicatorBarIcon,
    AccessGiveIcon,
    AttachmentIcon,
} from 'ui-kit';
import { getContextMenuActions } from 'components/MetadataHier/lib/getActions';
import { buildFlatFromMap, adaptSingleNode } from 'components/MetadataHier/lib/flatAdapter';
import type { NormalizedNode, TreeMap } from 'components/MetadataHier/types';

const mockedGetContextMenuActions = getContextMenuActions as jest.Mock;

function makeNode(overrides: Partial<NormalizedNode>): NormalizedNode {
    return {
        nodeKey: 'root', id: 'root', name: 'root', description: '', crud: [],
        needToLoading: false, ownerId: null, classId: null, class: null, routes: null,
        parentId: null, childrenIds: [], depth: 0, expandable: false, isExpanded: false,
        isLoading: false, isLoaded: true, sortOrder: undefined, loadStatus: undefined,
        loadStrategy: 'lazy', events: {}, icon: null,
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('buildFlatFromMap — выбор иконки (getIcon)', () => {
    test('иконка с backend (node.icon) имеет приоритет над эвристикой', () => {
        const nodes: TreeMap = new Map([
            ['root', makeNode({ nodeKey: 'root', icon: 'axis', depth: 1, class: 'SomethingElse' })],
        ]);
        const result = buildFlatFromMap('root', nodes, new Set(), new Set(), 'server-1');
        expect(result[0]!.icon!.icon).toBe(AxisIcon);
    });

    test('неизвестный backend-токен должен деградировать к эвристике (регресс-тест)', () => {
        const nodes: TreeMap = new Map([
            ['root', makeNode({ nodeKey: 'root', icon: 'unknown-token', depth: 1 })],
        ]);
        const result = buildFlatFromMap('root', nodes, new Set(), new Set(), 'server-1');
        expect(result[0]!.icon!.icon).toBe(FolderIcon);
    });

    test('depth === 1 без backend-иконки -> folder', () => {
        const nodes: TreeMap = new Map([['root', makeNode({ nodeKey: 'root', depth: 1 })]]);
        expect(buildFlatFromMap('root', nodes, new Set(), new Set(), 's')[0]!.icon!.icon).toBe(FolderIcon);
    });

    test('depth === 2 без backend-иконки -> wrench', () => {
        const nodes: TreeMap = new Map([['root', makeNode({ nodeKey: 'root', depth: 2 })]]);
        expect(buildFlatFromMap('root', nodes, new Set(), new Set(), 's')[0]!.icon!.icon).toBe(SettingWrenchIcon);
    });

    test.each([
        ['Fields', AxisIcon],
        ['Indexes', IndicatorBarIcon],
        ['Keys', AccessGiveIcon],
        ['ForeignKeys', AttachmentIcon],
    ] as const)('class === %s без backend-иконки -> соответствующая иконка', (cls, expected) => {
        const nodes: TreeMap = new Map([['root', makeNode({ nodeKey: 'root', depth: 3, class: cls })]]);
        expect(buildFlatFromMap('root', nodes, new Set(), new Set(), 's')[0]!.icon!.icon).toBe(expected);
    });

    test('depth === 4 и родитель называется "Поля" -> pencil', () => {
        const nodes: TreeMap = new Map([
            ['root', makeNode({ nodeKey: 'root', name: 'Поля', depth: 3, childrenIds: ['root/child'] })],
            ['root/child', makeNode({ nodeKey: 'root/child', parentId: 'root', depth: 4 })],
        ]);
        const result = buildFlatFromMap('root', nodes, new Set(['root']), new Set(), 's');
        const child = result.find((n) => n.id === 'root/child')!;
        expect(child.icon!.icon).toBe(EditIcon);
    });

    test('depth === 4, но родитель называется НЕ "Поля" -> folder (дефолт)', () => {
        const nodes: TreeMap = new Map([
            ['root', makeNode({ nodeKey: 'root', name: 'Другое', depth: 3, childrenIds: ['root/child'] })],
            ['root/child', makeNode({ nodeKey: 'root/child', parentId: 'root', depth: 4 })],
        ]);
        const result = buildFlatFromMap('root', nodes, new Set(['root']), new Set(), 's');
        expect(result.find((n) => n.id === 'root/child')!.icon!.icon).toBe(FolderIcon);
    });

    test('ни одно условие эвристики не выполнено -> folder (дефолт)', () => {
        const nodes: TreeMap = new Map([['root', makeNode({ nodeKey: 'root', depth: 3, class: 'Other' })]]);
        expect(buildFlatFromMap('root', nodes, new Set(), new Set(), 's')[0]!.icon!.icon).toBe(FolderIcon);
    });
});

describe('buildFlatFromMap — раскрытие/сортировка/обход', () => {
    function makeTree(): TreeMap {
        return new Map([
            ['root', makeNode({ nodeKey: 'root', depth: 0, childrenIds: ['root/b', 'root/a'] })],
            ['root/a', makeNode({ nodeKey: 'root/a', id: 'a', name: 'Яблоко', parentId: 'root', depth: 1 })],
            ['root/b', makeNode({ nodeKey: 'root/b', id: 'b', name: 'Банан', parentId: 'root', depth: 1 })],
        ]);
    }

    test('не должен разворачивать детей неразвёрнутого узла', () => {
        const result = buildFlatFromMap('root', makeTree(), new Set(), new Set(), 's');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('root');
    });

    test('должен разворачивать детей развёрнутого узла, level увеличивается на 1', () => {
        const result = buildFlatFromMap('root', makeTree(), new Set(['root']), new Set(), 's');
        expect(result.map((n) => n.id)).toEqual(['root', 'root/b', 'root/a']);
        expect(result[0].level).toBe(-1);
        expect(result[1].level).toBe(0);
    });

    test('без sortOrder порядок детей должен сохраняться как в childrenIds (без сортировки)', () => {
        const result = buildFlatFromMap('root', makeTree(), new Set(['root']), new Set(), 's');
        expect(result.map((n) => n.id)).toEqual(['root', 'root/b', 'root/a']);
    });

    test('sortOrder = "asc" должен сортировать детей по имени (ru locale)', () => {
        const nodes = makeTree();
        nodes.set('root', { ...nodes.get('root')!, sortOrder: 'asc' });
        const result = buildFlatFromMap('root', nodes, new Set(['root']), new Set(), 's');
        expect(result.map((n) => n.title)).toEqual(['root', 'Банан', 'Яблоко']);
    });

    test('sortOrder = "desc" должен сортировать детей по имени в обратном порядке', () => {
        const nodes = makeTree();
        nodes.set('root', { ...nodes.get('root')!, sortOrder: 'desc' });
        const result = buildFlatFromMap('root', nodes, new Set(['root']), new Set(), 's');
        expect(result.map((n) => n.title)).toEqual(['root', 'Яблоко', 'Банан']);
    });

    test('должен корректно завершиться, если nodeKey отсутствует в карте (не упасть)', () => {
        const nodes: TreeMap = new Map();
        expect(buildFlatFromMap('unknown', nodes, new Set(), new Set(), 's')).toEqual([]);
    });

    test('hasChildren/loading/isSelected должны браться из node.expandable/isLoading/selectedIds', () => {
        const nodes: TreeMap = new Map([
            ['root', makeNode({ nodeKey: 'root', expandable: true, isLoading: true })],
        ]);
        const result = buildFlatFromMap('root', nodes, new Set(), new Set(['root']), 's');
        expect(result[0].hasChildren).toBe(true);
        expect(result[0].loading).toBe(true);
        expect(result[0].isSelected).toBe(true);
    });

    test('должен вызвать getContextMenuActions с (node, server) для каждого узла', () => {
        const nodes: TreeMap = new Map([['root', makeNode({ nodeKey: 'root' })]]);
        buildFlatFromMap('root', nodes, new Set(), new Set(), 'server-42');
        expect(mockedGetContextMenuActions).toHaveBeenCalledWith(nodes.get('root'), 'server-42');
    });
});

describe('adaptSingleNode', () => {
    test('level должен быть node.depth - 1', () => {
        const nodes: TreeMap = new Map();
        const node = makeNode({ nodeKey: 'root/a', depth: 2 });
        const result = adaptSingleNode(node, nodes, 's');
        expect(result.level).toBe(1);
    });

    test('opened должен браться из expandedIds по умолчанию — false без аргумента', () => {
        const node = makeNode({ nodeKey: 'root' });
        const result = adaptSingleNode(node, new Map(), 's');
        expect(result.opened).toBe(false);
    });

    test('opened должен быть true, если nodeKey есть в переданном expandedIds', () => {
        const node = makeNode({ nodeKey: 'root' });
        const result = adaptSingleNode(node, new Map(), 's', new Set(['root']));
        expect(result.opened).toBe(true);
    });

    test('isSelected должен быть true, если nodeKey есть в переданном selectedIds', () => {
        const node = makeNode({ nodeKey: 'root' });
        const result = adaptSingleNode(node, new Map(), 's', new Set(), new Set(['root']));
        expect(result.isSelected).toBe(true);
    });

    test('иконка должна вычисляться так же, как в buildFlatFromMap (та же getIcon)', () => {
        const node = makeNode({ nodeKey: 'root', icon: 'keys' });
        const result = adaptSingleNode(node, new Map(), 's');
        expect(result.icon!.icon).toBe(AccessGiveIcon);
    });
});
