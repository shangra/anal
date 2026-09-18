import { Control, Path, UseControllerProps } from 'react-hook-form';

export type SelectFormProps<T extends {}> = {
    control: Control<T>;
    name: UseControllerProps<T, Path<T>>['name'];
    options: { label: string; value: string }[];
    disabled?: boolean;
};
