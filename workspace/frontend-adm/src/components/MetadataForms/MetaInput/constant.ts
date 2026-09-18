import dayjs from 'dayjs';

export const typeNameToTypeCodeMapping: Record<string, number> = {
    string: 0,
    float: 1,
    boolean: 2,
    datetime: 3,
    ref: 10,
};
export const typeCodeToTypeNameMapping: Record<number, string> = {
    0: 'string',
    1: 'float',
    2: 'boolean',
    3: 'datetime',
    10: 'ref',
};

export const fieldTypeName = {
    UUID: 'uuid',
    TEXT: 'text',
    BLOB: 'blob',
    STRING: 'string',
    BOOLEAN: 'boolean',
    INTEGER: 'integer',
    FLOAT: 'float',
    DATE: 'date',
    DATETIME: 'datetime',
    TIMESTAMP: 'timestamp',
    COMPOSITE: 'composite',
    VARCHAR: 'varchar',
    REF: 'ref',
    GREF: 'gref',
    REAL: 'real',
    LIST: 'list',
    SELECT: 'select',
    PERIOD: 'period',
};

export const defaultValueByTypeName = {
    [fieldTypeName.STRING]: null,
    [fieldTypeName.BOOLEAN]: null,
    [fieldTypeName.UUID]: null,
    [fieldTypeName.PERIOD]: null,
    [fieldTypeName.FLOAT]: 0,
    [fieldTypeName.INTEGER]: 0,
    get [fieldTypeName.TIMESTAMP]() {
        return dayjs().format('YYYY-MM-DDTHH:mm:ss');
    },
    get [fieldTypeName.DATETIME]() {
        return dayjs().format('YYYY-MM-DDTHH:mm:ss');
    },
    get [fieldTypeName.DATE]() {
        return dayjs().format('YYYY-MM-DD');
    },
    [fieldTypeName.REF]: null,
    [fieldTypeName.COMPOSITE]: {
        type: 10,
        value: null,
        link: null,
        label: null,
    },
};

export const clearedValueByTypeName = {
    [fieldTypeName.STRING]: null,
    [fieldTypeName.BOOLEAN]: null,
    [fieldTypeName.UUID]: null,
    [fieldTypeName.FLOAT]: 0,
    [fieldTypeName.INTEGER]: 0,
    [fieldTypeName.TIMESTAMP]: null,
    [fieldTypeName.DATETIME]: null,
    [fieldTypeName.DATE]: null,
    [fieldTypeName.REF]: null,
    [fieldTypeName.PERIOD]: null,
    [fieldTypeName.COMPOSITE]: {
        type: 10,
        value: null,
        link: null,
        label: null,
    },
};
