const QueryBuilderClassService = require('../../services/metadata/query/Query.class');
const qb = new QueryBuilderClassService({ meta: null, connector: null, select: null, account: null, semiAdditive: null, logger: null })

describe(`Query Class`, () => {
    it(`muatateRows`, () => {
        const rows = [
            {
                terStruct_with: "lvl_0::0",
                dtreport: "2023-01-28",
                "r_bal_all:->:FIRST_VALUE": "237339291.9902",
            },
            {
                terStruct_with: "lvl_0::0",
                dtreport: "2023-01-28",
                "r_bal_all:->:SUM": "237339291.9902",
            },
        ];

        const res = [
            {
                terStruct_with: "lvl_0::0",
                dtreport: "2023-01-28",
                "r_bal_all:->:FIRST_VALUE": "237339291.9902",
                "r_bal_all:->:SUM": "237339291.9902",
            }
        ]

        const attributes = [
            "terStruct_with",
            "dtreport",
            {
                func: "SUM",
                field: "r_bal_all",
                alias: "r_bal_all:->:SUM",
            },
            {
                func: "SUM",
                field: "r_bal_all",
                alias: "r_bal_all:->:FIRST_VALUE",
            },
        ];

        const data = qb.muatateRows(rows, { attributes });

        expect(data.length).toBe(1);
        expect(data).toMatchObject(res);
    })
})