import { FC } from 'react';

import { Icon, IconComponentProps } from '../../UIKit/Icon';

export const CalendarIcon: FC<IconComponentProps> = (props) => (
    <Icon
        {...props}
        viewBox="0 0 24 24"
        style={{
            ...props.style,
            width: '24',
            height: '24',
        }}
    >
        <path
            d="M6 3C6 2.44 6.44 2 7 2L9 2C9.55 2 10 2.44 10 3L10 4L14 4L14 3C14 2.44 14.44 2 15 2L17 2C17.55 2 18 2.44 18 3L18 4L19 4C20.1 4 21 4.89 21 6L21 7L3 7L3.01 6C3.01 4.89 3.89 4 5 4L6 4L6 3Z"
            fill="#7C89AB"
            fillOpacity="0.800000"
            fillRule="nonzero"
        />

        <g opacity="0.650000">
            <path
                d="M21 9L3 9L3 19C3 20.1 3.89 21 5 21L19 21C20.1 21 21 20.1 21 19L21 9ZM19 11L5 11L5 19L19 19L19 11Z"
                fill="#7C89AB"
                fillOpacity="0.800000"
                fillRule="evenodd"
            />
        </g>
    </Icon>
);
