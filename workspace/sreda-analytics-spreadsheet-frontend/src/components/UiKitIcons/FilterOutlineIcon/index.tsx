import { FC } from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const FilterOutlineIcon: FC<Partial<IconComponentProps>> = (props) => (
    <Icon viewBox="0 0 16 16" {...props}>
        <path
            d="M15.93 0.44C16.06 0.75 16 1.01 15.77 1.23L10.17 6.84L10.17 15.27C10.17 15.59 10.03 15.81 9.73 15.94C9.63 15.98 9.54 16 9.45 16C9.24 16 9.07 15.92 8.94 15.78L6.03 12.87C5.89 12.73 5.82 12.56 5.82 12.36L5.82 6.84L0.22 1.23C-0.01 1.01 -0.07 0.75 0.06 0.44C0.19 0.14 0.41 0 0.73 0L15.26 0C15.58 0 15.8 0.14 15.93 0.44ZM8.84 6.28L8.84 13.8L7.15 12.1L7.15 6.28L2.2 1.33L13.79 1.33L8.84 6.28Z"
            fillRule="evenodd"
        />
    </Icon>
);
