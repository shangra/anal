import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TUAttributeAttributes = TDBAttributes & {
    name: string;
    type: string;
};

export type TUAttributeCreationAttributes = TDBCreationAttributes &
    TUAttributeAttributes;
