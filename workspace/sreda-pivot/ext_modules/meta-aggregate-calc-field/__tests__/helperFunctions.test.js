const {
    sumByField,
    avgByField,
    minByField,
    maxByField,
    getValuesByField,
    filterByFieldValue,
    formatResult,
    formatResultWithContext,
    getGroupedRows,
    getGroupedRowsWithContext,
    getGroupedByAllKeysExept,
    getGroupedByAllKeysExeptWithContext,
} = require('../helper/HelperFunctions');

describe(`HelperFunctions`, () => {
    it(`getGroupedByAllKeysExept`, () => {
        const rows = [
            { id: 0, sum: 1_000, index: 'asdf_index_1', column: 'asdf_column', ntb: 18, nosb: 7 },
            { id: 1, sum: 1_000, index: 'asdf_index_1', column: 'asdf_column', ntb: 18, nosb: 7 },
            { id: 2, sum: 1_000, index: 'asdf_index', column: 'asdf_column', ntb: 18, nosb: 7 },
            { id: 3, sum: 1_000, index: 'asdf_index', column: 'asdf_column', ntb: 18, nosb: 7 },
            { id: 4, sum: 1_000, index: 'asdf_index', column: 'asdf_column', ntb: 18, nosb: 7 },
        ];

        const result = [
            { id: 0, sum: 1_000, index: 'asdf_index_1', column: 'asdf_column', ntb: 18, nosb: 7 },
            { id: 1, sum: 1_000, index: 'asdf_index_1', column: 'asdf_column', ntb: 18, nosb: 7 },
        ];

        const res = getGroupedByAllKeysExept(rows, rows[0], ['ntb', 'nosb', 'sum'], 'id');

        expect(res).toMatchObject(result);
    });
});
