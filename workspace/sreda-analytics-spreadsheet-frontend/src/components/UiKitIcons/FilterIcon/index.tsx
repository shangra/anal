import { FC } from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const FilterIcon: FC<Partial<IconComponentProps>> = (props) => (
    <Icon viewBox="0 0 16 16" {...props}>
        <path
            d="M15.93 0.44C15.8 0.14 15.58 0 15.26 0L0.73 0C0.41 0 0.19 0.14 0.06 0.44C-0.07 0.75 -0.01 1.01 0.22 1.23L5.82 6.84L5.82 12.36C5.82 12.56 5.89 12.73 6.03 12.87L8.94 15.78C9.07 15.92 9.24 16 9.45 16C9.54 16 9.63 15.98 9.73 15.94C10.03 15.81 10.17 15.59 10.17 15.27L10.17 6.84L15.77 1.23C16 1.01 16.06 0.75 15.93 0.44Z"
            fillRule="nonzero"
        />
    </Icon>
);
