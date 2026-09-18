import { useController } from 'react-hook-form';
import { Input } from 'ui-kit';

import { ControlFormProps } from './types';

export const ControlForm = <T extends object>(props: ControlFormProps<T>) => {
    const { control, name, placeholder, className, readOnly = false, disabled = false, inputRef, onBlur, onFocus } = props;

    const {
        field: { value, onChange },
    } = useController({
        control,
        name,
    });

    return (
        <Input
            ref={inputRef}
            className={className}
            type="text"
            name={name}
            readOnly={readOnly}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={placeholder}
            disabled={disabled}
            value={value || ''}
            onChange={onChange}
        />
    );
};
