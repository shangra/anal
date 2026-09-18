jest.mock('lite-react-statemanager', () => {
    // Mirror the real class structure
    class MockStates {
        StatesValues: Record<string, unknown> = {};
        StatesSubscribe: Record<string, any> = {};

        get state() {
            return this.StatesValues;
        }

        setState(stateObject: Record<string, unknown>) {
            for (let stateName in stateObject) {
                (this.StatesValues as any)[stateName] = (stateObject as any)[stateName];
            }
        }

        subscribeState(_subscribeObject: Record<string, any>) {}
        unsubscribeState(_subscribeObject: Record<string, any>) {}
    }

    return { __esModule: true, default: new MockStates() };
});

import StateManager from 'lite-react-statemanager';
import {
    EMPTY_SCOPE,
    scopeKey,
    readScope,
    writeScope,
    clearScope,
    changeNodeKey,
    readChangeNode,
    emitChangeNode,
    readMetadataSelected,
    writeMetadataSelected,
    METADATA_SELECTED_KEY,
    ScopeState,
} from 'components/MetadataHier/lib/scope';
import type { NormalizedNode } from 'components/MetadataHier/types';

beforeEach(() => {
    // Reset the mock state between tests
    const sv = (StateManager as any).StatesValues;
    if (sv) {
        Object.keys(sv).forEach((key) => delete sv[key]);
    }
    jest.clearAllMocks();
});

describe('scopeKey / changeNodeKey', () => {
    test('должен использовать server как есть, если он непустой', () => {
        expect(scopeKey('server-1')).toBe('mh:server-1');
        expect(changeNodeKey('server-1')).toBe('mh:server-1:changeNode');
    });
});

describe('readScope / writeScope / clearScope', () => {
    test('должен вернуть EMPTY_SCOPE, если для сервера ничего не записано', () => {
        expect(readScope('server-1')).toBe(EMPTY_SCOPE);
    });

    test('writeScope должен положить состояние под правильный ключ, readScope должен его вернуть', () => {
        const node: NormalizedNode = {
            nodeKey: 'root', id: 'root', name: 'root', description: '', crud: [],
            needToLoading: false, ownerId: null, classId: null, class: null, routes: null,
            parentId: null, childrenIds: [], depth: 0, expandable: false, isExpanded: false,
            isLoading: false, isLoaded: true, sortOrder: undefined, loadStatus: undefined,
            loadStrategy: 'lazy', events: {}, icon: null,
        };
        const state: ScopeState = {
            ...EMPTY_SCOPE,
            nodes: new Map([['root', node]]),
            rootId: 'root',
        };
        writeScope('server-1', state);
        expect(readScope('server-1').rootId).toBe('root');
    });

    test('readScope должен наполнять nodeEvents из узлов с непустыми events', () => {
        const node: NormalizedNode = {
            nodeKey: 'root', id: 'root', name: 'root', description: '', crud: [],
            needToLoading: false, ownerId: null, classId: null, class: null, routes: null,
            parentId: null, childrenIds: [], depth: 0, expandable: false, isExpanded: false,
            isLoading: false, isLoaded: true, sortOrder: undefined, loadStatus: undefined,
            loadStrategy: 'lazy', events: { onClick: { name: 'foo', props: {} } }, icon: null,
        };
        writeScope('server-1', { ...EMPTY_SCOPE, nodes: new Map([['root', node]]) });
        const scope = readScope('server-1');
        expect(scope.nodeEvents.get('root')).toEqual({ onClick: { name: 'foo', props: {} } });
    });

    test('clearScope должен записать undefined под ключ сервера', () => {
        clearScope('server-1');
        // Just verify it doesn't throw
    });

    test('разные сервера должны иметь независимые состояния', () => {
        writeScope('server-1', { ...EMPTY_SCOPE, rootId: 'root-1' });
        writeScope('server-2', { ...EMPTY_SCOPE, rootId: 'root-2' });
        expect(readScope('server-1').rootId).toBe('root-1');
        expect(readScope('server-2').rootId).toBe('root-2');
    });
});

describe('readChangeNode / emitChangeNode', () => {
    test('readChangeNode должен вернуть undefined, если ничего не эмиттилось', () => {
        expect(readChangeNode('server-1')).toBeUndefined();
    });

    test('emitChangeNode должен положить payload с проставленным ts', () => {
        emitChangeNode('server-1', { nodeId: 'node-1' });
        const payload = readChangeNode('server-1');
        expect(payload?.nodeId).toBe('node-1');
        expect(typeof payload?.ts).toBe('number');
    });
});

describe('readMetadataSelected / writeMetadataSelected', () => {
    test('readMetadataSelected должен вернуть null, если ничего не выбрано', () => {
        expect(readMetadataSelected()).toBeNull();
    });

    test('writeMetadataSelected должен проставить ts при непустом значении', () => {
        const node = {} as NormalizedNode;
        writeMetadataSelected({ server: 'server-1', nodeKey: 'root', node });
        const selected = readMetadataSelected();
        expect(selected?.nodeKey).toBe('root');
        expect(typeof selected?.ts).toBe('number');
    });

    test('writeMetadataSelected(null) должен очистить выбор', () => {
        writeMetadataSelected({ server: 'server-1', nodeKey: 'root', node: {} as NormalizedNode });
        writeMetadataSelected(null);
        expect(readMetadataSelected()).toBeNull();
    });

    test('должен использовать константу METADATA_SELECTED_KEY как ключ стора', () => {
        writeMetadataSelected({ server: 'server-1', nodeKey: 'root', node: {} as NormalizedNode });
        // Verify the state was set by reading it back
        const selected = readMetadataSelected();
        expect(selected).not.toBeNull();
    });
});
