const TYPE_CODE_TO_NAME: Record<number, string> = {
    0: 'string',
    1: 'float',
    2: 'boolean',
    3: 'datetime',
    10: 'ref',
}

function isTypedValue(value: unknown): value is { type: number; value: unknown } {
    return (
        value !== null &&
        typeof value === 'object' &&
        'type' in value &&
        'value' in value
    )
}

export function formatCellValue(value: unknown, refValue?: unknown): unknown {
    if (isTypedValue(value)) {
        if (TYPE_CODE_TO_NAME[value.type] === 'boolean') {
            return value.value ? 'Правда' : 'Ложь'
        }

        return value.value || ''
    }

    return refValue ?? value ?? ''
}
