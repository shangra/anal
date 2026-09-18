const SemiAdditiveClass = require('../../services/metadata/matrix/account/SemiAdditive.class');

global.structuredClone = (val) => JSON.parse(JSON.stringify(val))

describe('SemiAdditiveClass', () => {
    it('matrix', async () => {
        const attr = [
            "terStruct_with",
            "calendar",
            {
                func: "SUM",
                field: "r_bal_all",
                alias: "r_bal_all:->:SUM",
            },
            {
                func: "FIRST_VALUE",
                field: "r_bal_all",
                alias: "r_bal_all:->:FIRST_VALUE",
            },
        ];

        const semiAdditive = new SemiAdditiveClass({ meta: null, logger: null });

        const { mappedOptions: res } = await semiAdditive.matrix({ options: { attributes: attr } });

        const expectRes = [
            {
                attributes: [
                    "terStruct_with",
                    "calendar",
                    {
                        func: "FIRST_VALUE",
                        field: "r_bal_all",
                        alias: "r_bal_all:->:FIRST_VALUE",
                    },
                ]
            },
            {
                attributes: [
                    "terStruct_with",
                    "calendar",
                    {
                        func: "SUM",
                        field: "r_bal_all",
                        alias: "r_bal_all:->:SUM",
                    }
                ]
            },
        ]

        expect(res).toMatchObject(expectRes);
    })
})