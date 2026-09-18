const CalcFieldAggregateClass = require('..');

const AGGREGATE_PREFIX = ':->:';

global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

describe(`CalcFieldAggregateClass`, () => {
    it(`getCalcFields`, () => {
        const calc = new CalcFieldAggregateClass({ aggPrefix: AGGREGATE_PREFIX });

        const settings = {
            columns: ['dtreport', 'ntb'],
            index: ['terStruct_with'],
            values: ['r_bal_all'],
            aggfunc: {
                semi_with_sub_field: [
                    {
                        name: 'SUM',
                        layer: {
                            id: '89dc76d3-ee63-4520-9750-dd8f1e82977d',
                            name: 'УПРКубПоказатели',
                            layer: {
                                id: '89dc76d3-ee63-4520-9750-dd8f1e82977d',
                                description: 'УПР Куб Показатели',
                                name: 'УПРКубПоказатели',
                                label: 'УПР Куб Показатели',
                                type: 'static',
                                isSelected: true,
                                hasCheck: true,
                                hasChild: false,
                                hasSorted: false,
                                hasFilter: false,
                                hasDelete: false,
                                isIrrelevant: false,
                                manifest: {
                                    settings: {
                                        ref: '77bc59e7-a83c-4513-a0f1-099784f50410',
                                    },
                                },
                            },
                        },
                    },
                ],
                r_bal_all: [
                    {
                        name: 'sum',
                        layer: {
                            id: '89dc76d3-ee63-4520-9750-dd8f1e82977d',
                            name: 'УПРКубПоказатели',
                            layer: {
                                id: '89dc76d3-ee63-4520-9750-dd8f1e82977d',
                                description: 'УПР Куб Показатели',
                                name: 'УПРКубПоказатели',
                                label: 'УПР Куб Показатели',
                                type: 'static',
                                isSelected: true,
                                hasCheck: true,
                                hasChild: false,
                                hasSorted: false,
                                hasFilter: false,
                                hasDelete: false,
                                isIrrelevant: false,
                                manifest: {
                                    settings: {
                                        ref: '77bc59e7-a83c-4513-a0f1-099784f50410',
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        };

        const fields = {
            semi_with_sub_field: {
                field: 'semi_with_sub_field',
                name: 'semiAdditiveWithSubField',
                description: 'Semi additive with sub field',
                id: '3c4d83e9-f816-448b-9523-8965736aaf6b',
                class_id: '14eb1a4e-64cd-4f65-9af6-b64e7b5f90af',
                type: 'float',
                value: "[?\n    const val = row['r_bal_all:->:LAST_VALUE'] / row.ntb;\n?]\n[[val]]",
                children: {
                    'c0d4977a-fe82-4f9f-9b69-56af9086c702': {
                        measures: {
                            link: '00234649-8eaa-4a3d-9adb-280b01fa8437',
                            value: 'e30cd6c5-597f-4e92-8c9a-4bb7a715dc88',
                        },
                        aggfunc: 'nonagg',
                    },
                    'caca9786-814a-4f73-9fad-951a314b4eaf': {
                        id: 'caca9786-814a-4f73-9fad-951a314b4eaf',
                        measures: {
                            link: 'b8e2b31f-f36d-4b77-b13d-f391bd96c60a',
                            value: '329d22fb-b4c4-4c48-85ea-43defa0461a0',
                        },
                        aggfunc: 'LAST_VALUE',
                        totalsOnoff: true,
                    },
                },
                onoff: false,
            },
        };

        const allMeasures = {
            '329d22fb-b4c4-4c48-85ea-43defa0461a0': {
                field: 'r_bal_all',
                name: 'r_bal_all',
                description: 'r_bal_all',
                id: '329d22fb-b4c4-4c48-85ea-43defa0461a0',
                class_id: 'b8e2b31f-f36d-4b77-b13d-f391bd96c60a',
                type: 'float',
            },
            '3c4d83e9-f816-448b-9523-8965736aaf6b': {
                field: 'semi_with_sub_field',
                name: 'semiAdditiveWithSubField',
                description: 'Semi additive with sub field',
                id: '3c4d83e9-f816-448b-9523-8965736aaf6b',
                class_id: '14eb1a4e-64cd-4f65-9af6-b64e7b5f90af',
                type: 'float',
                onoff: false,
                format: 'finance',
            },
        };

        const allDimensions = {
            '8e7c38bf-9c4d-48d8-bb0d-8f61ac107fb7': {
                field: 'terStruct_with',
                name: 'terStruct_with',
                description: 'terStruct_with',
                id: '8e7c38bf-9c4d-48d8-bb0d-8f61ac107fb7',
                class_id: '00234649-8eaa-4a3d-9adb-280b01fa8437',
            },
            '41e97fd0-86e3-4797-8764-63e52bf9c1b1': {
                field: 'dtreport',
                name: 'dtreport',
                description: 'dtreport',
                id: '41e97fd0-86e3-4797-8764-63e52bf9c1b1',
                class_id: '00234649-8eaa-4a3d-9adb-280b01fa8437',
                type: 'date',
                dateDimension: true,
                accountDimension: false,
            },
            'e30cd6c5-597f-4e92-8c9a-4bb7a715dc88': {
                field: 'ntb',
                name: 'ntb',
                description: 'ntb',
                id: 'e30cd6c5-597f-4e92-8c9a-4bb7a715dc88',
                class_id: '00234649-8eaa-4a3d-9adb-280b01fa8437',
                type: 'integer',
            },
        };

        const {
            values: newValues,
            aggFunc: newAggFunc,
            columns: newColumns,
            indexes: newIndexes,
            delFields,
            calculatedFields,
        } = calc.get(
            //@ts-ignore
            settings,
            fields,
            allMeasures,
            allDimensions
        );

        expect(newValues).toStrictEqual(['r_bal_all']);
        expect(newAggFunc).toStrictEqual({
            r_bal_all: [
                {
                    layer: {
                        id: '89dc76d3-ee63-4520-9750-dd8f1e82977d',
                        layer: {
                            description: 'УПР Куб Показатели',
                            hasCheck: true,
                            hasChild: false,
                            hasDelete: false,
                            hasFilter: false,
                            hasSorted: false,
                            id: '89dc76d3-ee63-4520-9750-dd8f1e82977d',
                            isIrrelevant: false,
                            isSelected: true,
                            label: 'УПР Куб Показатели',
                            manifest: {
                                settings: {
                                    ref: '77bc59e7-a83c-4513-a0f1-099784f50410',
                                },
                            },
                            name: 'УПРКубПоказатели',
                            type: 'static',
                        },
                        name: 'УПРКубПоказатели',
                    },
                    name: 'sum',
                },
            ],
            semi_with_sub_field: [
                {
                    layer: {
                        id: '89dc76d3-ee63-4520-9750-dd8f1e82977d',
                        layer: {
                            description: 'УПР Куб Показатели',
                            hasCheck: true,
                            hasChild: false,
                            hasDelete: false,
                            hasFilter: false,
                            hasSorted: false,
                            id: '89dc76d3-ee63-4520-9750-dd8f1e82977d',
                            isIrrelevant: false,
                            isSelected: true,
                            label: 'УПР Куб Показатели',
                            manifest: {
                                settings: {
                                    ref: '77bc59e7-a83c-4513-a0f1-099784f50410',
                                },
                            },
                            name: 'УПРКубПоказатели',
                            type: 'static',
                        },
                        name: 'УПРКубПоказатели',
                    },
                    name: 'SUM',
                },
            ],
        });
        expect(newColumns).toStrictEqual(['dtreport', 'ntb']);
        expect(newIndexes).toStrictEqual(['terStruct_with']);
        expect(delFields).toStrictEqual([]);
        expect(calculatedFields).toStrictEqual({});
    });

    it(`calculateFields`, async () => {
        const calculatedField = {
            'semi_with_sub_field:->:SUM': {
                field: 'semi_with_sub_field',
                name: 'semiAdditiveWithSubField',
                description: 'Semi additive with sub field',
                id: '3c4d83e9-f816-448b-9523-8965736aaf6b',
                class_id: '14eb1a4e-64cd-4f65-9af6-b64e7b5f90af',
                type: 'float',
                value: "[?\n    const val = row['r_bal_all:->:LAST_VALUE'] / row.ntb;\n?]\n[[val]]",
                children: {
                    'c0d4977a-fe82-4f9f-9b69-56af9086c702': {
                        measures: {
                            link: '00234649-8eaa-4a3d-9adb-280b01fa8437',
                            value: 'e30cd6c5-597f-4e92-8c9a-4bb7a715dc88',
                        },
                        aggfunc: 'nonagg',
                    },
                    'caca9786-814a-4f73-9fad-951a314b4eaf': {
                        id: 'caca9786-814a-4f73-9fad-951a314b4eaf',
                        measures: {
                            link: 'b8e2b31f-f36d-4b77-b13d-f391bd96c60a',
                            value: '329d22fb-b4c4-4c48-85ea-43defa0461a0',
                        },
                        aggfunc: 'sum',
                        totalsOnoff: true,
                    },
                },
                onoff: false,
            },
        };

        const options = {
            settings: {
                columns: ['dtreport'],
                index: ['terStruct_with'],
                values: ['semi_with_sub_field'],
                aggfunc: {
                    semi_with_sub_field: [
                        {
                            name: 'SUM',
                            layer: {
                                id: '89dc76d3-ee63-4520-9750-dd8f1e82977d',
                                name: 'УПРКубПоказатели',
                                layer: {
                                    id: '89dc76d3-ee63-4520-9750-dd8f1e82977d',
                                    description: 'УПР Куб Показатели',
                                    name: 'УПРКубПоказатели',
                                    label: 'УПР Куб Показатели',
                                    manifest: {
                                        settings: {
                                            ref: '77bc59e7-a83c-4513-a0f1-099784f50410',
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
            },
        };

        const data = {
            rows: [
                {
                    terStruct_with: 'lvl_0::0',
                    dtreport: '2023-01-28',
                    ntb: 13,
                    'r_bal_all:->:LAST_VALUE': '1354974807.1541',
                },
            ],
        };

        const keys = ['semi_with_sub_field:->:SUM'];

        const calc = new CalcFieldAggregateClass({ aggPrefix: AGGREGATE_PREFIX });

        const rows = await calc.calculateFields({ calculatedField, options, data, keys });

        const res = {
            '###__id__###': 0,
            ntb: 13,
            dtreport: '2023-01-28',
            terStruct_with: 'lvl_0::0',
            'r_bal_all:->:LAST_VALUE': '1354974807.1541',
            'semi_with_sub_field:->:SUM': 104228831.31954615,
        };

        expect(Object.values(rows)).toMatchObject([res]);
    });
});
