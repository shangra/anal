import type { DateValue } from "ui-kit";

export type DataType = {
    label: string;
    value: DATA_TYPES | null;
    type?: number;
    typeName?: DATA_TYPES;
    checked?: boolean;
    _depth?: number;
    _id?: string;
    disabled?: boolean;
    link?: string;
    _focused?: boolean;
    _parent?: string;
};

export enum DATA_TYPES {
    string = "string",
    float = "float",
    boolean = "boolean",
    datetime = "datetime",
    integer = "integer",
    ref = "ref",
}
export interface ICompositeValue {
    type: string | null
    value: string | null | number | boolean | DateValue
    link: string | null
    label: string | null
}
export interface ICompositeValue {
    type: string | null;
    value: string | null | number | boolean | DateValue;
    link: string | null;
    label: string | null;
}
