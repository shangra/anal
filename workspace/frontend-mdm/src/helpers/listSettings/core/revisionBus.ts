type RevisionListener = () => void

const listeners = new Map<string, RevisionListener>()
let revision = 0

export function getListSettingsRevision(): number {
    return revision
}

export function emitListSettingsRevision(): void {
    revision += 1
    listeners.forEach((listener) => {
        try {
            listener()
        } catch (error) {
            console.error('[listSettings] revision listener failed', error)
        }
    })
}

export function subscribeListSettingsRevision(
    subscriberName: string,
    listener: RevisionListener,
): void {
    listeners.set(subscriberName, listener)
}

export function unsubscribeListSettingsRevision(subscriberName: string) {
    listeners.delete(subscriberName)
}
