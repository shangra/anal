module.exports = {
    subDimensionDelimeter: '/',
    aggregateDelimeter: ":->:",

    typeField: '__type__',

    main: 'main',
    indexes: 'indexes',
    columns: 'columns',
    totals: 'totals',

    noRefName: '__no_ref__',

    GROUPING_SET_CONNECTOR_TYPES: ['ClickHouse'],

    SEMI_ADDITIVE: ['LAST_VALUE', 'FIRST_VALUE'],
    COUNT: ['COUNT', 'DISTINCT_COUNT'],

    SQLNames: {
        'SUM': 'sum',
        'COUNT': 'len',
        'DISTINCT_COUNT': 'distinctLen',
        'AVG': 'mean',
        'MIN': 'min',
        'MAX': 'max',
        'FIRST_VALUE': 'FirstChild',
        'LAST_VALUE': 'LastChild',
        'ACCOUNT': 'ACCOUNT'
    }
}