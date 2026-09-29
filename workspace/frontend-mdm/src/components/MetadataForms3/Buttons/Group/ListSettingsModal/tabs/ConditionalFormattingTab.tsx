import { Component, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import type { ConditionalAppearance, ConditionalFormattingRule } from '../../../../../../helpers/listSettings/facets/conditionalFormatting/types'
import type { SelectionNode } from '../../../../../../helpers/listSettings/facets/selection/types'
import {
    getConditionalFormattingSettingsState,
    conditionalFormattingSettingsActions,
} from '../../../../../../helpers/listSettings/facets/conditionalFormatting/store'
import {
    subscribeListSettingsRevision,
    unsubscribeListSettingsRevision,
} from '../../../../../../helpers/listSettings/core/revisionBus'
import { CfAppearanceEditor, CfConditionEditor, CfTargetFieldsEditor, CfRuleRow } from '../cf-components'
import { FacetsToolbar } from '../lists'
import type { ConditionalFormattingTabState } from './types'
import '../ListSettingsModal.css'

export class ConditionalFormattingTab extends Component<object, ConditionalFormattingTabState> {
    private static readonly SUBSCRIBER = 'ConditionalFormattingTab'

    constructor(props: object) {
        super(props)
        const store = getConditionalFormattingSettingsState()
        this.state = {
            conditionalFormattingRules: store.conditionalFormattingRules,
            highlightedIds: [],
            selectionAnchorIndex: -1,
            editingCell: null,
            propertiesModalOpen: false,
            editingRuleId: null,
            activePropertiesTab: 'appearance' as const,
            dragSource: null,
            draggingFields: new Set(),
            dropIndex: null,
            isDropActive: false,
        }
    }

    componentDidMount(): void {
        subscribeListSettingsRevision(ConditionalFormattingTab.SUBSCRIBER, () => {
            this.setState({
                conditionalFormattingRules: getConditionalFormattingSettingsState().conditionalFormattingRules,
            })
        })
    }

    componentWillUnmount(): void {
        unsubscribeListSettingsRevision(ConditionalFormattingTab.SUBSCRIBER)
    }

    private handleRuleSelect = (ruleId: string, index: number, event: MouseEvent): void => {
        if (event.target instanceof HTMLElement) {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'BUTTON') return
        }
        const { highlightedIds, selectionAnchorIndex } = this.state
        const rules = this.state.conditionalFormattingRules

        if (event.shiftKey && selectionAnchorIndex >= 0) {
            const from = Math.min(selectionAnchorIndex, index)
            const to = Math.max(selectionAnchorIndex, index)
            this.setState({
                highlightedIds: rules.slice(from, to + 1).map((r) => r.id),
                selectionAnchorIndex: index,
            })
            return
        }
        if (event.ctrlKey || event.metaKey) {
            const set = new Set(highlightedIds)
            if (set.has(ruleId)) set.delete(ruleId)
            else set.add(ruleId)
            this.setState({ highlightedIds: Array.from(set), selectionAnchorIndex: index })
            return
        }
        this.setState({ highlightedIds: [ruleId], selectionAnchorIndex: index })
    }

    private handleDragStart = (ruleId: string, index: number, event: DragEvent): void => {
        event.dataTransfer.effectAllowed = 'move'
        const { highlightedIds } = this.state
        const fieldsToDrag = highlightedIds.includes(ruleId) ? highlightedIds : [ruleId]
        this.setState({ draggingFields: new Set(fieldsToDrag), dragSource: 'selected', highlightedIds: fieldsToDrag })
    }

    private handleDragEnd = (): void => {
        this.setState({ draggingFields: new Set(), dragSource: null, dropIndex: null, isDropActive: false })
    }

    private handleDragOver = (index: number, event: DragEvent): void => {
        event.preventDefault()
        this.setState({ dropIndex: index, isDropActive: true })
    }

    private handleDrop = (index: number, event: DragEvent): void => {
        event.preventDefault()
        this.setState({ dropIndex: null, isDropActive: false })
    }

    private handleDeleteHighlighted = (): void => {
        const { highlightedIds } = this.state
        if (highlightedIds.length === 0) return
        conditionalFormattingSettingsActions.removeRules(highlightedIds)
        this.setState({ highlightedIds: [] })
    }

    private handleMoveHighlightedUp = (): void => {
        const { highlightedIds } = this.state
        if (highlightedIds.length === 0) return
        conditionalFormattingSettingsActions.moveRules(highlightedIds, 'up')
    }

    private handleMoveHighlightedDown = (): void => {
        const { highlightedIds } = this.state
        if (highlightedIds.length === 0) return
        conditionalFormattingSettingsActions.moveRules(highlightedIds, 'down')
    }

    private canDeleteHighlighted = (): boolean => this.state.highlightedIds.length > 0
    private canMoveUp = (): boolean => this.state.highlightedIds.length > 0
    private canMoveDown = (): boolean => this.state.highlightedIds.length > 0

    render(): ReactNode {
        const { conditionalFormattingRules } = this.state
        const highlightedSet = new Set(this.state.highlightedIds)

        return (
            <div className="settings-content cf-tab-content">
                <div className="cf-left-panel">
                    <FacetsToolbar
                        onAdd={() => conditionalFormattingSettingsActions.addRule()}
                        onAddLabel="Добавить правило"
                        onDelete={this.handleDeleteHighlighted}
                        onDeleteDisabled={!this.canDeleteHighlighted()}
                        onMoveUp={this.handleMoveHighlightedUp}
                        onMoveUpDisabled={!this.canMoveUp()}
                        onMoveDown={this.handleMoveHighlightedDown}
                        onMoveDownDisabled={!this.canMoveDown()}
                    />
                    <section aria-label="Правила условного оформления" style={{ margin: 0, padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div className="cf-rules-list-wrapper">
                            <div className="cf-rules-header" aria-hidden>
                                <span className="cf-rules-header__check" />
                                <span>Оформление</span>
                                <span>Условие</span>
                                <span>Поля</span>
                                <span />
                            </div>
                            <ul className="selected-list cf-rules-list">
                                {conditionalFormattingRules.length === 0 && (
                                    <li className="empty-state">Нет правил. Используйте панель свойств для добавления.</li>
                                )}
                                {conditionalFormattingRules.map((rule, index) => (
                                    <CfRuleRow
                                        key={rule.id}
                                        rule={rule}
                                        index={index}
                                        highlightedSet={highlightedSet}
                                        editingCell={this.state.editingCell}
                                        dragSource={this.state.dragSource}
                                        draggingFields={this.state.draggingFields}
                                        isDropActive={this.state.isDropActive}
                                        dropIndex={this.state.dropIndex}
                                        onToggleEnabled={(id: string) =>
                                            conditionalFormattingSettingsActions.toggleRuleEnabled(id)
                                        }
                                        onToggleHighlight={(ruleId: string, idx: number, event: MouseEvent) => this.handleRuleSelect(ruleId, idx, event)}
                                        onBeginEditing={(ruleId: string, cell: 'appearance' | 'condition' | 'fields') => this.setState({ editingCell: { ruleId, cell }, editingRuleId: ruleId, activePropertiesTab: 'appearance' })}
                                        onDragStart={(ruleId: string, idx: number, event: DragEvent) => this.handleDragStart(ruleId, idx, event)}
                                        onDragEnd={this.handleDragEnd}
                                        onDragOver={(idx: number, event: DragEvent) => this.handleDragOver(idx, event)}
                                        onDrop={(idx: number, event: DragEvent) => this.handleDrop(idx, event)}
                                    />
                                ))}
                            </ul>
                        </div>
                    </section>
                </div>

                {this.state.editingCell && (() => {
                    const editingRule = this.state.editingRuleId
                        ? conditionalFormattingRules.find((r) => r.id === this.state.editingRuleId)
                        : conditionalFormattingRules[0]
                    if (!editingRule) return null

                    const propertyTabs: Array<{ key: 'appearance' | 'condition' | 'fields'; label: string }> = [
                        { key: 'appearance', label: 'Оформление' },
                        { key: 'condition', label: 'Условие' },
                        { key: 'fields', label: 'Поля' },
                    ]

                    return (
                        <div className="cf-right-panel">
                            <section className="cf-properties-panel">
                                <div className="cf-properties-toolbar">
                                    <span className="cf-properties-title">Свойства правила</span>
                                    <button type="button" className="cf-close-properties" onClick={() => this.setState({ editingCell: null })}>
                                        ×
                                    </button>
                                </div>
                                <div className="cf-properties-presentation">
                                    <label>
                                        Представление:
                                        <input
                                            type="text"
                                            value={editingRule.presentation}
                                            onChange={(e) => {
                                                conditionalFormattingSettingsActions.updateRule(editingRule.id, { presentation: e.target.value })
                                            }}
                                            placeholder="Название правила"
                                        />
                                    </label>
                                </div>
                                <div className="cf-properties-tabs">
                                    {propertyTabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            className={this.state.activePropertiesTab === tab.key ? 'active' : ''}
                                            onClick={() => this.setState({ activePropertiesTab: tab.key })}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="cf-properties-body">
                                    {this.state.activePropertiesTab === 'appearance' && (
                                        <CfAppearanceEditor
                                            appearance={editingRule.appearance}
                                            onChange={(appearance: ConditionalAppearance) => {
                                                conditionalFormattingSettingsActions.updateRule(editingRule.id, { appearance })
                                            }}
                                        />
                                    )}
                                    {this.state.activePropertiesTab === 'condition' && (
                                        <CfConditionEditor
                                            nodes={editingRule.conditionNodes}
                                            onChange={(nodes: SelectionNode[]) => {
                                                conditionalFormattingSettingsActions.setConditionNodes(editingRule.id, nodes)
                                            }}
                                            compact
                                        />
                                    )}
                                    {this.state.activePropertiesTab === 'fields' && (
                                        <CfTargetFieldsEditor
                                            rule={editingRule}
                                            onChange={(patch: { targetFields: string[] } | { applyToSubstrings: boolean }) => {
                                                conditionalFormattingSettingsActions.updateRule(editingRule.id, patch as Partial<ConditionalFormattingRule>)
                                            }}
                                        />
                                    )}
                                </div>
                            </section>
                        </div>
                    )
                })()}
            </div>
        )
    }
}
