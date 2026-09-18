import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TRoleRuleAttributes = Omit<TDBAttributes, 'markdel'> & {
    role_id: string;
    rule_id: string;
};

export type TRoleRuleCreationAttributes = Omit<
    TDBCreationAttributes,
    'markdel'
> &
    TRoleRuleAttributes;
