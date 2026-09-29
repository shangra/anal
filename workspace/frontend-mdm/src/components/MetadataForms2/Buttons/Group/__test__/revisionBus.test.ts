/**
 * Tests for revision bus (core/revisionBus.ts)
 *
 * Тестируют pub/sub шину для уведомления об изменениях list settings
 */

import {
    getListSettingsRevision,
    emitListSettingsRevision,
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
} from '../../../../../helpers/listSettings/core/revisionBus'

describe('revisionBus', () => {
    const registeredNames: string[] = []

    beforeEach(() => {
        // Очищаем все подписчики между тестами
        for (const name of registeredNames) {
            unsubscribeListSettingsRevision(name)
        }
        registeredNames.length = 0
    })

    describe('getListSettingsRevision', () => {
        it('should return the current revision number', () => {
            const revision = getListSettingsRevision()
            expect(revision).toBeGreaterThanOrEqual(0)
        })
    })

    describe('emitListSettingsRevision', () => {
        it('should increment revision counter', () => {
            const before = getListSettingsRevision()
            emitListSettingsRevision()
            expect(getListSettingsRevision()).toBe(before + 1)
        })

        it('should call all registered listeners', () => {
            const listener1 = jest.fn()
            const listener2 = jest.fn()
            const name1 = `emit-test-1-${Date.now()}`
            const name2 = `emit-test-2-${Date.now()}`

            subscribeListSettingsRevision(name1, listener1)
            subscribeListSettingsRevision(name2, listener2)
            registeredNames.push(name1, name2)

            emitListSettingsRevision()

            expect(listener1).toHaveBeenCalledTimes(1)
            expect(listener2).toHaveBeenCalledTimes(1)
        })

        it('should not call listeners after unsubscribing', () => {
            const listener = jest.fn()
            const name = `unsub-emit-${Date.now()}`
            subscribeListSettingsRevision(name, listener)
            registeredNames.push(name)
            unsubscribeListSettingsRevision(name)
            registeredNames.pop()

            emitListSettingsRevision()

            expect(listener).not.toHaveBeenCalled()
        })

        it('should catch errors in individual listeners without affecting others', () => {
            const goodListener = jest.fn()
            const badListener = jest.fn(() => {
                throw new Error('intentional error')
            })
            const goodName = `good-${Date.now()}`
            const badName = `bad-${Date.now()}`

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

            subscribeListSettingsRevision(goodName, goodListener)
            subscribeListSettingsRevision(badName, badListener)
            registeredNames.push(goodName, badName)

            emitListSettingsRevision()

            expect(consoleSpy).toHaveBeenCalledWith(
                '[listSettings] revision listener failed',
                expect.any(Error),
            )
            expect(goodListener).toHaveBeenCalledTimes(1)
            expect(badListener).toHaveBeenCalledTimes(1)

            consoleSpy.mockRestore()
        })

        it('should increment revision even if listeners fail', () => {
            const listener = jest.fn(() => {
                throw new Error('error')
            })
            const name = `error-emit-${Date.now()}`

            subscribeListSettingsRevision(name, listener)
            registeredNames.push(name)

            const before = getListSettingsRevision()
            emitListSettingsRevision()

            expect(getListSettingsRevision()).toBe(before + 1)
        })

        it('should support multiple consecutive emits', () => {
            const listener = jest.fn()
            const name = `multi-${Date.now()}`
            subscribeListSettingsRevision(name, listener)
            registeredNames.push(name)

            const before = getListSettingsRevision()
            emitListSettingsRevision()
            emitListSettingsRevision()
            emitListSettingsRevision()

            expect(listener).toHaveBeenCalledTimes(3)
            expect(getListSettingsRevision()).toBe(before + 3)
        })
    })

    describe('subscribeListSettingsRevision', () => {
        it('should register a new listener', () => {
            const listener = jest.fn()
            const name = `sub-${Date.now()}`
            subscribeListSettingsRevision(name, listener)
            registeredNames.push(name)

            emitListSettingsRevision()
            expect(listener).toHaveBeenCalledTimes(1)
        })

        it('should allow subscribing with unique names', () => {
            const listener1 = jest.fn()
            const listener2 = jest.fn()
            const name1 = `sub-unique-1-${Date.now()}`
            const name2 = `sub-unique-2-${Date.now()}`

            subscribeListSettingsRevision(name1, listener1)
            subscribeListSettingsRevision(name2, listener2)
            registeredNames.push(name1, name2)

            emitListSettingsRevision()

            expect(listener1).toHaveBeenCalledTimes(1)
            expect(listener2).toHaveBeenCalledTimes(1)
        })

        it('should replace listener with same name', () => {
            const listener1 = jest.fn()
            const listener2 = jest.fn()
            const name = `sub-replace-${Date.now()}`

            subscribeListSettingsRevision(name, listener1)
            subscribeListSettingsRevision(name, listener2)
            registeredNames.push(name)

            emitListSettingsRevision()

            expect(listener1).not.toHaveBeenCalled()
            expect(listener2).toHaveBeenCalledTimes(1)
        })
    })

    describe('unsubscribeListSettingsRevision', () => {
        it('should remove registered listener', () => {
            const listener = jest.fn()
            const name = `unsub-${Date.now()}`
            subscribeListSettingsRevision(name, listener)
            registeredNames.push(name)
            unsubscribeListSettingsRevision(name)
            registeredNames.pop()

            emitListSettingsRevision()

            expect(listener).not.toHaveBeenCalled()
        })

        it('should not throw when unsubscribing non-existent subscriber', () => {
            expect(() => unsubscribeListSettingsRevision('non-existent')).not.toThrow()
        })

        it('should not affect other subscribers', () => {
            const active = jest.fn()
            const inactive = jest.fn()
            const activeName = `unsub-active-${Date.now()}`
            const inactiveName = `unsub-inactive-${Date.now()}`

            subscribeListSettingsRevision(activeName, active)
            subscribeListSettingsRevision(inactiveName, inactive)
            registeredNames.push(activeName, inactiveName)

            unsubscribeListSettingsRevision(inactiveName)
            registeredNames.pop()

            emitListSettingsRevision()

            expect(active).toHaveBeenCalledTimes(1)
            expect(inactive).not.toHaveBeenCalled()
        })
    })

    describe('integration scenarios', () => {
        it('should support subscribe -> emit -> unsubscribe lifecycle', () => {
            const listener = jest.fn()
            const name = `lifecycle-${Date.now()}`

            subscribeListSettingsRevision(name, listener)
            registeredNames.push(name)

            const before = getListSettingsRevision()
            emitListSettingsRevision()
            expect(listener).toHaveBeenCalledTimes(1)

            unsubscribeListSettingsRevision(name)
            registeredNames.pop()

            emitListSettingsRevision()
            expect(listener).toHaveBeenCalledTimes(1) // no more calls
        })

        it('should handle multiple subscribes and selective unsubscribes', () => {
            const listeners = {
                a: jest.fn(),
                b: jest.fn(),
                c: jest.fn(),
            }
            const names = {
                a: `int-a-${Date.now()}`,
                b: `int-b-${Date.now()}`,
                c: `int-c-${Date.now()}`,
            }

            subscribeListSettingsRevision(names.a, listeners.a)
            subscribeListSettingsRevision(names.b, listeners.b)
            subscribeListSettingsRevision(names.c, listeners.c)
            registeredNames.push(names.a, names.b, names.c)

            const before = getListSettingsRevision()
            emitListSettingsRevision()
            expect(listeners.a).toHaveBeenCalledTimes(1)
            expect(listeners.b).toHaveBeenCalledTimes(1)
            expect(listeners.c).toHaveBeenCalledTimes(1)

            unsubscribeListSettingsRevision(names.b)
            registeredNames.splice(registeredNames.indexOf(names.b), 1)

            emitListSettingsRevision()
            expect(listeners.a).toHaveBeenCalledTimes(2)
            expect(listeners.b).toHaveBeenCalledTimes(1) // no more calls
            expect(listeners.c).toHaveBeenCalledTimes(2)
        })

        it('should work with rapid consecutive operations', () => {
            const listener = jest.fn()
            const name = `rapid-${Date.now()}`

            subscribeListSettingsRevision(name, listener)
            registeredNames.push(name)

            emitListSettingsRevision()
            emitListSettingsRevision()
            unsubscribeListSettingsRevision(name)
            registeredNames.pop()
            emitListSettingsRevision()
            subscribeListSettingsRevision(name, listener)
            registeredNames.push(name)
            emitListSettingsRevision()

            // listener вызван 3 раза: 2 emit до unsubscribe + 1 emit после resubscribe
            expect(listener).toHaveBeenCalledTimes(3)
        })
    })
})
