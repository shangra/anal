export type ListFieldDataType =
    | 'string'
    | 'number'
    | 'date'
    | 'boolean'
    | 'uuid'
    | 'unknown'

export interface ListFieldDescriptor {
    value: string
    label: string
    dataType: ListFieldDataType
}

const RAW_TYPE_TO_FIELD_DATA_TYPE: Record<string, ListFieldDataType> = {
    string: 'string',
    text: 'string',
    number: 'number',
    integer: 'number',
    int: 'number',
    float: 'number',
    decimal: 'number',
    boolean: 'boolean',
    bool: 'boolean',
    date: 'date',
    datetime: 'date',
    timestamp: 'date',
    uuid: 'uuid',
    guid: 'uuid',
}

export function normalizeListFieldDataType(
    rawType: string | undefined,
): ListFieldDataType {
    if (!rawType) return 'unknown'
    return RAW_TYPE_TO_FIELD_DATA_TYPE[rawType.toLocaleLowerCase()] ?? 'unknown'
}