import { Component, type ReactNode, type ChangeEvent } from 'react'
import { Checkbox, Select, Input, type SelectOption, ColorPicker } from 'ui-kit'
import type { ConditionalAppearance } from '../../../../../../helpers/listSettings/facets/conditionalFormatting/types'
import {
    CONDITIONAL_APPEARANCE_OPTIONS,
    HORIZONTAL_ALIGN_OPTIONS,
    VERTICAL_ALIGN_OPTIONS,
    TEXT_ORIENTATION_OPTIONS,
    MIRROR_OPTIONS,
    FORMAT_OPTIONS,
} from '../../../../../../helpers/listSettings/facets/conditionalFormatting/types'
import type { CfAppearanceEditorProps, CfAppearanceEditorState } from './types'
import { toggleAppearanceProperty, toggleFontProperty } from './constants'

// Группировка опций по секциям
const SECTIONS = [
    {
        key: 'colors',
        label: 'Цвета',
        options: ['backgroundColor', 'textColor'] as const,
    },
    {
        key: 'font-style',
        label: 'Стиль текста',
        options: ['font', 'markNegatives', 'markIncomplete'] as const,
    },
    {
        key: 'alignment',
        label: 'Выравнивание',
        options: ['horizontalAlign', 'verticalAlign', 'textOrientation', 'mirror'] as const,
    },
    {
        key: 'format',
        label: 'Формат',
        options: ['format', 'text'] as const,
    },
] as const

// Получение опции по ключу
function getOptionByKey(key: string) {
    return CONDITIONAL_APPEARANCE_OPTIONS.find(o => o.key === key)
}

export class CfAppearanceEditor extends Component<CfAppearanceEditorProps, CfAppearanceEditorState> {
    state: CfAppearanceEditorState = {
        expandedFont: false,
        savedFontSettings: undefined,
    }

    private fontEnabled(): boolean {
        return 'font' in this.props.appearance
    }

    private toggleKey = <K extends keyof ConditionalAppearance>(key: K) => {
        const { appearance, onChange } = this.props
        if (key === 'font' && 'font' in appearance && appearance.font) {
            this.setState({ savedFontSettings: { ...appearance.font } })
        }
        const next: ConditionalAppearance = toggleAppearanceProperty(appearance, key)
        onChange(next)
    }

    private setFont = (key: keyof NonNullable<ConditionalAppearance['font']>) => {
        const { appearance, onChange } = this.props
        const next: ConditionalAppearance = toggleFontProperty(appearance, key)
        onChange(next)
    }

    private setFontSize = (value: number) => {
        const { appearance, onChange } = this.props
        const next: ConditionalAppearance = { ...appearance }
        next.font = { ...(appearance.font ?? {}), size: value }
        onChange(next)
    }

    private toggleOpt = <K extends keyof ConditionalAppearance>(optKey: K) => {
        const { appearance, onChange } = this.props
        const next: ConditionalAppearance = toggleAppearanceProperty(appearance, optKey)
        onChange(next)
    }

    private handleToggleExpandedFont = () => {
        this.setState((prev: CfAppearanceEditorState) => ({ expandedFont: !prev.expandedFont }))
    }

    private renderColorOption(optKey: keyof ConditionalAppearance) {
        const { appearance, onChange } = this.props
        const opt = getOptionByKey(optKey)
        if (!opt) return null
        const enabled = optKey in appearance
        const value = appearance[optKey]

        return (
            <div key={optKey} className="cf-appearance-item">
                <label className="cf-appearance-label">
                    <Checkbox
                        checked={!!enabled}
                        onChange={() => this.toggleOpt(optKey)}
                    />
                    <span>{opt.label}</span>
                </label>
                {enabled && (
                    <div className="cf-appearance-control">
                        <ColorPicker
                            value={(value as string) ?? null}
                            onChange={(color: string | null) => {
                                const next: ConditionalAppearance = { ...appearance }
                                if (color) {
                                    ;(next as Record<string, unknown>)[String(optKey)] = color
                                } else {
                                    delete (next as Record<string, unknown>)[String(optKey)]
                                }
                                onChange(next)
                            }}
                            tabs={['grid', 'spectrum']}
                        >
                            <div className="cf-color-swatch" style={{ backgroundColor: (value as string) ?? '#ca8a04' }} />
                        </ColorPicker>
                    </div>
                )}
            </div>
        )
    }

    private renderSelectOption(optKey: keyof ConditionalAppearance) {
        const { appearance, onChange } = this.props
        const opt = getOptionByKey(optKey)
        if (!opt) return null
        const enabled = optKey in appearance
        const value = appearance[optKey]

        const options = (() => {
            if (optKey === 'horizontalAlign') return HORIZONTAL_ALIGN_OPTIONS
            if (optKey === 'textOrientation') return TEXT_ORIENTATION_OPTIONS
            if (optKey === 'mirror') return MIRROR_OPTIONS
            if (optKey === 'format') return FORMAT_OPTIONS
            return VERTICAL_ALIGN_OPTIONS
        })()

        return (
            <div key={optKey} className="cf-appearance-item">
                <label className="cf-appearance-label">
                    <Checkbox
                        checked={!!enabled}
                        onChange={() => this.toggleOpt(optKey)}
                    />
                    <span>{opt.label}</span>
                </label>
                {enabled && (
                    <div className="cf-appearance-control">
                        <Select
                            value={(value as string) ?? options[0]?.value ?? ''}
                            resettable={false}
                            options={options as unknown as SelectOption<string>[]}
                            onChange={(val) => {
                                if (!val) return
                                const next: ConditionalAppearance = { ...appearance }
                                ;(next as Record<string, unknown>)[String(optKey)] = val
                                onChange(next)
                            }}
                        />
                    </div>
                )}
            </div>
        )
    }

    private renderTextInputOption(optKey: keyof ConditionalAppearance) {
        const { appearance, onChange } = this.props
        const opt = getOptionByKey(optKey)
        if (!opt) return null
        const enabled = optKey in appearance
        const value = appearance[optKey]

        return (
            <div key={optKey} className="cf-appearance-item">
                <label className="cf-appearance-label">
                    <Checkbox
                        checked={!!enabled}
                        onChange={() => this.toggleOpt(optKey)}
                    />
                    <span>{opt.label}</span>
                </label>
                {enabled && (
                    <div className="cf-appearance-control">
                        <Input
                            type="text"
                            value={(value as string) ?? ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const next: ConditionalAppearance = { ...appearance }
                                ;(next as Record<string, unknown>)[String(optKey)] = e.target.value
                                onChange(next)
                            }}
                            placeholder={opt.label}
                        />
                    </div>
                )}
            </div>
        )
    }

    private renderSimpleCheckbox(optKey: keyof ConditionalAppearance) {
        const { appearance, onChange } = this.props
        const opt = getOptionByKey(optKey)
        if (!opt) return null
        const enabled = optKey in appearance

        return (
            <div key={optKey} className="cf-appearance-item cf-appearance-item--simple">
                <label className="cf-appearance-label">
                    <Checkbox
                        checked={!!enabled}
                        onChange={() => this.toggleOpt(optKey)}
                    />
                    <span>{opt.label}</span>
                </label>
            </div>
        )
    }

    private renderFontSection() {
        const { appearance, onChange } = this.props
        const enabled = this.fontEnabled()
        const fontOpt = getOptionByKey('font')
        if (!fontOpt) return null

        return (
            <div className="cf-appearance-section">
                <label className="cf-appearance-label">
                    <Checkbox
                        checked={enabled}
                        onChange={() => this.toggleKey('font')}
                    />
                    <span>{fontOpt.label}</span>
                </label>
                {enabled && (
                    <div className="cf-appearance-font-panel">
                        <div className="cf-appearance-font-toggles">
                            <label className="cf-font-toggle" title="Жирный">
                                <Checkbox
                                    checked={!!appearance.font?.bold}
                                    onChange={() => this.setFont('bold')}
                                />
                                <span className="cf-font-toggle__label">Ж</span>
                            </label>
                            <label className="cf-font-toggle" title="Курсив">
                                <Checkbox
                                    checked={!!appearance.font?.italic}
                                    onChange={() => this.setFont('italic')}
                                />
                                <span className="cf-font-toggle__label">К</span>
                            </label>
                            <label className="cf-font-toggle" title="Подчёркнутый">
                                <Checkbox
                                    checked={!!appearance.font?.underline}
                                    onChange={() => this.setFont('underline')}
                                />
                                <span className="cf-font-toggle__label">П</span>
                            </label>
                            <label className="cf-font-toggle" title="Зачёркнутый">
                                <Checkbox
                                    checked={!!appearance.font?.strikeout}
                                    onChange={() => this.setFont('strikeout')}
                                />
                                <span className="cf-font-toggle__label">Ч</span>
                            </label>
                        </div>
                        <div className="cf-appearance-font-size">
                            <span className="cf-font-size-label">Размер:</span>
                            <Input
                                type="number"
                                value={String(appearance.font?.size ?? 0)}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => this.setFontSize(Number(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    render(): ReactNode {
        return (
            <div className="cf-appearance-editor">
                {/* Секция: Цвета */}
                <div className="cf-appearance-section-group">
                    <div className="cf-appearance-section-label">Цвета</div>
                    {this.renderColorOption('backgroundColor')}
                    {this.renderColorOption('textColor')}
                </div>

                {/* Секция: Стиль текста */}
                <div className="cf-appearance-section-group">
                    <div className="cf-appearance-section-label">Стиль текста</div>
                    {this.renderFontSection()}
                    {this.renderSimpleCheckbox('markNegatives')}
                    {this.renderSimpleCheckbox('markIncomplete')}
                </div>

                {/* Секция: Выравнивание */}
                <div className="cf-appearance-section-group">
                    <div className="cf-appearance-section-label">Выравнивание</div>
                    {this.renderSelectOption('horizontalAlign')}
                    {this.renderSelectOption('verticalAlign')}
                    {this.renderSelectOption('textOrientation')}
                    {this.renderSelectOption('mirror')}
                </div>

                {/* Секция: Формат */}
                <div className="cf-appearance-section-group">
                    <div className="cf-appearance-section-label">Формат</div>
                    {this.renderSelectOption('format')}
                    {this.renderTextInputOption('text')}
                </div>
            </div>
        )
    }
}
