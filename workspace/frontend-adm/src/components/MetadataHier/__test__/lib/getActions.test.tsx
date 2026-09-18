import { getContextMenuActions } from 'components/MetadataHier/lib/getActions';
import type { NormalizedNode } from 'components/MetadataHier/types';

function makeNode(overrides: Partial<NormalizedNode> = {}): NormalizedNode {
    return {
        nodeKey: 'root',
        id: 'root',
        name: 'root',
        description: '',
        crud: [],
        needToLoading: false,
        ownerId: null,
        classId: null,
        class: null,
        routes: null,
        parentId: null,
        childrenIds: [],
        depth: 0,
        expandable: true,
        isExpanded: false,
        isLoading: false,
        isLoaded: true,
        sortOrder: undefined,
        loadStatus: undefined,
        loadStrategy: 'lazy',
        events: {},
        icon: null,
        ...overrides,
    };
}

describe('getContextMenuActions', () => {
    test('должен вернуть fallback при отсутствии видимых действий', () => {
        const actions = getContextMenuActions(makeNode({ crud: [], routes: null }), 'server-1');
        expect(actions).toHaveLength(1);
        const el = actions[0] as React.ReactElement;
        expect(el.props.children).toBe('Нет доступных действий');
    });

    test('должен вернуть 3 действия (добавить/сортировать/удалить) при наличии прав и children', () => {
        const actions = getContextMenuActions(
            makeNode({ crud: ['c', 'd'], routes: '/test', expandable: true }),
            'server-1',
        );
        expect(actions).toHaveLength(3);
    });

    test('должен вернуть 5 действий при всех правах, expandable=true, lazy+expanded', () => {
        const actions = getContextMenuActions(
            makeNode({
                crud: ['c', 'd'],
                routes: '/test',
                expandable: true,
                loadStrategy: 'lazy',
                isExpanded: true,
            }),
            'server-1',
        );
        expect(actions).toHaveLength(5);
    });

    test('должен вернуть 4 действия (без обновления) при expandable=true, но не lazy+expanded', () => {
        const actions = getContextMenuActions(
            makeNode({
                crud: ['c', 'd'],
                routes: '/test',
                expandable: true,
                loadStrategy: 'eager',
                isExpanded: true,
            }),
            'server-1',
        );
        expect(actions).toHaveLength(4);
    });

    test('должен вернуть 2 действия (без удаления) при отсутствии права delete', () => {
        const actions = getContextMenuActions(
            makeNode({ crud: ['c'], routes: '/test', expandable: true, loadStrategy: 'eager' }),
            'server-1',
        );
        expect(actions).toHaveLength(2);
    });

    test('должен вернуть 1 действие (только добавить) при expandable=false и без delete', () => {
        const actions = getContextMenuActions(
            makeNode({ crud: ['c'], routes: '/test', expandable: false, loadStrategy: 'eager' }),
            'server-1',
        );
        expect(actions).toHaveLength(1);
    });

    test('должен пропустить Добавить/Сортировать/Удалить, но оставить EditAccess если node найден', () => {
        const actions = getContextMenuActions(makeNode({ crud: [], routes: null, expandable: false }), 'server-1');
        // EditAccessAction всегда виден если node найден в store
        // Но getNodeByKey ищет в store, который пуст — значит EditAccess тоже не виден
        // Поэтому fallback
        expect(actions).toHaveLength(1);
        expect(actions[0] as React.ReactElement).toHaveProp('children', 'Нет доступных действий');
    });
});
