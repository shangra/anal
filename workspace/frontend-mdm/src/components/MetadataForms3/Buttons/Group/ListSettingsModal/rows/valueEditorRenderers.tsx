import { type ReactNode, Component } from 'react'
import { Input, Select, IconButton, CloseIcon, DateRangePicker } from 'ui-kit'
import dayjs from 'dayjs'
import type { DateRangeValue } from 'ui-kit'
import type { ValueEditorProps } from './types'
import { formatBooleanDisplay, formatDateForDisplay } from './valueEditorUtils'

type FieldType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'uuid' | 'unknown'

interface RenderInputProps {
    condition: ValueEditorProps['condition']
    state: { localValue: string }
    fieldType: FieldType
    currentDateTimeValue: string
    onTextChange: (event: React.ChangeEvent<HTMLInputElement>) => void
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
    onBlur: () => void
    onClear: (event: React.MouseEvent) => void
    onUpdateValue: (localValue: string) => void
    onUpdateDateTimeValue: (value: string) => void
    onUpdateRangeValue: (value: [string | undefined, string | undefined]) => void
    onUpdateUseRange: (useRange: boolean) => void
    onStopEditing: () => void
}

class DateRangeEditor extends Component<{
    rawValue: string | [string, string]
    onChange: (value: [string | undefined, string | undefined]) => void
    onClear: () => void
    hasValue: boolean
}> {
    state: { value: DateRangeValue } = { value: [null, null] }

    componentDidMount(): void {
        this.syncFromProps(this.props)
    }

    componentDidUpdate(prevProps: { rawValue: string | [string, string] }): void {
        if (prevProps.rawValue !== this.props.rawValue) {
            this.syncFromProps(this.props)
        }
    }

    private syncFromProps(props: { rawValue: string | [string, string] }) {
        const rawValue = props.rawValue
        if (Array.isArray(rawValue) && rawValue[0] && rawValue[1]) {
            this.setState({ value: [dayjs(rawValue[0]).toDate(), dayjs(rawValue[1]).toDate()] })
        } else if (typeof rawValue === 'string' && rawValue) {
            this.setState({ value: [dayjs(rawValue).toDate(), null] })
        } else {
            this.setState({ value: [null, null] })
        }
    }

    private handleChange = (dateRange: DateRangeValue) => {
        const [start, end] = dateRange
        const startIso = start ? dayjs(start).toISOString() : undefined
        const endIso = end ? dayjs(end).toISOString() : undefined
        this.setState({ value: dateRange })
        this.props.onChange([startIso, endIso])
    }

    private handleClear = () => {
        this.setState({ value: [null, null] })
        this.props.onChange([undefined, undefined])
    }

    render() {
        const { rawValue, hasValue, onClear } = this.props
        const isRange = Array.isArray(rawValue)

        return (
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <DateRangePicker
                    value={this.state.value}
                    onChange={this.handleChange}
                    showPresets={false}
                    includeDefaultPresets={false}
                />

            </div>
        )
    }
}

const clearButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: '4px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'auto',
}

function wrapWithClearButton(editor: ReactNode, hasValue: boolean, onClear: (event: React.MouseEvent) => void): ReactNode {
    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
            <div style={{ flex: 1, paddingRight: '32px' }}>
                {editor}
            </div>
            {hasValue && (
                <IconButton
                    icon={CloseIcon}
                    onClick={onClear}
                    size="small"
                    style={clearButtonStyle}
                />
            )}
        </div>
    )
}

function renderDateEditor(props: RenderInputProps): ReactNode {
    const { condition, onClear, onUpdateValue, onUpdateRangeValue } = props
    const value = props.state.localValue
    const hasValue = value.trim() !== ''
    const rawValue = condition.value
    const isRange = Array.isArray(rawValue)

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <DateRangeEditor
                rawValue={rawValue}
                onChange={onUpdateRangeValue}
                onClear={() => {
                    if (!isRange) {
                        onUpdateValue('')
                    }
                }}
                hasValue={hasValue}
            />
        </div>
    )
}

export function renderInput(props: RenderInputProps): ReactNode {
    const { state, fieldType, onTextChange, onKeyDown, onBlur, onClear, onUpdateValue, onUpdateRangeValue, onStopEditing } = props
    const value = state.localValue
    const hasValue = value.trim() !== ''

    const editorProps = {
        variant: 'contained' as const,
        fullWidth: true,
        value,
        onChange: onTextChange,
        onKeyDown,
        onBlur,
    }

    const renderInputProps = {
        ...props,
        onUpdateRangeValue,
    }

    switch (fieldType) {
        case 'number':
            return wrapWithClearButton(<Input {...editorProps} type="number" />, hasValue, onClear)
        case 'date':
            return renderDateEditor(renderInputProps)
        case 'boolean': {
            return (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 1, paddingRight: '32px' }}>
                        <Select
                            options={[
                                { value: 'true', label: 'Да' },
                                { value: 'false', label: 'Нет' },
                            ]}
                            value={value || 'false'}
                            variant="contained"
                            resettable={false}
                            onChange={(val) => {
                                onUpdateValue(val ?? 'false')
                                onStopEditing()
                            }}
                        />
                    </div>
                    {hasValue && (
                        <IconButton
                            icon={CloseIcon}
                            onClick={onClear}
                            size="small"
                            style={clearButtonStyle}
                        />
                    )}
                </div>
            )
        }
        default:
            return wrapWithClearButton(<Input {...editorProps} type="text" />, hasValue, onClear)
    }
}

export function renderDisplay(
    condition: ValueEditorProps['condition'],
    fieldType: FieldType,
    onDisplayClick: (event: React.MouseEvent) => void
): ReactNode {
    let displayValue: string | [string | undefined, string | undefined] = condition.value ?? ''

    let displayText = ''
    if (displayValue) {
        if (fieldType === 'boolean') {
            displayText = formatBooleanDisplay(typeof displayValue === 'string' ? displayValue : '')
        } else if (fieldType === 'date' || fieldType === 'datetime') {
            displayText = formatDateForDisplay(displayValue, fieldType)
        }
    }

    return (
        <span
            className="selection-cell-display selection-value-input"
            onClick={onDisplayClick}
            aria-label="Редактировать поле"
            title="Дважды кликните для редактирования"
        >
            {displayText || 'Пусто'}
        </span>
    )
}
