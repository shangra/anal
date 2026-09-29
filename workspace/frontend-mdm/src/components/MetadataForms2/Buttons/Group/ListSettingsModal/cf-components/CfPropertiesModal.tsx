import { Component, type ReactNode, type ChangeEvent } from 'react'
import type { ConditionalAppearance } from '../../../../../../helpers/listSettings/facets/conditionalFormatting/types'
import type { SelectionNode } from '../../../../../../helpers/listSettings/facets/selection/types'
import { CfAppearanceEditor } from './CfAppearanceEditor'
import { CfConditionEditor } from './CfConditionEditor'
import { CfTargetFieldsEditor } from './CfTargetFieldsEditor'
import { TABS } from './constants'
import type { CfPropertiesModalProps, PropertiesTab, CfPropertiesModalState } from './types'

export class CfPropertiesModal extends Component<CfPropertiesModalProps, CfPropertiesModalState> {
    state: CfPropertiesModalState = {
        activeTab: 'appearance',
        presentation: this.props.rule.presentation,
    }

    private handleTabChange = (tab: PropertiesTab) => {
        this.setState({ activeTab: tab })
    }

    private handlePresentationChange = (e: ChangeEvent<HTMLInputElement>) => {
        this.setState({ presentation: e.target.value })
    }

    private handleSave = () => {
        const { onUpdate, onClose } = this.props
        const { presentation } = this.state
        onUpdate({ presentation })
        onClose()
    }

    private handleCancel = () => {
        const { rule, onClose } = this.props
        onClose()
        this.setState({ presentation: rule.presentation })
    }

    private handleAppearanceChange = (appearance: ConditionalAppearance) => {
        const { onUpdate } = this.props
        onUpdate({ appearance })
    }

    private handleConditionChange = (nodes: SelectionNode[]) => {
        const { onUpdate } = this.props
        onUpdate({ conditionNodes: nodes })
    }

    private handleTargetFieldsChange = (patch: { targetFields: string[] } | { applyToSubstrings: boolean }) => {
        const { onUpdate } = this.props
        onUpdate(patch)
    }

    render(): ReactNode {
        const { rule } = this.props
        const { activeTab, presentation } = this.state

        return (
            <div className="settings-container cf-properties-panel">
                <div className="cf-properties-presentation">
                    <label>
                        Представление:
                        <input
                            type="text"
                            value={presentation}
                            onChange={this.handlePresentationChange}
                            placeholder="Название правила"
                        />
                    </label>
                </div>

                <div className="cf-properties-tabs">
                    {TABS.map((tab: { key: PropertiesTab; label: string }) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={activeTab === tab.key ? 'active' : ''}
                            onClick={() => this.handleTabChange(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="cf-properties-body">
                    {activeTab === 'appearance' && (
                        <CfAppearanceEditor
                            appearance={rule.appearance}
                            onChange={this.handleAppearanceChange}
                        />
                    )}
                    {activeTab === 'condition' && (
                        <CfConditionEditor
                            nodes={rule.conditionNodes}
                            onChange={this.handleConditionChange}
                        />
                    )}
                    {activeTab === 'fields' && (
                        <CfTargetFieldsEditor
                            rule={rule}
                            onChange={this.handleTargetFieldsChange}
                        />
                    )}
                </div>

                <div className="cf-properties-footer">
                    <button type="button" onClick={this.handleCancel}>
                        Отмена
                    </button>
                    <button type="button" className="action-button--primary" onClick={this.handleSave}>
                        Закрыть
                    </button>
                </div>
            </div>
        )
    }
}
