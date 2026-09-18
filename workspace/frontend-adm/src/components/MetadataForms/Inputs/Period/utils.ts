function isValueEvent(value: any): boolean {
    return (
        value
        && typeof value === 'object'
        && 'target' in value
        && value.target
        && typeof value.target === 'object'
        && 'value' in value.target
    );
}

function isValueObject(value: any): boolean {
    return (
        value
        && typeof value === 'object'
        && 'value' in value
        && typeof (value).value === 'string'
    )
}

function extractActualValue(value: any): string | null {
    if (typeof value === 'string') return value
    if (isValueEvent(value)) return null
    if (isValueObject(value)) return value.value
    return null
}

export { extractActualValue }