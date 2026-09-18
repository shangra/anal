jest.mock('lite-react-statemanager', () => ({
    __esModule: true,
    default: { setState: jest.fn() },
}));

import StateManager from 'lite-react-statemanager';
import { saveTree, saveTreePartial, loadTree, clearCache, STORAGE_TTL_MS } from 'components/MetadataHier/lib/cache';
import { EMPTY_SCOPE, ScopeState } from 'components/MetadataHier/lib/scope';
import type { NormalizedNode } from 'components/MetadataHier/types';

const node: NormalizedNode = {
    nodeKey: 'root', id: 'root', name: 'root', description: '', crud: [],
    needToLoading: false, ownerId: null, classId: null, class: null, routes: null,
    parentId: null,
    childrenIds: [], depth: 0, expandable: false, isExpanded: false,
    isLoading: false, isLoaded: true, sortOrder: undefined, loadStatus: undefined,
    loadStrategy: 'lazy', events: {}, icon: null,
};

function buildState(overrides: Partial<ScopeState> = {}): ScopeState {
    return { ...EMPTY_SCOPE, nodes: new Map([['root', node]]), rootId: 'root', ...overrides };
}

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.restoreAllMocks();
});

describe('saveTree / loadTree — round trip', () => {
    test('должен сохранить и корректно восстановить дерево (Map/Set сериализация)', () => {
        const state = buildState({ expandedIds: new Set(['root']) });
        saveTree('server-1', state, true);

        const result = loadTree('server-1');
        expect(result).not.toBeNull();
        expect(result!.state.rootId).toBe('root');
        expect(result!.state.nodes.get('root')).toEqual(node);
        expect(result!.state.expandedIds.has('root')).toBe(true);
    });

    test('разные сервера должны использовать разные ключи localStorage', () => {
        saveTree('server-1', buildState({ rootId: 'root-1' }), true);
        saveTree('server-2', buildState({ rootId: 'root-2' }), true);

        expect(loadTree('server-1')?.state.rootId).toBe('root-1');
        expect(loadTree('server-2')?.state.rootId).toBe('root-2');
    });


    test('selectedIds ВСЕГДА восстанавливается как пустой Set (намеренно не сохраняется)', () => {
        const state = buildState({ selectedIds: new Set(['root']) });
        saveTree('server-1', state, true);
        const result = loadTree('server-1');
        expect(result!.state.selectedIds.size).toBe(0);
    });

    test('multiSelectMode/treeVersion/nodeEvents всегда сбрасываются при восстановлении', () => {
        saveTree('server-1', buildState(), true);
        const result = loadTree('server-1')!;
        expect(result.state.multiSelectMode).toBe(false);
        expect(result.state.treeVersion).toBe(0);
        expect(result.state.nodeEvents.size).toBe(0);
    });
});

describe('loadTree — TTL / staleness', () => {
    test('должен вернуть null, если в localStorage ничего нет', () => {
        expect(loadTree('server-1')).toBeNull();
    });

    test('должен вернуть null при некорректном JSON', () => {
        localStorage.setItem('mh-cache:server-1', '{not valid json');
        expect(loadTree('server-1')).toBeNull();
    });

    test('должен вернуть null, если в данных нет cachedAt', () => {
        localStorage.setItem('mh-cache:server-1', JSON.stringify({ schemaVersion: 1, rootId: 'root', nodes: [], expandedIds: [] }));
        expect(loadTree('server-1')).toBeNull();
    });

    test('должен вернуть null, если schemaVersion не совпадает (кэш устарел по схеме)', () => {
        localStorage.setItem(
            'mh-cache:server-1',
            JSON.stringify({ schemaVersion: 2, rootId: 'root', nodes: [], expandedIds: [], cachedAt: Date.now() }),
        );
        expect(loadTree('server-1')).toBeNull();
    });

    test('должен вернуть null, если schemaVersion отсутствует', () => {
        localStorage.setItem(
            'mh-cache:server-1',
            JSON.stringify({ rootId: 'root', nodes: [], expandedIds: [], cachedAt: Date.now() }),
        );
        expect(loadTree('server-1')).toBeNull();
    });

    test('isStale должен быть false, если кэш моложе STORAGE_TTL_MS', () => {
        const state = buildState();
        saveTree('server-1', state, true);
        expect(loadTree('server-1')!.isStale).toBe(false);
    });

    test('isStale должен быть true, если кэш старше STORAGE_TTL_MS', () => {
        jest.spyOn(Date, 'now').mockReturnValueOnce(1_000_000); // время сохранения
        saveTree('server-1', buildState(), true);

        jest.spyOn(Date, 'now').mockReturnValueOnce(1_000_000 + STORAGE_TTL_MS + 1); // момент чтения
        expect(loadTree('server-1')!.isStale).toBe(true);
    });
});

describe('saveTree — cachedAt', () => {
    test('fullRefresh=true должен всегда проставлять текущий Date.now() как cachedAt', () => {
        jest.spyOn(Date, 'now').mockReturnValue(500);
        saveTree('server-1', buildState({ cachedAt: 100 }), true);
        expect(loadTree('server-1')!.state.cachedAt).toBe(500);
    });

    test('fullRefresh=false должен сохранить существующий state.cachedAt, если он есть', () => {
        saveTree('server-1', buildState({ cachedAt: 123 }), false);
        expect(loadTree('server-1')!.state.cachedAt).toBe(123);
    });

    test('saveTreePartial должен вести себя как saveTree(..., false)', () => {
        saveTreePartial('server-1', buildState({ cachedAt: 777 }));
        expect(loadTree('server-1')!.state.cachedAt).toBe(777);
    });

    test('fullRefresh=false без state.cachedAt должен подставить Date.now()', () => {
        jest.spyOn(Date, 'now').mockReturnValue(999);
        saveTree('server-1', buildState({ cachedAt: null }), false);
        expect(loadTree('server-1')!.state.cachedAt).toBe(999);
    });
});

describe('saveTree — обработка ошибок', () => {
    test('QuotaExceededError должен показать модалку через StateManager, не бросать исключение', () => {
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('quota', 'QuotaExceededError');
        });

        expect(() => saveTree('server-1', buildState(), true)).not.toThrow();
        expect(StateManager.setState).toHaveBeenCalledWith(
            expect.objectContaining({
                modal: expect.objectContaining({ show: true }),
            }),
        );
    });

    test('прочие ошибки должны логироваться в console.error, не показывать модалку', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('unexpected');
        });

        expect(() => saveTree('server-1', buildState(), true)).not.toThrow();
        expect(consoleSpy).toHaveBeenCalled();
        expect(StateManager.setState).not.toHaveBeenCalled();
    });
});

describe('clearCache', () => {
    test('должен удалить запись из localStorage', () => {
        saveTree('server-1', buildState(), true);
        clearCache('server-1');
        expect(loadTree('server-1')).toBeNull();
    });

    test('не должен бросать исключение, если localStorage.removeItem падает', () => {
        jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('fail');
        });
        expect(() => clearCache('server-1')).not.toThrow();
    });
});
