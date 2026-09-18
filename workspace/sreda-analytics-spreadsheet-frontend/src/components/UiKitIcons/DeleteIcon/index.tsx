import { FC } from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const DeleteIcon: FC<Partial<IconComponentProps>> = (props) => (
    <Icon viewBox="0 0 16 16" {...props}>
        <g opacity="0.650000">
            <path
                d="M2.42 14.11C2.42 15.15 3.24 16 4.24 16L11.51 16C12.51 16 13.33 15.15 13.33 14.11L13.33 4.36L2.42 4.36L2.42 14.11Z"
                fill="#F4515D"
                fillOpacity="1.000000"
                fillRule="evenodd"
            />
        </g>
        <path
            d="M11.15 0.72L10.21 0L5.54 0L4.6 0.72L1.33 0.72L1.33 2.9L14.42 2.9L14.42 0.72L11.15 0.72Z"
            fill="#F4515D"
            fillOpacity="1.000000"
            fillRule="evenodd"
        />
    </Icon>
);
