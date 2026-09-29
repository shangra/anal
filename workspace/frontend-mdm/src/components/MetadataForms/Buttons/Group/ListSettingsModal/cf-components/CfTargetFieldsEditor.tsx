import { Component, type ReactNode, type ChangeEvent } from 'react'
import { Checkbox } from 'ui-kit'
import { listFieldCatalog } from '../../../../../../helpers/listSettings/fields/catalog'
import { savedFieldsMap } from './types'
import type { CfTargetFieldsEditorProps, CfTargetFieldsEditorState } from './types'

export class CfTargetFieldsEditor extends Component<CfTargetFieldsEditorProps, CfTargetFieldsEditorState> {
    state: CfTargetFieldsEditorState = { expanded: false }

    private syncIfNew(): void {
        const { rule } = this.props
        if (!savedFieldsMap.has(rule.id)) {
            savedFieldsMap.set(rule.id, rule.targetFields.length > 0 ? [...rule.targetFields] : [])
        }
    }

    componentDidMount() {
        this.syncIfNew()
    }

    componentDidUpdate(prevProps: CfTargetFieldsEditorProps) {
        if (prevProps.rule.id !== this.props.rule.id) {
            this.syncIfNew()
        }
    }

    private handleAllFieldsToggle = (e: ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation()
        const { rule, onChange } = this.props
        const isAllSelected = rule.targetFields.length === 0
        const catalog = listFieldCatalog()
        const allCatalogKeys = catalog.map((f) => f.value)
        const ruleId = this.props.rule.id

        if (isAllSelected) {
            let saved = savedFieldsMap.get(ruleId)
            if (!saved || saved.length === 0) {
                saved = [...allCatalogKeys]
            }
            onChange({ targetFields: [...saved] })
        } else {
            const saved = [...rule.targetFields]
            savedFieldsMap.set(ruleId, saved)
            onChange({ targetFields: [] })
        }
    }

    private handleFieldToggle = (field: string) => {
        const { rule, onChange } = this.props
        const isAllSelected = rule.targetFields.length === 0
        const catalog = listFieldCatalog()
        const allCatalogKeys = catalog.map((f) => f.value)
        const ruleId = this.props.rule.id

        if (isAllSelected) {
            let saved = savedFieldsMap.get(ruleId)
            if (!saved) {
                saved = [...allCatalogKeys]
            }
            const next = saved.includes(field)
                ? saved.filter((f: string) => f !== field)
                : [...saved, field]
            savedFieldsMap.set(ruleId, next)
            onChange({ targetFields: next })
        } else {
            const targetFields = rule.targetFields
            const isCurrentlyIncluded = targetFields.includes(field)

            if (isCurrentlyIncluded) {
                if (targetFields.length <= 1) {
                    return
                }
            }

            const next = isCurrentlyIncluded
                ? targetFields.filter((f: string) => f !== field)
                : [...targetFields, field]
            savedFieldsMap.set(ruleId, next)
            onChange({ targetFields: next })
        }
    }

    private handleToggleExpanded = () => {
        this.setState((prev: CfTargetFieldsEditorState) => ({ expanded: !prev.expanded }))
    }

    private handleApplyToSubstringsToggle = (e: ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation()
        const { rule, onChange } = this.props
        onChange({ applyToSubstrings: !rule.applyToSubstrings })
    }

    render(): ReactNode {
        const { rule } = this.props
        const { expanded } = this.state
        const isAllSelected = rule.targetFields.length === 0
        const catalog = listFieldCatalog()
        const allCatalogKeys = catalog.map((f) => f.value)

        return (
            <div className="cf-target-fields-editor">
                <div className="cf-target-fields-all">
                    <Checkbox
                        checked={isAllSelected}
                        onChange={this.handleAllFieldsToggle}
                    />
                    <span className="cf-target-fields-label">Все поля</span>
                </div>

                <div className="cf-target-fields-substrings">
                    <Checkbox
                        checked={!!rule.applyToSubstrings}
                        onChange={this.handleApplyToSubstringsToggle}
                    />
                    <span className="cf-target-fields-label">Применять к подстрокам</span>
                </div>

                {!isAllSelected && (
                    <>
                        <button
                            type="button"
                            onClick={this.handleToggleExpanded}
                            className="cf-fields-toggle-btn"
                        >
                            {expanded ? '▼' : '▶'} {expanded ? 'Скрыть' : 'Показать'} доступные поля ({allCatalogKeys.length})
                        </button>

                        {expanded && (
                            <div className="cf-fields-list">
                                {allCatalogKeys.length === 0 && (
                                    <div className="cf-fields-empty">Нет доступных полей</div>
                                )}
                                <div className="cf-fields-grid">
                                    {allCatalogKeys.map((fieldKey) => {
                                        const fieldDef = catalog.find((f) => f.value === fieldKey)
                                        const checked = rule.targetFields.includes(fieldKey)
                                        return (
                                            <label key={fieldKey} className="cf-field-item">
                                                <Checkbox
                                                    checked={checked}
                                                    onChange={() => this.handleFieldToggle(fieldKey)}
                                                />
                                                <span>{fieldDef?.label ?? fieldKey}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        )
    }
}
