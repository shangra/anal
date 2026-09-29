import type {
    GroupingSettingsState,
    SelectionSettingsState,
    SortSettingsState,
    ConditionalFormattingSettingsState,
} from '../../../../../helpers/listSettings'

export type SettingsTab = 'filter' | 'sort' | 'conditional' | 'grouping'

export interface ListSettingsModalProps {
    open: boolean
    onClose: () => void
    initialTab?: SettingsTab
    embedded?: boolean
}

export interface ListSettingsModalState {
    activeTab: SettingsTab
    snapshot: ListSettingsSnapshots | null
    listSettingsRevision: number
}

export interface ListSettingsSnapshots {
    grouping: GroupingSettingsState
    selection: SelectionSettingsState
    conditionalFormatting: ConditionalFormattingSettingsState
    sort: SortSettingsState
}

export const TABS: { id: SettingsTab; label: string }[] = [
    { id: 'filter', label: 'Отбор' },
    { id: 'sort', label: 'Сортировка' },
    { id: 'conditional', label: 'Условное оформление' },
    { id: 'grouping', label: 'Группировка' },
]

export const SUBSCRIBER = 'ListSettingsModal'
