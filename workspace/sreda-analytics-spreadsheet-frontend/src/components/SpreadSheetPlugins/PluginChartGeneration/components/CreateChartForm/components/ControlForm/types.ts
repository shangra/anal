import { FocusEventHandler } from 'react';
import { Control, Path, UseControllerProps } from 'react-hook-form';

export type ControlFormProps<T extends {}> = {
    control: Control<T>;
    name: UseControllerProps<T, Path<T>>['name'];
    disabled?: boolean;
    className?: string;
    readOnly?: boolean;
    placeholder?: string;
    inputRef?: any;
    onFocus?: FocusEventHandler<HTMLInputElement>;
    onBlur?: FocusEventHandler<HTMLInputElement>;
};
