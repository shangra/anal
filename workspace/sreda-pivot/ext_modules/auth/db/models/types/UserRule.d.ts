import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TUserRuleAttributes = Omit<TDBAttributes, 'markdel'> & {
    user_id: string;
    rule_id: string;
};

export type TUserRuleCreationAttributes = Omit<
    TDBCreationAttributes,
    'markdel'
> &
    TUserRuleAttributes;
