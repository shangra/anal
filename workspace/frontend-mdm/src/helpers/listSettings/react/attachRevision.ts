import {
    getListSettingsRevision,
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
} from '../core/revisionBus'

type RevisionHost = {
    setState: (patch: object) => void
}

export function attachListSettingsRevision(
    host: RevisionHost,
    subscriberName: string,
): () => void {
    const onChange = (): void => {
        host.setState({
            listSettingsRevision: getListSettingsRevision(),
        })
    }

    subscribeListSettingsRevision(subscriberName, onChange)

    return () => unsubscribeListSettingsRevision(subscriberName)
}
