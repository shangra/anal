/** Допустимые операторы * */
type Operator = '$eq' | '$ne';

type Condition = {
    [K in Operator]?: Record<string, string>;
};

type AndGroup = { $and: Condition[] };
type OrGroup = { $or: Condition[] };

export type FilterObject = AndGroup & OrGroup;

export interface Restrictions {
    rules: FilterObject;
    defaultValue?: any;
    mode?: 'hide' | 'disable';
}
