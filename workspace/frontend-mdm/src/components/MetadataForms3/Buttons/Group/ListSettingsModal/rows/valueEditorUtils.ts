import dayjs from 'dayjs'
import { getFieldDataType } from '../../../../../../helpers/listSettings'

const TIME_LABELS = new Set(['datetime', 'время', 'дата'])

export function getFieldFieldType(fieldValue: string): 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'uuid' | 'unknown' {
    const dataType = getFieldDataType(fieldValue)
    const label = fieldValue.toLowerCase()
    const isTimeRelated = TIME_LABELS.has(dataType) || TIME_LABELS.has(label)
    if (dataType === 'date' && isTimeRelated) return 'datetime'
    return dataType
}

export function formatBooleanDisplay(value: string): string {
    if (value === 'true') return 'Да'
    if (value === 'false') return 'Нет'
    return value || 'Значение'
}

function formatSingleDate(value: string, fieldType: string): string {
    if (!value) return ''
    const parsed = dayjs(value)
    if (!parsed.isValid()) return value
    if (fieldType === 'datetime') {
        return parsed.format('DD.MM.YYYY HH:mm:ss')
    }
    return parsed.format('DD.MM.YYYY')
}

export function formatDateForDisplay(value: string | [string | undefined, string | undefined], fieldType: string | 'date' | 'datetime' | 'boolean'): string {
    if (!value) return ''
    if (fieldType === 'number') return String(value)
    
    if (Array.isArray(value)) {
        const [start, end] = value
        const startStr = start ? formatSingleDate(start, fieldType) : ''
        const endStr = end ? formatSingleDate(end, fieldType) : ''
        if (startStr && endStr) return `${startStr} — ${endStr}`
        if (startStr) return startStr
        if (endStr) return endStr
        return ''
    }
    
    return formatSingleDate(value, fieldType)
}
