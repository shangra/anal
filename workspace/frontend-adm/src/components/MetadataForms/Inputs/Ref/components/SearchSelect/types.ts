import React from 'react';

export type DefaultSelectRequiredPropsType<T> = {
    name: string;
    value: T;
    onChange: (newValue: T) => void;
};

export type DefaultSelectOptionalPropsType = React.InputHTMLAttributes<HTMLInputElement> & {
    width?: number;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    fullWidth?: boolean;
};
