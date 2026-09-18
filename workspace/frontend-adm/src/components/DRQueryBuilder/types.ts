import type { DataType } from 'components/MetadataForms/Inputs/Composite/types';

export enum QueryBuilderRuleCommonOperationEnum {
    $eq = '$eq',
    $ne = '$ne',
    $gt = '$gt',
    $gte = '$gte',
    $lt = '$lt',
    $lte = '$lte',
    $like = '$like',
    $notLike = '$notLike',
    $between = '$between',
    $in = '$in',
    $notIn = '$notIn',
    $startsWith = '$startsWith',
    $endsWith = '$endsWith',
    $isNull = '$isNull',
    $isNotNull = '$isNotNull',
}

export enum QueryBuilderGroupCombinatorEnum {
    $or = '$or',
    $and = '$and',
}

export type Group = {
    combinator: QueryBuilderGroupCombinatorEnum;
    rules: (Rule | Group)[];
};

export type UUIDType = string;

export type MetaRefRuleValue = { label: string; value: string };

export type RuleValueType = string | MetaRefRuleValue | string[] | number | boolean | null;

export type Rule = { fieldName: string; operator: QueryBuilderRuleCommonOperationEnum | '$link'; value: RuleValueType };

export type MutationFn = (
    operationType: 'add' | 'set' | 'delete',
    key: string,
    value: any,
    options?: {
        setKey?: boolean;
    },
) => void;

export type MetaField =
    | InputMetaField
    | RefMetaField
    | BooleanMetaField
    | IntegerMetaField
    | TimestampMetaField
    | UuidMetaField
    | CompositeMetaField
    | FloatMetaField
    | DateTimeMetaField
    | StringMetaField
    | DateMetaField
    | TextMetaField
    | MetaRefMetaField;
    
export type BaseMetaField = {
    id?: string;
    label: string;
    value: string;
    type?: string;
    tabularPart?: boolean;
    valueEditorType?: string;
    inputType?: string;
    operators?: (QueryBuilderRuleCommonOperationEnum | string)[];
    allowedOperators?: (QueryBuilderRuleCommonOperationEnum | string)[];
    values?: { name: string; label: string; value?: string }[];
    options?: { label: string; value: string }[];
};

export type InputMetaField = BaseMetaField & {
    type: 'input';
};

export type BooleanMetaField = BaseMetaField & {
    type: 'boolean';
};

export type IntegerMetaField = BaseMetaField & {
    type: 'integer';
};

export type TimestampMetaField = BaseMetaField & {
    type: 'timestamp';
};

export type UuidMetaField = BaseMetaField & {
    type: 'uuid';
};

export type CompositeMetaField = BaseMetaField & {
    type: 'composite';
    dataTypes: DataType[];
};

export type FloatMetaField = BaseMetaField & {
    type: 'float';
};

export type DateTimeMetaField = BaseMetaField & {
    type: 'datetime';
};

export type StringMetaField = BaseMetaField & {
    type: 'string';
};

export type RefMetaField = BaseMetaField & {
    type: 'ref';
    metaRef: { link: string; value: string };
};

export type TextMetaField = BaseMetaField & {
    type: 'text';
};

export type DateMetaField = BaseMetaField & {
    type: 'date';
};

export type QuerySelectorFieldType = Omit<BaseMetaField, 'label' | 'value'>;

export type FieldType = MetaField & {
    description: string;
    field: string;
};

export type FieldRefType = FieldType & {
    ref: { link: string; value: string };
};

export type MetaRefMetaField = BaseMetaField & {
    type: 'metaRef';
    metaRef: { link: string; value: string };
};

export type TabularPart = {
    id: UUIDType;
    name: string;
    description: string;
    table: string;
    info: {
        Fields: Record<string, FieldType>;
        FieldsGUID: Record<string, FieldType>;
        Refs: Record<string, FieldRefType>;
    };
};

export type QueryType = {
    fieldMeta: MetaField;
    fieldQuery: Rule | Group;
};

export const isRule = (entity: Group | Rule): entity is Rule => (entity as Rule).operator !== undefined;

export const isGroup = (entity: Group | Rule): entity is Group => (entity as Group).combinator !== undefined;

export type JsonGroup = { [key in QueryBuilderGroupCombinatorEnum]?: (JsonRule | JsonGroup)[] };
export type JsonRule = {
    [key in QueryBuilderRuleCommonOperationEnum]?: { [operator in QueryBuilderRuleCommonOperationEnum]?: string };
};
export type JsonType = { [rootCombinator in QueryBuilderGroupCombinatorEnum]?: (JsonRule | JsonGroup)[] };

export const jsonIsRule = (entity: JsonRule | JsonGroup): entity is JsonRule =>
    !Object.keys(QueryBuilderGroupCombinatorEnum).some((key) => key === Object.keys(entity)[0]);

export const jsonIsGroup = (entity: JsonRule | JsonGroup): entity is JsonGroup =>
    Object.keys(QueryBuilderGroupCombinatorEnum).some((key) => key === Object.keys(entity)[0]);

export type RefField = {
    fieldName: string;
    ref: { link: string; value: string };
};
