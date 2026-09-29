/**
 * Tests for attachListSettingsRevision (react/attachRevision.ts)
 *
 * Тестируют интеграцию React-компонентов с revision bus
 */

import { attachListSettingsRevision } from '../../../../../helpers/listSettings/react/attachRevision'
import {
    getListSettingsRevision,
    emitListSettingsRevision,
    unsubscribeListSettingsRevision,
} from '../../../../../helpers/listSettings/core/revisionBus'

describe('attachListSettingsRevision', () => {
    const registeredNames: string[] = []

    beforeEach(() => {
        for (const name of registeredNames) {
            unsubscribeListSettingsRevision(name)
        }
        registeredNames.length = 0
    })

    function register(name: string): void {
        registeredNames.push(name)
    }

    function unregister(name: string): void {
        const idx = registeredNames.indexOf(name)
        if (idx !== -1) registeredNames.splice(idx, 1)
    }

    it('should subscribe to revision changes', () => {
        const mockHost = {
            setState: jest.fn(),
        }
        const name = `attach-test-${Date.now()}`

        const unsubscribe = attachListSettingsRevision(mockHost, name)
        register(name)

        emitListSettingsRevision()

        expect(mockHost.setState).toHaveBeenCalledWith({
            listSettingsRevision: expect.any(Number),
        })

        unsubscribe()
        unregister(name)
    })

    it('should pass updated revision value to host', () => {
        const mockHost = {
            setState: jest.fn(),
        }
        const name = `attach-rev-${Date.now()}`

        const before = getListSettingsRevision()
        const unsubscribe = attachListSettingsRevision(mockHost, name)
        register(name)

        emitListSettingsRevision()

        const callArgs = mockHost.setState.mock.calls[0][0] as { listSettingsRevision: number }
        expect(callArgs.listSettingsRevision).toBe(before + 1)

        unsubscribe()
        unregister(name)
    })

    it('should unsubscribe on cleanup', () => {
        const mockHost = {
            setState: jest.fn(),
        }
        const name = `attach-unsub-${Date.now()}`

        const unsubscribe = attachListSettingsRevision(mockHost, name)
        register(name)

        emitListSettingsRevision()
        expect(mockHost.setState).toHaveBeenCalledTimes(1)

        unsubscribe()
        unregister(name)
        emitListSettingsRevision()
        expect(mockHost.setState).toHaveBeenCalledTimes(1)
    })

    it('should use the provided subscriber name', () => {
        const mockHost = {
            setState: jest.fn(),
        }
        const name = `unique-name-${Date.now()}`

        const unsubscribe = attachListSettingsRevision(mockHost, name)
        register(name)

        emitListSettingsRevision()

        expect(mockHost.setState).toHaveBeenCalledWith({
            listSettingsRevision: expect.any(Number),
        })

        unsubscribe()
        unregister(name)
    })

    it('should support multiple hosts subscribing independently', () => {
        const host1 = { setState: jest.fn() }
        const host2 = { setState: jest.fn() }
        const name1 = `multi-host-1-${Date.now()}`
        const name2 = `multi-host-2-${Date.now()}`

        const unsubscribe1 = attachListSettingsRevision(host1, name1)
        const unsubscribe2 = attachListSettingsRevision(host2, name2)
        register(name1)
        register(name2)

        const before = getListSettingsRevision()
        emitListSettingsRevision()

        expect(host1.setState).toHaveBeenCalledTimes(1)
        expect(host2.setState).toHaveBeenCalledTimes(1)

        // Отписываем только host1
        unsubscribe1()
        unregister(name1)
        emitListSettingsRevision()

        expect(host1.setState).toHaveBeenCalledTimes(1)
        expect(host2.setState).toHaveBeenCalledTimes(2)

        unsubscribe2()
        unregister(name2)
    })

    it('should not fail when called multiple times with same name', () => {
        const mockHost = {
            setState: jest.fn(),
        }
        const name = `same-name-${Date.now()}`

        const unsubscribe1 = attachListSettingsRevision(mockHost, name)
        register(name)
        const unsubscribe2 = attachListSettingsRevision(mockHost, name)

        emitListSettingsRevision()

        // Вызван один раз (последняя подписка перезаписывает первую)
        expect(mockHost.setState).toHaveBeenCalledTimes(1)

        // Обе функции очистки отписывают одно и то же имя
        unsubscribe1()
        emitListSettingsRevision()

        // После первой отписки слушатель удалён, второй emit не вызывает setState
        expect(mockHost.setState).toHaveBeenCalledTimes(1)

        unsubscribe2()
        unregister(name)
    })
})
