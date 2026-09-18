import { useController } from 'react-hook-form';
import { Select } from 'ui-kit';

import { SelectFormProps } from './types';

export const SelectForm = <T extends object>(props: SelectFormProps<T>) => {
    const { control, name, disabled = false, options = [] } = props;

    const {
        field: { value, onChange },
    } = useController({
        control,
        name,
    });

    return <Select disabled={disabled} value={value} onChange={onChange} options={options} resettable={false} />;
};
