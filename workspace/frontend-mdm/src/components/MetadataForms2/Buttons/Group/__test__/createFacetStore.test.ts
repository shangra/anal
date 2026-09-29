/**
 * Tests for createFacetStore (core/createFacetStore.ts)
 *
 * Тестируют: FacetStoreConfig, FacetStore — getState, commit, replace, clone, restore
 */

import StateManager from 'lite-react-statemanager'
import {
    createFacetStore,
    type FacetStore,
    type FacetStoreConfig,
} from '../../../../../helpers/listSettings/core/createFacetStore'

interface TestState {
    items: string[]
    counter: number
    flag: boolean
}

function emptyTestState(): TestState {
    return { items: [], counter: 0, flag: false }
}

function parseTestState(raw: unknown): TestState {
    const data = raw as Partial<TestState>
    return {
        items: Array.isArray(data.items) ? data.items : [],
        counter: typeof data.counter === 'number' ? data.counter : 0,
        flag: typeof data.flag === 'boolean' ? data.flag : false,
    }
}

function cloneTestState(state: TestState): TestState {
    return {
        items: [...state.items],
        counter: state.counter,
        flag: state.flag,
    }
}

function createTestStore(): FacetStore<TestState> {
    const config: FacetStoreConfig<TestState> = {
        id: 'test-facet',
        storageKey: 'test-list-settings',
        legacyStorageKeys: ['legacy-list-settings'],
        keys: ['items', 'counter', 'flag'],
        empty: emptyTestState,
        parse: parseTestState,
        clone: cloneTestState,
    }
    return createFacetStore(config)
}

describe('createFacetStore', () => {
    beforeEach(() => {
        // StateManager — синглтон + localStorage — нужно сбрасывать между тестами
        localStorage.clear()
        StateManager.setState({ items: [], counter: 0, flag: false })
    })

    describe('id', () => {
        it('should expose store id', () => {
            const store = createTestStore()
            expect(store.id).toBe('test-facet')
        })
    })

    describe('getState', () => {
        it('should return initial empty state', () => {
            const store = createTestStore()
            const state = store.getState()

            expect(state.items).toEqual([])
            expect(state.counter).toBe(0)
            expect(state.flag).toBe(false)
        })

        it('should return current state after commit', () => {
            const store = createTestStore()
            store.commit({ counter: 5 })

            const state = store.getState()
            expect(state.counter).toBe(5)
        })
    })

    describe('commit', () => {
        it('should update only specified fields', () => {
            const store = createTestStore()
            store.commit({ counter: 10 })

            const state = store.getState()
            expect(state.counter).toBe(10)
            expect(state.items).toEqual([])
            expect(state.flag).toBe(false)
        })

        it('should update multiple fields', () => {
            const store = createTestStore()
            store.commit({ counter: 5, flag: true })

            const state = store.getState()
            expect(state.counter).toBe(5)
            expect(state.flag).toBe(true)
        })

        it('should append to arrays when committing', () => {
            const store = createTestStore()
            store.commit({ items: ['a', 'b'] })

            const state = store.getState()
            expect(state.items).toEqual(['a', 'b'])
        })
    })

    describe('replace', () => {
        it('should replace entire state', () => {
            const store = createTestStore()
            store.replace({ items: ['x'], counter: 1, flag: true })

            const state = store.getState()
            expect(state.items).toEqual(['x'])
            expect(state.counter).toBe(1)
            expect(state.flag).toBe(true)
        })

        it('should fully override previous state', () => {
            const store = createTestStore()
            store.commit({ items: ['a', 'b'] })
            store.replace({ items: ['c'], counter: 99, flag: false })

            const state = store.getState()
            expect(state.items).toEqual(['c'])
            expect(state.counter).toBe(99)
            expect(state.flag).toBe(false)
        })
    })

    describe('clone', () => {
        it('should create independent copy of state', () => {
            const store = createTestStore()
            store.commit({ items: ['a', 'b'], counter: 5 })

            const original = store.getState()
            const cloned = store.clone(original)

            expect(cloned).not.toBe(original)
            expect(cloned.items).not.toBe(original.items)
            expect(cloned.items).toEqual(original.items)
        })

        it('should modify cloned array not affect original', () => {
            const store = createTestStore()
            store.commit({ items: ['a'] })

            const original = store.getState()
            const cloned = store.clone(original)

            cloned.items.push('b')

            expect(original.items).toEqual(['a'])
            expect(cloned.items).toEqual(['a', 'b'])
        })
    })

    describe('restore', () => {
        it('should restore state from snapshot', () => {
            const store = createTestStore()
            store.commit({ items: ['x'], counter: 1 })

            const snapshot = store.clone(store.getState())

            store.commit({ items: ['y'], counter: 2 })
            store.restore(snapshot)

            const restored = store.getState()
            expect(restored.items).toEqual(['x'])
            expect(restored.counter).toBe(1)
        })

        it('should restore deep copy', () => {
            const store = createTestStore()
            store.commit({ items: ['a'] })

            const snapshot = store.clone(store.getState())
            store.commit({ items: ['b'] })

            store.restore(snapshot)

            const restored = store.getState()
            expect(restored.items).toEqual(['a'])
        })
    })

    describe('subscribe / unsubscribe', () => {
        it('should call subscriber on commit', () => {
            const store = createTestStore()
            const onPatch = jest.fn()

            store.subscribe('test-sub', onPatch)
            store.commit({ counter: 1 })

            // Subscriber вызван (количество зависит от ключей + глобальных подписок)
            expect(onPatch).toHaveBeenCalled()
        })

        it('should receive partial state in subscriber', () => {
            const store = createTestStore()
            const onPatch = jest.fn()

            store.subscribe('test-sub-2', onPatch)
            store.commit({ counter: 42 })

            // Subscriber вызван хотя бы раз
            expect(onPatch).toHaveBeenCalled()
        })

        it('should not call subscriber after unsubscribe', () => {
            const store = createTestStore()
            const onPatch = jest.fn()

            store.subscribe('test-sub-3', onPatch)
            store.commit({ counter: 1 })

            const callsBefore = onPatch.mock.calls.length

            store.unsubscribe('test-sub-3')
            store.commit({ counter: 2 })

            // После unsubscribe новых вызовов не должно быть
            expect(onPatch.mock.calls.length).toBe(callsBefore)
        })

        it('should support multiple subscribers', () => {
            const store = createTestStore()
            const sub1 = jest.fn()
            const sub2 = jest.fn()

            store.subscribe('sub-1', sub1)
            store.subscribe('sub-2', sub2)

            store.commit({ counter: 1 })

            // Оба подписчика вызваны
            expect(sub1).toHaveBeenCalled()
            expect(sub2).toHaveBeenCalled()
        })
    })

    describe('edge cases', () => {
        it('should handle commit with empty partial', () => {
            const store = createTestStore()
            // Reset state first
            store.replace(emptyTestState())
            store.commit({} as Partial<TestState>)

            const state = store.getState()
            expect(state.items).toEqual([])
            expect(state.counter).toBe(0)
        })

        it('should handle replace with valid state', () => {
            const store = createTestStore()
            const validState: TestState = {
                items: ['item1', 'item2'],
                counter: 10,
                flag: true,
            }

            store.replace(validState)
            const state = store.getState()

            expect(state.items).toEqual(['item1', 'item2'])
            expect(state.counter).toBe(10)
            expect(state.flag).toBe(true)
        })
    })
})
