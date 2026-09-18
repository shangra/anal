import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TUAttributesAttributes = TDBAttributes & {
    name: string;
    type: string;
};

export type TUAttributesCreationAttributes = TDBCreationAttributes &
    TUAttributesAttributes;
