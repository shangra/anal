import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TGroupUserAttributes = Omit<TDBAttributes, 'markdel'> & {
    group_id: string;
    user_id: string;
};

export type TGroupUserCreationAttributes = Omit<
    TDBCreationAttributes,
    'markdel'
> &
    TGroupUserAttributes;
