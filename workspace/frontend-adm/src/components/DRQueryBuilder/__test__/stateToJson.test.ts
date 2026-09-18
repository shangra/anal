import { stateToJson } from 'components/DRQueryBuilder/converters/stateToJson';
import {
    QueryBuilderGroupCombinatorEnum,
    QueryBuilderRuleCommonOperationEnum,
    type Group,
} from 'components/DRQueryBuilder/types';

describe('stateToJson', () => {
    it('serializes a rule with $in operator keeping array value through field rename', () => {
        const group: Group = {
            combinator: QueryBuilderGroupCombinatorEnum.$and,
            rules: [
                {
                    fieldName: 'dtreport_date',
                    operator: QueryBuilderRuleCommonOperationEnum.$in,
                    value: ['22', '33'],
                },
            ],
        };

        expect(stateToJson(group)).toEqual({
            $and: [{ dtreport_date: { $in: ['22', '33'] } }],
        });
    });

    it('serializes a rule with $notIn operator keeping array value through field rename', () => {
        const group: Group = {
            combinator: QueryBuilderGroupCombinatorEnum.$and,
            rules: [
                {
                    fieldName: 'dtreport_date',
                    operator: QueryBuilderRuleCommonOperationEnum.$notIn,
                    value: ['22', '33'],
                },
            ],
        };

        expect(stateToJson(group)).toEqual({
            $and: [{ dtreport_date: { $notIn: ['22', '33'] } }],
        });
    });
});
