import StateManager from 'lite-react-statemanager';

export const STORAGE_KEY = 'selected-entity';

export interface SelectedEntityData {
    title: string;
    name: string;
    id: string;
    groupsId: string;
}

export type SelectedEntitySubscriber = {
    setState: (state: Partial<SelectedEntityData>) => void
}

const EMPTY: SelectedEntityData = { title: '', name: '', id: '', groupsId: '' }

function loadPersisted(): SelectedEntityData {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { ...EMPTY }
        const parsed = JSON.parse(raw) as Partial<SelectedEntityData>
        return {
            title: typeof parsed.title === 'string' ? parsed.title : '',
            name: typeof parsed.name ==='string'? parsed.name : '',
            id: typeof parsed.id === 'string' ? parsed.id : '',
            groupsId: typeof parsed.groupsId === 'string' ? parsed.groupsId : '',
        }
    } catch {
        return { ...EMPTY }
    }
}

function persist( data: SelectedEntityData ): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function toManagerState( data: SelectedEntityData ): Record<string, string> {
    return {
        selectedEntityTitle: data.title,
        selectedEntityName:data.name,
        selectedEntityId: data.id,
        selectedEntityGroupsId: data.groupsId,
    }
}

function commit(partial: Partial<SelectedEntityData>): void {
    const next: SelectedEntityData = {
        ...getSelectedEntity(),
        ...partial,
    }
    StateManager.setState(toManagerState(next))
    persist(next)
}

StateManager.setState(toManagerState(loadPersisted()))

export function getSelectedEntity(): SelectedEntityData {
    const state = StateManager.state
    const stored = loadPersisted()
    return {
        title: (state.selectedEntityTitle as string | undefined) ?? stored.title,
        name: (state.selectedEntityName as string | undefined) ?? stored.name,
        id: (state.selectedEntityId as string | undefined) ?? stored.id,
        groupsId: (state.selectedEntityGroupsId as string | undefined) ?? stored.groupsId,
    }
}

export function createSelectedEntitySubscriber(
    apply: (key: keyof SelectedEntityData, value: string) => void,
): SelectedEntitySubscriber {
    return {
        setState: (patch) => {
            if (patch.title !== undefined) apply('title', patch.title)
            if (patch.name !== undefined) apply('name', patch.name)
            if (patch.id !== undefined) apply('id', patch.id)
            if (patch.groupsId !== undefined) apply('groupsId', patch.groupsId)
        }
    }
}

export function subscribeSelectedEntity(
    subscriberName: string,
    target: SelectedEntitySubscriber,
): void {
    const onStateChange = (state: Record<string, unknown>): void => {
        target.setState({
            title: (state.selectedEntityTitle as string | undefined) ?? '',
            name: (state.selectedEntityName as string | undefined) ?? '',
            id: (state.selectedEntityId as string | undefined) ?? '',
            groupsId: (state.selectedEntityGroupsId as string | undefined) ?? '',
        })
    }
    StateManager.subscribeState({
        selectedEntityTitle: {
            [subscriberName]: onStateChange,
        },
        selectedEntityName: {
            [subscriberName]: onStateChange,
        },
        selectedEntityId: {
            [subscriberName]: onStateChange,
        },
        selectedEntityGroupsId: {
            [subscriberName]: onStateChange,
        },
    })
}

export function unsubscribeSelectedEntity(subscriberName: string): void {
    StateManager.unsubscribeState({
        selectedEntityTitle: [subscriberName],
        selectedEntityName: [subscriberName],
        selectedEntityId: [subscriberName],
        selectedEntityGroupsId: [subscriberName],
    })
}

export const selectedEntityActions = {
    setSelectedEntity(title: string, name: string, id: string, groupsId: string): void {
        commit({ title, name, id, groupsId })
    },

    clearSelectedEntity(): void {
        commit({ ...EMPTY })
    },
}
