import React, { RefObject } from 'react';

export type DefaultInputRequiredPropsType<T> = {
    name: string;
    value: T;
    onChange: (newValue: T) => void;
};

export type DefaultInputOptionalPropsType<HTMLElementAttributeType = React.InputHTMLAttributes<HTMLInputElement>> = Omit<
    HTMLElementAttributeType,
    keyof DefaultInputRequiredPropsType<any> | 'size'
> & {
    readonly?: boolean;
    inputRef?: RefObject<any>;
};
