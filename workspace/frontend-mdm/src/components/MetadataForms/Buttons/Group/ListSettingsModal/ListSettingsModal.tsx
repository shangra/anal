import { Component, createRef, type ReactNode, type RefObject } from 'react'
import { Button } from 'ui-kit'
import {
    attachListSettingsRevision,
    columnGroupingSettingsActions,
    emitListSettingsRevision,
    getColumnGroupingSettingsState,
    getConditionalFormattingSettingsState,
    getGroupingSettingsState,
    getSelectionSettingsState,
    getSortSettingsState,
    getActiveListSettingsScope,
    groupingSettingsActions,
    selectionSettingsActions,
    conditionalFormattingSettingsActions,
    cloneConditionalFormattingSettingsState,
    sortSettingsActions,
} from '../../../../../helpers/listSettings'
import { ColumnGroupingTab, GroupingTab, SelectionTab, ConditionalFormattingTab } from './tabs'
import { generateTitleId, serializeColumnGroupTree, serializeSelection, serializeSort, takeSnapshots } from './shared/utils'
import { GLOBAL_LIST_SETTINGS_SCOPE } from '../../../../../helpers/listSettings/core/types'
import { SUBSCRIBER, TABS } from './types'
import type {
    ListSettingsModalProps,
    ListSettingsModalState,
} from './types'
import './ListSettingsModal.css'
import { SortingTab } from './tabs/SortingTab'

export class ListSettingsModal extends Component<ListSettingsModalProps, ListSettingsModalState> {
    private dialogRef: RefObject<HTMLDivElement> = createRef()
    private titleId: string
    private wasOpen = false
    private resizeObserver: ResizeObserver | null = null
    private containerRef: RefObject<HTMLDivElement> = createRef()
    private detachRevision: (() => void) | null = null

    constructor(props: ListSettingsModalProps) {
        super(props)
        this.titleId = generateTitleId()
        this.state = {
            activeTab: props.initialTab ?? 'grouping',
            snapshot: null,
            listSettingsRevision: 0,
        }
    }

    componentDidMount(): void {
        this.detachRevision = attachListSettingsRevision(this, SUBSCRIBER)
        if (this.props.open) {
            this.onModalOpened()
        }
        this.setupResizeObserver()
    }

    componentDidUpdate(prevProps: ListSettingsModalProps): void {
        if (this.props.open && !prevProps.open) this.onModalOpened()
        if (!this.props.open && prevProps.open) this.onModalClosed()
        if (prevProps.embedded !== this.props.embedded) {
            this.setupResizeObserver()
        }
    }

    componentWillUnmount(): void {
        this.onModalClosed()
        this.detachRevision?.()
        this.cleanupResizeObserver()
    }

    private setupResizeObserver(): void {
        if (this.props.embedded && this.containerRef.current) {
            this.cleanupResizeObserver()
            this.resizeObserver = new ResizeObserver(() => {
                this.setState(prev => ({ ...prev }))
            })
            this.resizeObserver.observe(this.containerRef.current)
        }
    }

    private cleanupResizeObserver(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
            this.resizeObserver = null
        }
    }

    private onModalOpened = (): void => {
        const initialTab = this.props.initialTab ?? 'grouping'
        const currentGrouping = getGroupingSettingsState()
        if (
            getActiveListSettingsScope() === GLOBAL_LIST_SETTINGS_SCOPE.key &&
            currentGrouping.selectedGroupFields.length === 0
        ) {
            try {
                const raw = localStorage.getItem('list-settings-grouping')
                if (raw) {
                    const persisted: { selectedGroupFields?: string[]; disabledGroupFields?: string[] } = JSON.parse(raw)
                    if (Array.isArray(persisted.selectedGroupFields) && persisted.selectedGroupFields.length > 0) {
                        groupingSettingsActions.restoreSnapshot({
                            selectedGroupFields: persisted.selectedGroupFields,
                            disabledGroupFields: Array.isArray(persisted.disabledGroupFields)
                                ? persisted.disabledGroupFields
                                : [],
                        })
                    }
                }
            } catch {
                // ignore
            }
        }
        this.setState({
            activeTab: initialTab,
            snapshot: {
                ...takeSnapshots(),
                conditionalFormatting: cloneConditionalFormattingSettingsState(
                    getConditionalFormattingSettingsState(),
                ),
            },
        })
        document.addEventListener('keydown', this.handleKeyDown)
        this.dialogRef.current?.focus()
        this.wasOpen = true
    }

    private onModalClosed = (): void => {
        if (!this.wasOpen) return
        document.removeEventListener('keydown', this.handleKeyDown)
        this.wasOpen = false
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') this.props.onClose()
    }

    private handleResetActiveFacet = (): void => {
        const { snapshot, activeTab } = this.state
        if (!snapshot) return
        if (activeTab === 'grouping') {
            groupingSettingsActions.restoreSnapshot(snapshot.grouping)
            return
        }
        if (activeTab === 'filter') {
            selectionSettingsActions.restoreSnapshot(snapshot.selection)
            return
        }
        if (activeTab === 'colgroup') {
            columnGroupingSettingsActions.restoreSnapshot(snapshot.columnGrouping)
            return
        }
        if (activeTab === 'conditional') {
            conditionalFormattingSettingsActions.restoreSnapshot(snapshot.conditionalFormatting)
            return
        }
        if (activeTab === 'sort') {
            sortSettingsActions.restoreSnapshot(snapshot.sort)
        }
    }

    private handleApply = (): void => {
        emitListSettingsRevision()
        this.props.onClose()
    }

    private handleCancel = (): void => {
        const { snapshot } = this.state
        if (snapshot) {
            groupingSettingsActions.restoreSnapshot(snapshot.grouping)
            selectionSettingsActions.restoreSnapshot(snapshot.selection)
            columnGroupingSettingsActions.restoreSnapshot(snapshot.columnGrouping)
            conditionalFormattingSettingsActions.restoreSnapshot(snapshot.conditionalFormatting)
            sortSettingsActions.restoreSnapshot(snapshot.sort)
        }
        this.props.onClose()
    }

    private handleOverlayClick = (): void => {
        this.handleCancel()
    }

    private handleDialogClick = (event: React.MouseEvent): void => {
        event.stopPropagation()
    }

    private getActiveTabHasChanges(): boolean {
        const { snapshot, activeTab } = this.state
        if (!snapshot) return false

        if (activeTab === 'grouping') {
            const current = getGroupingSettingsState()
            return (
                snapshot.grouping.selectedGroupFields.join('\0') !==
                    current.disabledGroupFields.join('\0') ||
                snapshot.grouping.disabledGroupFields.join('\0') !==
                    current.disabledGroupFields.join('\0')
            )
        }

        if (activeTab === 'filter') {
            const current = getSelectionSettingsState()
            return (
                serializeSelection(snapshot.selection) !== serializeSelection(current)
            )
        }

        if (activeTab === 'colgroup') {
            const current = getColumnGroupingSettingsState()
            return (
                serializeColumnGroupTree(snapshot.columnGrouping) !== serializeColumnGroupTree(current)
            )
        }
        if (activeTab === 'conditional') {
            const current = getConditionalFormattingSettingsState()
            return JSON.stringify(snapshot.conditionalFormatting.conditionalFormattingRules) !==
                JSON.stringify(current.conditionalFormattingRules)
        }

        if (activeTab === 'sort') {
            const current = getSortSettingsState()
            return serializeSort(snapshot.sort) !== serializeSort(current)
        }

        return false
    }

    render(): ReactNode {
        const { open, onClose, embedded } = this.props
        const { activeTab } = this.state

        if (!open) return null

        const hasChanges = this.getActiveTabHasChanges()

        const modalContent = (
            <>
                <div className="settings-header">
                    <div className="tabs" aria-label="Разделы настройки">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={activeTab === tab.id ? 'active-tab' : 'tab'}
                                onClick={() => this.setState({ activeTab: tab.id })}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="settings-body">
                    {activeTab === 'grouping' && <GroupingTab />}
                    {activeTab === 'colgroup' && <ColumnGroupingTab />}
                    {activeTab === 'filter' && <SelectionTab />}
                    {activeTab === 'sort' && <SortingTab />}
                    {activeTab === 'conditional' && <ConditionalFormattingTab />}
                </div>

                <div className="settings-footer">
                    <Button variant="text" color="primary" disabled={!hasChanges} onClick={this.handleResetActiveFacet}>
                        Сбросить изменения
                    </Button>
                    <div className="settings-footer-actions">
                        <Button variant="contained" color="primary" onClick={this.handleApply}>ОК</Button>
                        <Button variant="outlined" color="secondary" onClick={this.handleCancel}>Отмена</Button>
                    </div>
                </div>
            </>
        )

        if (embedded) {
            return (
                <div
                    ref={this.containerRef}
                    className="settings-container embedded"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={this.titleId}
                    tabIndex={-1}
                    onClick={this.handleDialogClick}
                >
                    {modalContent}
                </div>
            )
        }

        return (
            <div className="settings-overlay" role="presentation" onClick={this.handleOverlayClick}>
                <div
                    ref={this.dialogRef}
                    className="settings-container"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={this.titleId}
                    tabIndex={-1}
                    onClick={this.handleDialogClick}
                >
                    {modalContent}
                </div>
            </div>
        )
    }
}
