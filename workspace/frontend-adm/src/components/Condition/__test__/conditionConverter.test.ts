import {
    QueryBuilderGroupCombinatorEnum,
    QueryBuilderRuleCommonOperationEnum,
    type Group,
    type MetaField,
} from 'components/DRQueryBuilder/types';
import { backendToGroup, exportMongoDB, exportJsonLogic, groupToBackend } from '../conditionConverter';

const makeField = (overrides: Partial<MetaField> & { value: string; label: string }): MetaField => ({
    ...overrides,
}) as MetaField;

const fieldsFixture: MetaField[] = [
    makeField({
        value: 'roles',
        label: 'Роли',
        type: 'input',
        values: [{ name: 'uuid-admin', label: 'Администратор', value: 'uuid-admin' }],
        operators: [
            QueryBuilderRuleCommonOperationEnum.$in,
            QueryBuilderRuleCommonOperationEnum.$notIn,
            QueryBuilderRuleCommonOperationEnum.$like,
            QueryBuilderRuleCommonOperationEnum.$notLike,
        ],
    }),
    makeField({
        value: 'rules',
        label: 'Правила',
        type: 'input',
        values: [{ name: 'uuid-rules', label: 'Administrator', value: 'uuid-rules' }],
        operators: [
            QueryBuilderRuleCommonOperationEnum.$in,
            QueryBuilderRuleCommonOperationEnum.$notIn,
            QueryBuilderRuleCommonOperationEnum.$like,
            QueryBuilderRuleCommonOperationEnum.$notLike,
        ],
    }),
    makeField({
        value: 'attributes.uuid.value',
        label: 'Почта',
        type: 'string',
    }),
    makeField({
        value: 'ntb',
        label: 'КодТБ',
        inputType: 'number',
    }),
    makeField({
        value: 'groups',
        label: 'Группы',
        type: 'input',
        values: [],
        operators: [QueryBuilderRuleCommonOperationEnum.$like],
    }),
];

describe('conditionConverter - jsonLogic', () => {
    describe('parseJsonLogic (via backendToGroup)', () => {
        it('parses {in: [val, {var}]} as $like (Содержит)', () => {
            const input = { in: ['uuid-admin', { var: 'roles' }] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            expect(group.rules).toHaveLength(1);
            const rule = group.rules[0] as any;
            expect(rule.fieldName).toBe('roles');
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$like);
            expect(rule.value).toBe('uuid-admin');
        });

        it('parses {in: [{var}, [vals]]} as $in (В списке)', () => {
            const input = { in: [{ var: 'attributes.uuid.value' }, ['a', 'b']] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            const rule = group.rules[0] as any;
            expect(rule.fieldName).toBe('attributes.uuid.value');
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$in);
            expect(rule.value).toEqual(['a', 'b']);
        });

        it('parses {!in: [{var}, [vals]]} as $notIn (Не в списке)', () => {
            const input = { '!in': [{ var: 'attributes.uuid.value' }, ['a', 'b']] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            const rule = group.rules[0] as any;
            expect(rule.fieldName).toBe('attributes.uuid.value');
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$notIn);
            expect(rule.value).toEqual(['a', 'b']);
        });

        it('parses {!in: [val, {var}]} as $notLike (Не содержит)', () => {
            const input = { '!in': ['uuid-admin', { var: 'roles' }] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            const rule = group.rules[0] as any;
            expect(rule.fieldName).toBe('roles');
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$notLike);
            expect(rule.value).toBe('uuid-admin');
        });

        it('parses wrapped "!" {"!": {"in": [val, {var}]}} as $notLike', () => {
            const input = { '!': { in: ['uuid-admin', { var: 'roles' }] } };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            const rule = group.rules[0] as any;
            expect(rule.fieldName).toBe('roles');
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$notLike);
            expect(rule.value).toBe('uuid-admin');
        });

        it('parses wrapped "!" {"!": {"in": [{var}, [vals]]}} as $notIn', () => {
            const input = { '!': { in: [{ var: 'attributes.uuid.value' }, ['a', 'b']] } };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            const rule = group.rules[0] as any;
            expect(rule.fieldName).toBe('attributes.uuid.value');
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$notIn);
            expect(rule.value).toEqual(['a', 'b']);
        });

        it('parses "==": [{var}, value]', () => {
            const input = { '==': [{ var: 'attributes.uuid.value' }, '65'] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            expect(group.rules).toHaveLength(1);
            const rule = group.rules[0] as any;
            expect(rule.fieldName).toBe('attributes.uuid.value');
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$eq);
            expect(rule.value).toBe('65');
        });

        it('parses "==": [{var}, null] as $isNull', () => {
            const input = { '==': [{ var: 'attributes.uuid.value' }, null] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$isNull);
            expect(rule.value).toBe(null);
        });

        it('parses "!=": [{var}, null] as $isNotNull', () => {
            const input = { '!=': [{ var: 'attributes.uuid.value' }, null] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$isNotNull);
            expect(rule.value).toBe(null);
        });

        it('parses "startsWith": [{var}, value] as $startsWith', () => {
            const input = { startsWith: [{ var: 'attributes.uuid.value' }, 'foo'] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$startsWith);
            expect(rule.value).toBe('foo');
        });

        it('parses "endsWith": [{var}, value] as $endsWith', () => {
            const input = { endsWith: [{ var: 'attributes.uuid.value' }, 'bar'] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$endsWith);
            expect(rule.value).toBe('bar');
        });

        it('parses "and" combinator with multiple rules', () => {
            const input = {
                and: [
                    { in: ['uuid-admin', { var: 'roles' }] },
                    { '==': [{ var: 'attributes.uuid.value' }, '65'] },
                ],
            };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');

            expect(group.combinator).toBe(QueryBuilderGroupCombinatorEnum.$and);
            expect(group.rules).toHaveLength(2);
            expect((group.rules[0] as any).fieldName).toBe('roles');
            expect((group.rules[1] as any).fieldName).toBe('attributes.uuid.value');
        });
    });

    describe('exportJsonLogic', () => {
        it('serializes $eq as "==" with {var} first', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$eq,
                        value: '65',
                    },
                ],
            };
            expect(exportJsonLogic(group)).toEqual({ '==': [{ var: 'attributes.uuid.value' }, '65'] });
        });

        it('serializes $like as "in" (value first, {var} second)', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'roles',
                        operator: QueryBuilderRuleCommonOperationEnum.$like,
                        value: 'uuid-admin',
                    },
                ],
            };
            expect(exportJsonLogic(group, fieldsFixture)).toEqual({
                in: ['uuid-admin', { var: 'roles' }],
            });
        });

        it('serializes $notLike as wrapped "!" with "in" inside (value first)', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'roles',
                        operator: QueryBuilderRuleCommonOperationEnum.$notLike,
                        value: 'uuid-admin',
                    },
                ],
            };
            expect(exportJsonLogic(group, fieldsFixture)).toEqual({
                '!': { in: ['uuid-admin', { var: 'roles' }] },
            });
        });

        it('serializes $in with array value as "in" ({var} first, array second)', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$in,
                        value: ['a', 'b'],
                    },
                ],
            };
            expect(exportJsonLogic(group, fieldsFixture)).toEqual({
                in: [{ var: 'attributes.uuid.value' }, ['a', 'b']],
            });
        });

        it('serializes $notIn with array value as "!in" ({var} first, array second)', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$notIn,
                        value: ['a', 'b'],
                    },
                ],
            };
            expect(exportJsonLogic(group, fieldsFixture)).toEqual({
                '!in': [{ var: 'attributes.uuid.value' }, ['a', 'b']],
            });
        });

        it('serializes $isNull as "==": [{var}, null]', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$isNull,
                        value: null,
                    },
                ],
            };
            expect(exportJsonLogic(group)).toEqual({
                '==': [{ var: 'attributes.uuid.value' }, null],
            });
        });

        it('serializes $isNotNull as "!=": [{var}, null]', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$isNotNull,
                        value: null,
                    },
                ],
            };
            expect(exportJsonLogic(group)).toEqual({
                '!=': [{ var: 'attributes.uuid.value' }, null],
            });
        });

        it('serializes $startsWith as "startsWith": [{var}, val]', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$startsWith,
                        value: 'foo',
                    },
                ],
            };
            expect(exportJsonLogic(group)).toEqual({
                startsWith: [{ var: 'attributes.uuid.value' }, 'foo'],
            });
        });

        it('serializes $endsWith as "endsWith": [{var}, val]', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$endsWith,
                        value: 'bar',
                    },
                ],
            };
            expect(exportJsonLogic(group)).toEqual({
                endsWith: [{ var: 'attributes.uuid.value' }, 'bar'],
            });
        });
    });

    describe('round-trip', () => {
        it('round-trips "Содержит" {in: [val, {var}]} (single rule, no wrapper)', () => {
            const input = { and: [{ in: ['uuid-admin', { var: 'roles' }] }] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');
            const out = JSON.parse(groupToBackend(group, 'jsonlogic'));
            expect(out).toEqual({ in: ['uuid-admin', { var: 'roles' }] });
        });

        it('round-trips "В списке" {in: [{var}, [vals]]}', () => {
            const input = { in: [{ var: 'attributes.uuid.value' }, ['a', 'b']] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');
            const out = JSON.parse(groupToBackend(group, 'jsonlogic'));
            expect(out).toEqual(input);
        });

        it('round-trips "Не в списке" {!in: [{var}, [vals]]}', () => {
            const input = { '!in': [{ var: 'attributes.uuid.value' }, ['a', 'b']] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');
            const out = JSON.parse(groupToBackend(group, 'jsonlogic'));
            expect(out).toEqual(input);
        });

        it('round-trips "Не содержит" {!{in: [val, {var}]}}', () => {
            const input = { '!': { in: ['uuid-admin', { var: 'roles' }] } };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic', fieldsFixture);
            const out = JSON.parse(groupToBackend(group, 'jsonlogic', fieldsFixture));
            expect(out).toEqual(input);
        });

        it('round-trips jsonLogic with mixed eq + in (no fields)', () => {
            const input = {
                and: [
                    { in: ['uuid-admin', { var: 'roles' }] },
                    { '==': [{ var: 'attributes.uuid.value' }, '65'] },
                ],
            };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');
            const out = JSON.parse(groupToBackend(group, 'jsonlogic'));
            expect(out).toEqual(input);
        });

        it('round-trips single jsonLogic rule (no combinator wrapper)', () => {
            const input = { in: ['uuid-admin', { var: 'roles' }] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic', fieldsFixture);
            const out = JSON.parse(groupToBackend(group, 'jsonlogic', fieldsFixture));
            expect(out).toEqual(input);
        });

        it('round-trips $isNull', () => {
            const input = { '==': [{ var: 'attributes.uuid.value' }, null] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');
            const out = JSON.parse(groupToBackend(group, 'jsonlogic'));
            expect(out).toEqual(input);
        });

        it('round-trips $isNotNull', () => {
            const input = { '!=': [{ var: 'attributes.uuid.value' }, null] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');
            const out = JSON.parse(groupToBackend(group, 'jsonlogic'));
            expect(out).toEqual(input);
        });

        it('round-trips $startsWith', () => {
            const input = { startsWith: [{ var: 'attributes.uuid.value' }, 'foo'] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');
            const out = JSON.parse(groupToBackend(group, 'jsonlogic'));
            expect(out).toEqual(input);
        });

        it('round-trips $endsWith', () => {
            const input = { endsWith: [{ var: 'attributes.uuid.value' }, 'bar'] };
            const group = backendToGroup(JSON.stringify(input), 'jsonlogic');
            const out = JSON.parse(groupToBackend(group, 'jsonlogic'));
            expect(out).toEqual(input);
        });
    });
});

describe('conditionConverter - mongoDB', () => {
    describe('parseMongoDB (via backendToGroup)', () => {
        it('parses $and with $eq on a field', () => {
            const input = { $and: [{ ntb: '18' }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');

            expect(group.rules).toHaveLength(1);
            const rule = group.rules[0] as any;
            expect(rule.fieldName).toBe('ntb');
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$eq);
            expect(rule.value).toBe('18');
        });

        it('parses $and with $gt on a field', () => {
            const input = { $and: [{ ndataareaid: { $gt: '66' } }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');

            expect(group.rules).toHaveLength(1);
            const rule = group.rules[0] as any;
            expect(rule.fieldName).toBe('ndataareaid');
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$gt);
            expect(rule.value).toBe('66');
        });

        it('parses short form {field: null} as $isNull', () => {
            const input = { $and: [{ attributes: null }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$isNull);
        });

        it('parses {field: {$eq: null}} as $isNull', () => {
            const input = { $and: [{ attributes: { $eq: null } }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$isNull);
        });

        it('parses {field: {$ne: null}} as $isNotNull', () => {
            const input = { $and: [{ attributes: { $ne: null } }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$isNotNull);
        });

        it('parses $in as $in', () => {
            const input = { $and: [{ roles: { $in: ['uuid-admin'] } }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb', fieldsFixture);

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$in);
        });

        it('parses $nin as $notIn', () => {
            const input = { $and: [{ roles: { $nin: ['uuid-admin'] } }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb', fieldsFixture);

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$notIn);
        });

        it('parses $regex "^foo" as $startsWith', () => {
            const input = { $and: [{ 'attributes.uuid.value': { $regex: '^foo' } }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$startsWith);
            expect(rule.value).toBe('foo');
        });

        it('parses $regex "bar$" as $endsWith', () => {
            const input = { $and: [{ 'attributes.uuid.value': { $regex: 'bar$' } }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');

            const rule = group.rules[0] as any;
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$endsWith);
            expect(rule.value).toBe('bar');
        });

        it('parses {field: {$gte, $lte}} as $between [a, b]', () => {
            const input = { $and: [{ dtreport: { $gte: '23', $lte: '32' } }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');

            expect(group.rules).toHaveLength(1);
            const rule = group.rules[0] as any;
            expect(rule.fieldName).toBe('dtreport');
            expect(rule.operator).toBe(QueryBuilderRuleCommonOperationEnum.$between);
            expect(rule.value).toEqual(['23', '32']);
        });
    });

    describe('exportMongoDB', () => {
        it('uses short form for $eq without combinator wrapper for single rule', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'ntb',
                        operator: QueryBuilderRuleCommonOperationEnum.$eq,
                        value: '18',
                    },
                ],
            };
            expect(exportMongoDB(group)).toEqual({ ntb: '18' });
        });

        it('uses $gt operator form for non-$eq', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'ntb',
                        operator: QueryBuilderRuleCommonOperationEnum.$eq,
                        value: '18',
                    },
                    {
                        fieldName: 'ndataareaid',
                        operator: QueryBuilderRuleCommonOperationEnum.$gt,
                        value: '66',
                    },
                ],
            };
            expect(exportMongoDB(group)).toEqual({
                $and: [{ ntb: '18' }, { ndataareaid: { $gt: '66' } }],
            });
        });

        it('exports $in as {field: {$in: [...]}}', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$in,
                        value: ['a', 'b'],
                    },
                ],
            };
            expect(exportMongoDB(group)).toEqual({ 'attributes.uuid.value': { $in: ['a', 'b'] } });
        });

        it('exports $notIn as {field: {$nin: [...]}}', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$notIn,
                        value: ['a', 'b'],
                    },
                ],
            };
            expect(exportMongoDB(group)).toEqual({ 'attributes.uuid.value': { $nin: ['a', 'b'] } });
        });

        it('exports $isNull as {field: null} (short form)', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$isNull,
                        value: null,
                    },
                ],
            };
            expect(exportMongoDB(group)).toEqual({ 'attributes.uuid.value': null });
        });

        it('exports $isNotNull as {field: {$ne: null}}', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$isNotNull,
                        value: null,
                    },
                ],
            };
            expect(exportMongoDB(group)).toEqual({ 'attributes.uuid.value': { $ne: null } });
        });

        it('exports $startsWith as {field: {$regex: "^val"}}', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$startsWith,
                        value: 'foo',
                    },
                ],
            };
            expect(exportMongoDB(group)).toEqual({ 'attributes.uuid.value': { $regex: '^foo' } });
        });

        it('exports $endsWith as {field: {$regex: "val$"}}', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$endsWith,
                        value: 'bar',
                    },
                ],
            };
            expect(exportMongoDB(group)).toEqual({ 'attributes.uuid.value': { $regex: 'bar$' } });
        });

        it('exports $like as {field: {$regex: val}}', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'attributes.uuid.value',
                        operator: QueryBuilderRuleCommonOperationEnum.$like,
                        value: 'word',
                    },
                ],
            };
            expect(exportMongoDB(group)).toEqual({ 'attributes.uuid.value': { $regex: 'word' } });
        });

        it('exports $between [a, b] as {field: {$gte: a, $lte: b}}', () => {
            const group: Group = {
                combinator: QueryBuilderGroupCombinatorEnum.$and,
                rules: [
                    {
                        fieldName: 'dtreport',
                        operator: QueryBuilderRuleCommonOperationEnum.$between,
                        value: ['23', '32'],
                    },
                ],
            };
            expect(exportMongoDB(group)).toEqual({ dtreport: { $gte: '23', $lte: '32' } });
        });
    });

    describe('round-trip', () => {
        it('round-trips mongoDB eq + gt', () => {
            const input = { $and: [{ ntb: '18' }, { ndataareaid: { $gt: '66' } }] };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');
            const out = JSON.parse(groupToBackend(group, 'mongodb'));
            expect(out).toEqual(input);
        });

        it('round-trips single mongoDB rule without combinator wrapper', () => {
            const input = { ntb: '18' };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');
            const out = JSON.parse(groupToBackend(group, 'mongodb'));
            expect(out).toEqual(input);
        });

        it('round-trips mongoDB $in', () => {
            const input = { 'attributes.uuid.value': { $in: ['a', 'b'] } };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');
            const out = JSON.parse(groupToBackend(group, 'mongodb'));
            expect(out).toEqual(input);
        });

        it('round-trips mongoDB $nin', () => {
            const input = { 'attributes.uuid.value': { $nin: ['a', 'b'] } };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');
            const out = JSON.parse(groupToBackend(group, 'mongodb'));
            expect(out).toEqual(input);
        });

        it('round-trips mongoDB $isNull', () => {
            const input = { 'attributes.uuid.value': null };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');
            const out = JSON.parse(groupToBackend(group, 'mongodb'));
            expect(out).toEqual(input);
        });

        it('round-trips mongoDB $isNotNull', () => {
            const input = { 'attributes.uuid.value': { $ne: null } };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');
            const out = JSON.parse(groupToBackend(group, 'mongodb'));
            expect(out).toEqual(input);
        });

        it('round-trips mongoDB $startsWith ($regex "^val")', () => {
            const input = { 'attributes.uuid.value': { $regex: '^foo' } };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');
            const out = JSON.parse(groupToBackend(group, 'mongodb'));
            expect(out).toEqual(input);
        });

        it('round-trips mongoDB $endsWith ($regex "val$")', () => {
            const input = { 'attributes.uuid.value': { $regex: 'bar$' } };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');
            const out = JSON.parse(groupToBackend(group, 'mongodb'));
            expect(out).toEqual(input);
        });

        it('round-trips mongoDB $between ({$gte, $lte})', () => {
            const input = { dtreport: { $gte: '23', $lte: '32' } };
            const group = backendToGroup(JSON.stringify(input), 'mongodb');
            const out = JSON.parse(groupToBackend(group, 'mongodb'));
            expect(out).toEqual(input);
        });
    });
});
