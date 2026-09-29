import { Component, type ChangeEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import type { ValueEditorProps } from './types'
import { getFieldFieldType, formatDateForDisplay } from './valueEditorUtils'
import { renderInput, renderDisplay } from './valueEditorRenderers'

type RangeValue = [string | undefined, string | undefined]

type FieldType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'uuid' | 'unknown'

interface ValueEditorState {
    localValue: string
    rangeValue: RangeValue
    useRange: boolean
}

export class ValueEditor extends Component<ValueEditorProps, ValueEditorState> {
    private currentDateTimeValue = ''

    constructor(props: ValueEditorProps) {
        super(props)
        dayjs.extend(customParseFormat)

        const fieldType = getFieldFieldType(props.condition.field)
        const conditionValue = props.condition.value ?? ''
        const isRange = Array.isArray(conditionValue)
        const rangeValue: RangeValue = isRange
            ? [conditionValue[0] ?? undefined, conditionValue[1] ?? undefined]
            : [undefined, undefined]
        const useRange = (props.condition as { useRange?: boolean }).useRange ?? false
        
        this.state = {
            localValue: formatDateForDisplay(conditionValue, fieldType),
            rangeValue,
            useRange,
        }
        if (fieldType === 'date' || fieldType === 'datetime') {
            this.currentDateTimeValue = !isRange ? conditionValue : ''
        }
    }

    componentDidMount(): void {
        this.syncFromProps()
    }

    componentDidUpdate(prevProps: ValueEditorProps): void {
        if (prevProps.isEditing && !this.props.isEditing) {
            this.commitSilent()
        }
        if (!prevProps.isEditing && this.props.isEditing) {
            this.syncFromProps()
        }
        if (this.props.isEditing) return
        if (prevProps.condition.value !== this.props.condition.value) {
            this.syncFromProps()
        }
        const prevUseRange = (prevProps.condition as { useRange?: boolean }).useRange
        const currUseRange = (this.props.condition as { useRange?: boolean }).useRange
        if (prevUseRange !== currUseRange) {
            this.setState({ useRange: currUseRange ?? false })
        }
    }

    private commitSilent(): void {
        const { condition } = this.props
        const fieldType = this.getFieldType()
        const useRange = this.state.useRange
        const rangeValue = this.state.rangeValue
        const singleValue = fieldType === 'date' || fieldType === 'datetime'
            ? this.currentDateTimeValue
            : this.state.localValue

        if (useRange && (fieldType === 'date' || fieldType === 'datetime')) {
            const [start, end] = rangeValue
            const parsedStart = this.parseDateTimeValue(start ?? '')
            const parsedEnd = this.parseDateTimeValue(end ?? '')
            const rangeHasValues = Boolean(start || end)
            
            if (!rangeHasValues) {
                if (condition.value !== '') {
                    this.update(condition.id, { value: '', useRange: false, comparison: 'eq' as any })
                }
                return
            }
            
            const rangeResult: [string, string] = [parsedStart || '', parsedEnd || '']
            if (JSON.stringify(rangeResult) !== JSON.stringify(condition.value) || condition.useRange !== true) {
                this.update(condition.id, { value: rangeResult, useRange: true, comparison: 'between' as any })
            }
            return
        }

        if (fieldType === 'date' || fieldType === 'datetime') {
            if (condition.useRange && useRange !== true) {
                const finalValue = singleValue
                if (fieldType === 'datetime') {
                    if (finalValue) {
                        let parsed = dayjs(finalValue)
                        if (!parsed.isValid()) {
                            parsed = dayjs(finalValue, 'DD.MM.YYYY HH:mm:ss', true)
                        }
                        if (parsed.isValid()) {
                            const isoValue = parsed.toISOString()
                            this.update(condition.id, { value: isoValue, useRange: false, comparison: 'eq' as any })
                        }
                    } else {
                        this.update(condition.id, { value: '', useRange: false, comparison: 'eq' as any })
                    }
                } else {
                    if (finalValue) {
                        let parsed = dayjs(finalValue, 'DD.MM.YYYY', true)
                        if (!parsed.isValid()) {
                            parsed = dayjs(finalValue, 'YYYY-MM-DD')
                        }
                        if (parsed.isValid()) {
                            const isoValue = parsed.format('YYYY-MM-DD') + 'T00:00:00.000Z'
                            this.update(condition.id, { value: isoValue, useRange: false, comparison: 'eq' as any })
                        }
                    } else {
                        this.update(condition.id, { value: '', useRange: false, comparison: 'eq' as any })
                    }
                }
                return
            }
        }

        const finalValue = singleValue

        if (fieldType === 'number') {
            if (finalValue !== condition.value) {
                this.update(condition.id, { value: finalValue })
            }
            return
        }
        if (fieldType === 'datetime') {
            if (!finalValue) {
                if (condition.value !== '') {
                    this.update(condition.id, { value: '' })
                }
                return
            }
            let parsed = dayjs(finalValue)
            if (!parsed.isValid()) {
                parsed = dayjs(finalValue, 'DD.MM.YYYY HH:mm:ss', true)
            }
            if (parsed.isValid()) {
                const isoValue = parsed.toISOString()
                if (isoValue !== condition.value) {
                    this.update(condition.id, { value: isoValue })
                }
            }
            return
        }
        if (fieldType === 'date') {
            if (!finalValue) {
                if (condition.value !== '') {
                    this.update(condition.id, { value: '' })
                }
                return
            }
            let parsed = dayjs(finalValue, 'DD.MM.YYYY', true)
            if (!parsed.isValid()) {
                parsed = dayjs(finalValue, 'YYYY-MM-DD')
            }
            if (parsed.isValid()) {
                const isoValue = parsed.format('YYYY-MM-DD') + 'T00:00:00.000Z'
                if (isoValue !== condition.value) {
                    this.update(condition.id, { value: isoValue })
                }
            }
            return
        }
        if (finalValue !== condition.value) {
            this.update(condition.id, { value: finalValue })
        }
    }

    private parseDateTimeValue(val: string): string {
        if (!val) return ''
        let parsed = dayjs(val)
        if (!parsed.isValid()) {
            parsed = dayjs(val, 'DD.MM.YYYY HH:mm:ss', true)
        }
        if (!parsed.isValid() && this.getFieldType() === 'date') {
            parsed = dayjs(val, 'DD.MM.YYYY', true)
            if (parsed.isValid()) return parsed.format('YYYY-MM-DD') + 'T00:00:00.000Z'
        }
        if (parsed.isValid()) return parsed.toISOString()
        return ''
    }

    private syncFromProps(): void {
        const { condition } = this.props
        const fieldType = this.getFieldType()
        const isRange = Array.isArray(condition.value)
        const useRange = (condition as { useRange?: boolean }).useRange ?? false
        
        if (fieldType === 'date' || fieldType === 'datetime') {
            this.currentDateTimeValue = !isRange ? (condition.value as string) ?? '' : ''
        }
        
        const rangeValue: RangeValue = isRange
            ? [(condition.value as [string, string])[0] ?? undefined, (condition.value as [string, string])[1] ?? undefined]
            : [undefined, undefined]
            
        this.setState({
            localValue: formatDateForDisplay(condition.value ?? '', fieldType),
            rangeValue,
            useRange,
        })
    }

    private getFieldType(): FieldType {
        return getFieldFieldType(this.props.condition.field)
    }

    private update(conditionId: string, patch: Partial<import('../../../../../../helpers/listSettings/facets/selection/types').SelectionCondition>): void {
        if ('onUpdate' in this.props && typeof this.props.onUpdate === 'function') {
            this.props.onUpdate(conditionId, patch)
        }
    }

    private handleTextChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const value = event.target.value
        const fieldType = this.getFieldType()

        if (fieldType === 'number') {
            const filtered = value.replace(/[^0-9]/g, '')
            if (filtered !== value) {
                this.setState({ localValue: filtered })
                return
            }
        }

        this.setState({ localValue: value })
    }

    private handleBlur = (): void => {
        this.commit()
    }

    private handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
        if (this.getFieldType() === 'number' && ['-', '.', ',', 'e', 'E', '+'].includes(event.key)) {
            event.preventDefault()
            return
        }

        if (event.key === 'Enter') {
            event.preventDefault()
            this.commit()
        } else if (event.key === 'Escape') {
            event.preventDefault()
            this.cancel()
        }
    }

    private commit = (): void => {
        const { condition, onStopEditing } = this.props
        const fieldType = this.getFieldType()
        const useRange = this.state.useRange
        const rangeValue = this.state.rangeValue
        
        if (useRange && (fieldType === 'date' || fieldType === 'datetime')) {
            const [start, end] = rangeValue
            const parsedStart = this.parseDateTimeValue(start ?? '')
            const parsedEnd = this.parseDateTimeValue(end ?? '')
            const rangeHasValues = Boolean(start || end)
            
            if (!rangeHasValues) {
                if (condition.value !== '') {
                    this.update(condition.id, { value: '', useRange: false, comparison: 'eq' as any })
                }
            } else {
                const rangeResult: [string, string] = [parsedStart || '', parsedEnd || '']
                if (JSON.stringify(rangeResult) !== JSON.stringify(condition.value) || condition.useRange !== true) {
                    this.update(condition.id, { value: rangeResult, useRange: true, comparison: 'between' as any })
                }
            }
            onStopEditing()
            return
        }

        const finalValue = fieldType === 'date' || fieldType === 'datetime'
            ? this.currentDateTimeValue
            : this.state.localValue

        if (fieldType === 'number') {
            if (finalValue !== condition.value) {
                this.update(condition.id, { value: finalValue })
            }
            onStopEditing()
            return
        }
        if (fieldType === 'datetime') {
            if (!finalValue) {
                if (condition.value !== '') {
                    this.update(condition.id, { value: '' })
                }
            } else {
                let parsed = dayjs(finalValue)
                if (!parsed.isValid()) {
                    parsed = dayjs(finalValue, 'DD.MM.YYYY HH:mm:ss', true)
                }
                if (parsed.isValid()) {
                    const isoValue = parsed.toISOString()
                    if (isoValue !== condition.value) {
                        this.update(condition.id, { value: isoValue })
                    }
                }
            }
            onStopEditing()
            return
        }
        if (fieldType === 'date') {
            if (!finalValue) {
                if (condition.value !== '') {
                    this.update(condition.id, { value: '' })
                }
            } else {
                let parsed = dayjs(finalValue, 'DD.MM.YYYY', true)
                if (!parsed.isValid()) {
                    parsed = dayjs(finalValue, 'YYYY-MM-DD')
                }
                if (parsed.isValid()) {
                    const isoValue = parsed.format('YYYY-MM-DD') + 'T00:00:00.000Z'
                    if (isoValue !== condition.value) {
                        this.update(condition.id, { value: isoValue })
                    }
                }
            }
            onStopEditing()
            return
        }
        if (finalValue !== condition.value) {
            this.update(condition.id, { value: finalValue })
        }
        onStopEditing()
    }

    private cancel = (): void => {
        const fieldType = this.getFieldType()
        this.setState({ localValue: formatDateForDisplay(this.props.condition.value ?? '', fieldType) })
        this.props.onStopEditing()
    }

    private handleDisplayClick = (event: MouseEvent): void => {
        this.props.onBeginEditing(this.props.condition.id, 'value', event)
    }

    private handleClear = (event: MouseEvent): void => {
        event.stopPropagation()
        const { condition, onStopEditing } = this.props
        const fieldType = this.getFieldType()
        const useRange = this.state.useRange
        
        if (useRange && (fieldType === 'date' || fieldType === 'datetime')) {
            this.setState({ rangeValue: [undefined, undefined] })
            this.update(condition.id, { value: '', useRange: false, comparison: 'eq' as any })
        } else {
            this.update(condition.id, { value: '' })
        }
        this.setState({ localValue: '' })
        if (fieldType === 'date' || fieldType === 'datetime') {
            this.currentDateTimeValue = ''
        }
        onStopEditing()
    }

    render(): ReactNode {
        const { condition } = this.props
        const fieldType = this.getFieldType()

        if (this.props.isEditing) {
            return (
                <div className="selection-editor-wrapper" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                    {renderInput({
                        condition,
                        state: this.state,
                        fieldType,
                        currentDateTimeValue: this.currentDateTimeValue,
                        onTextChange: this.handleTextChange,
                        onKeyDown: this.handleKeyDown,
                        onBlur: this.handleBlur,
                        onClear: this.handleClear,
                        onUpdateValue: (localValue) => this.setState({ localValue }),
                        onUpdateDateTimeValue: (value) => {
                            if (fieldType === 'date' || fieldType === 'datetime') {
                                this.currentDateTimeValue = value
                            }
                        },
                        onUpdateRangeValue: (range) => {
                            if (fieldType === 'date' || fieldType === 'datetime') {
                                const prevRange = this.state.rangeValue
                                this.setState({ rangeValue: range })
                                if (JSON.stringify(range) !== JSON.stringify(prevRange)) {
                                    if (range[0] || range[1]) {
                                        this.update(condition.id, { value: [range[0] ?? '', range[1] ?? ''] })
                                    }
                                }
                            }
                        },
                        onUpdateUseRange: (useRange) => {
                            if (fieldType === 'date' || fieldType === 'datetime') {
                                const prevUseRange = this.state.useRange
                                this.setState({ useRange })
                                
                                if (prevUseRange !== useRange) {
                                    if (useRange) {
                                        const newRange: [string, string] = [this.currentDateTimeValue || '', '']
                                        this.setState({ rangeValue: [this.currentDateTimeValue || undefined, undefined] })
                                        this.update(condition.id, {
                                            value: newRange,
                                            useRange: true,
                                            comparison: 'between' as any,
                                        })
                                    } else {
                                        const singleVal = this.state.rangeValue[0] ?? this.currentDateTimeValue
                                        this.currentDateTimeValue = singleVal
                                        if (fieldType === 'datetime') {
                                            let parsed = dayjs(singleVal)
                                            if (!parsed.isValid()) parsed = dayjs(singleVal, 'DD.MM.YYYY HH:mm:ss', true)
                                            if (parsed.isValid()) {
                                                this.update(condition.id, {
                                                    value: parsed.toISOString(),
                                                    useRange: false,
                                                    comparison: 'eq' as any,
                                                })
                                            } else {
                                                this.update(condition.id, { value: '', useRange: false, comparison: 'eq' as any })
                                            }
                                        } else {
                                            let parsed = dayjs(singleVal, 'DD.MM.YYYY', true)
                                            if (!parsed.isValid()) parsed = dayjs(singleVal, 'YYYY-MM-DD')
                                            if (parsed.isValid()) {
                                                const isoValue = parsed.format('YYYY-MM-DD') + 'T00:00:00.000Z'
                                                this.update(condition.id, {
                                                    value: isoValue,
                                                    useRange: false,
                                                    comparison: 'eq' as any,
                                                })
                                            } else {
                                                this.update(condition.id, { value: '', useRange: false, comparison: 'eq' as any })
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        onStopEditing: this.props.onStopEditing,
                    })}
                </div>
            )
        }

        return renderDisplay(condition, fieldType, this.handleDisplayClick)
    }
}
