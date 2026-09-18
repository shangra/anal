import { normalizeRootNode, normalizeChildNode, toRawNode, getChildren, getAncestors } from 'components/MetadataHier/lib/normalize';
import type { RawRootNode, RawChildNode, NormalizedNode, TreeMap } from 'components/MetadataHier/types';

describe('normalizeRootNode', () => {
    const raw: RawRootNode = {
        id: 'root-1',
        name: 'Метаданные',
        description: 'Корень',
        crud: ['rls'],
        needToLoading: true,
    };

    test('должен смаппить базовые поля из raw', () => {
        const node = normalizeRootNode(raw);
        expect(node.id).toBe('root-1');
        expect(node.nodeKey).toBe('root-1');
        expect(node.name).toBe('Метаданные');
        expect(node.description).toBe('Корень');
        expect(node.crud).toEqual(['rls']);
    });

    test('должен выставить ownerId/classId/class/routes/parentId в null для корня', () => {
        const node = normalizeRootNode(raw);
        expect(node.ownerId).toBeNull();
        expect(node.classId).toBeNull();
        expect(node.class).toBeNull();
        expect(node.routes).toBeNull();
        expect(node.parentId).toBeNull();
    });

    test('должен безусловно выставить sort = { strategy: "none" } для корня', () => {
        const node = normalizeRootNode(raw);
        expect(node.sort).toEqual({ strategy: 'none' });
    });

    test('должен взять icon из raw.icon, если он присутствует', () => {
        const node = normalizeRootNode({ ...raw, icon: 'folder' });
        expect(node.icon).toBe('folder');
    });

    test('должен выставить icon в null, если raw.icon отсутствует', () => {
        const node = normalizeRootNode(raw);
        expect(node.icon).toBeNull();
    });

    test('expandable должен браться из needToLoading', () => {
        expect(normalizeRootNode({ ...raw, needToLoading: true }).expandable).toBe(true);
        expect(normalizeRootNode({ ...raw, needToLoading: false }).expandable).toBe(false);
    });

    test('должен инициализировать состояние загрузки/выбора в дефолтные значения', () => {
        const node = normalizeRootNode(raw);
        expect(node.isExpanded).toBe(false);
        expect(node.isLoading).toBe(false);
        expect(node.isLoaded).toBe(false);
        expect(node.childrenIds).toEqual([]);
        expect(node.depth).toBe(0);
        expect(node.loadStrategy).toBe('lazy');
        expect(node.events).toEqual({});
    });
});

describe('normalizeChildNode', () => {
    const raw: RawChildNode = {
        id: 'child-1',
        owner_id: 'owner-1',
        class_id: 'class-1',
        class: 'Fields',
        routes: '/fields',
        name: 'Поле 1',
        description: 'Описание',
        crud: ['c', 'r', 'u', 'd'],
        needToLoading: true,
    };

    test('должен построить nodeKey через buildNodeKey(parentNodeKey, raw.id)', () => {
        const node = normalizeChildNode(raw, 'parent-key', 0);
        expect(node.nodeKey).toBe('parent-key/child-1');
    });

    test('depth должен быть parentDepth + 1', () => {
        const node = normalizeChildNode(raw, 'parent-key', 3);
        expect(node.depth).toBe(4);
    });

    test('parentId ДОЛЖЕН равняться parentNodeKey (непосредственный UI-предок)', () => {
        const node = normalizeChildNode(raw, 'parent-key', 0);
        expect(node.parentId).toBe('parent-key');
        expect(node.parentId).not.toBe(node.nodeKey);
        expect(node.parentId).not.toBe(node.id);
    });

    test('ownerId/classId/class/routes должны маппиться из соответствующих raw-полей', () => {
        const node = normalizeChildNode(raw, 'parent-key', 0);
        expect(node.ownerId).toBe('owner-1');
        expect(node.classId).toBe('class-1');
        expect(node.class).toBe('Fields');
        expect(node.routes).toBe('/fields');
    });

    test('sort должен браться из raw.sort, если присутствует', () => {
        const sort = { strategy: 'db' as const, parent: 'p', classId: 'c' };
        const node = normalizeChildNode({ ...raw, sort }, 'parent-key', 0);
        expect(node.sort).toEqual(sort);
    });

    test('sort должен по умолчанию быть { strategy: "none" }, если raw.sort отсутствует', () => {
        const node = normalizeChildNode(raw, 'parent-key', 0);
        expect(node.sort).toEqual({ strategy: 'none' });
    });

    test('icon должен браться из raw.icon, иначе null', () => {
        expect(normalizeChildNode({ ...raw, icon: 'axis' }, 'p', 0).icon).toBe('axis');
        expect(normalizeChildNode(raw, 'p', 0).icon).toBeNull();
    });

    describe('loadStrategy', () => {
        test('должен быть "eager", если у raw уже есть непустые children (предзагруженное поддерево)', () => {
            const node = normalizeChildNode({ ...raw, children: [{ ...raw, id: 'grandchild-1' }] }, 'parent-key', 0);
            expect(node.loadStrategy).toBe('eager');
        });

        test('должен быть "eager", если needToLoading === false (детей грузить не нужно)', () => {
            const node = normalizeChildNode({ ...raw, needToLoading: false }, 'parent-key', 0);
            expect(node.loadStrategy).toBe('eager');
        });

        test('должен быть "lazy" по умолчанию (нет children, needToLoading !== false)', () => {
            const node = normalizeChildNode(raw, 'parent-key', 0);
            expect(node.loadStrategy).toBe('lazy');
        });

        test('должен быть "lazy", если children — пустой массив', () => {
            const node = normalizeChildNode({ ...raw, children: [] }, 'parent-key', 0);
            expect(node.loadStrategy).toBe('lazy');
        });
    });

    test('events должен браться из raw.events, иначе {}', () => {
        const events = { onClick: { name: 'foo', props: {} } };
        expect(normalizeChildNode({ ...raw, events }, 'p', 0).events).toEqual(events);
        expect(normalizeChildNode(raw, 'p', 0).events).toEqual({});
    });
});

describe('toRawNode', () => {
    const node: NormalizedNode = {
        nodeKey: 'root/child-1',
        id: 'child-1',
        name: 'Поле 1',
        description: 'Описание',
        crud: ['r'],
        needToLoading: true,
        ownerId: 'owner-1',
        classId: 'class-1',
        class: 'Fields',
        routes: '/fields',
        parentId: 'root',
        childrenIds: [],
        depth: 1,
        expandable: true,
        isExpanded: false,
        isLoading: false,
        isLoaded: false,
        sortOrder: undefined,
        loadStatus: undefined,
        loadStrategy: 'lazy',
        events: {},
        icon: null,
    };

    test('должен смаппить основные поля обратно в RawChildNode-форму', () => {
        const raw = toRawNode(node);
        expect(raw).toMatchObject({
            id: 'child-1',
            owner_id: 'owner-1',
            class_id: 'class-1',
            class: 'Fields',
            routes: '/fields',
            name: 'Поле 1',
            description: 'Описание',
            crud: ['r'],
            needToLoading: true,
        });
    });

    test('owner_id должен дефолтиться в ZERO-UUID, если ownerId === null', () => {
        const raw = toRawNode({ ...node, ownerId: null });
        expect(raw.owner_id).toBe('00000000-0000-0000-0000-000000000000');
    });

    test('class_id/class/routes должны дефолтиться в пустую строку, если null', () => {
        const raw = toRawNode({ ...node, classId: null, class: null, routes: null });
        expect(raw.class_id).toBe('');
        expect(raw.class).toBe('');
        expect(raw.routes).toBe('');
    });
});

describe('getChildren', () => {
    function buildMap(): TreeMap {
        const map = new Map<string, NormalizedNode>();
        const base = {
            description: '', crud: [], needToLoading: false, ownerId: 'owner',
            classId: null, class: null, routes: null, depth: 1, expandable: false,
            isExpanded: false, isLoading: false, isLoaded: true, sortOrder: undefined,
            loadStatus: undefined, loadStrategy: 'lazy' as const, events: {}, icon: null,
            parentId: 'root',
        };
        map.set('root', {
            ...base, nodeKey: 'root', id: 'root', name: 'root', depth: 0,
            parentId: null,
            childrenIds: ['root/a', 'root/b'],
        });
        map.set('root/a', { ...base, nodeKey: 'root/a', id: 'a', name: 'A', childrenIds: [] });
        map.set('root/b', { ...base, nodeKey: 'root/b', id: 'b', name: 'B', childrenIds: [] });
        return map;
    }

    test('должен вернуть детей узла в порядке childrenIds', () => {
        const map = buildMap();
        const children = getChildren('root', map);
        expect(children.map((n) => n.id)).toEqual(['a', 'b']);
    });

    test('должен вернуть [], если узел не найден в карте', () => {
        const map = buildMap();
        expect(getChildren('unknown', map)).toEqual([]);
    });

    test('должен отфильтровать childrenIds, которых нет в карте (защита от рассинхрона)', () => {
        const map = buildMap();
        map.set('root', { ...map.get('root')!, childrenIds: ['root/a', 'root/missing'] });
        const children = getChildren('root', map);
        expect(children.map((n) => n.id)).toEqual(['a']);
    });
});

describe('getAncestors', () => {
    function buildMap(): TreeMap {
        const map = new Map<string, NormalizedNode>();
        const base = {
            description: '', crud: [], needToLoading: false, ownerId: null,
            classId: null, class: null, routes: null, expandable: false,
            isExpanded: false, isLoading: false, isLoaded: true, sortOrder: undefined,
            loadStatus: undefined, loadStrategy: 'lazy' as const, events: {}, icon: null,
        };
        map.set('root', {
            ...base, nodeKey: 'root', id: 'root', name: 'root', depth: 0,
            parentId: null, childrenIds: [],
        });
        map.set('root/a', {
            ...base, nodeKey: 'root/a', id: 'a', name: 'A', depth: 1,
            parentId: 'root', childrenIds: [],
        });
        map.set('root/a/b', {
            ...base, nodeKey: 'root/a/b', id: 'b', name: 'B', depth: 2,
            parentId: 'root/a', childrenIds: [],
        });
        return map;
    }

    test('должен вернуть цепочку предков от непосредственного родителя до корня', () => {
        const map = buildMap();
        const ancestors = getAncestors('root/a/b', map);
        expect(ancestors.map((n) => n.nodeKey)).toEqual(['root', 'root/a']);
    });

    test('должен вернуть [], если у узла нет parentId (корень)', () => {
        const map = buildMap();
        expect(getAncestors('root', map)).toEqual([]);
    });

    test('должен вернуть [], если узел не найден в карте', () => {
        const map = buildMap();
        expect(getAncestors('unknown', map)).toEqual([]);
    });

    test('должен остановиться, если родитель отсутствует в карте (защита от рассинхрона)', () => {
        const map = buildMap();
        map.set('root/a/b', { ...map.get('root/a/b')!, parentId: 'root/missing' });
        expect(getAncestors('root/a/b', map)).toEqual([]);
    });
});
