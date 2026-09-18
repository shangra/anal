import { FC } from 'react';

import { Icon, IconComponentProps } from '../../UIKit/Icon';

export const ClockIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 24 24" style={{ ...props.style, width: '24', height: '24' }}>
        <g opacity="0.650000">
            <path
                id="secondary "
                d="M12 20C16.41 20 20 16.41 20 12C20 7.58 16.41 4 12 4C7.58 4 4 7.58 4 12C4 16.41 7.58 20 12 20ZM12 22C17.52 22 22 17.52 22 12C22 6.47 17.52 2 12 2C6.47 2 2 6.47 2 12C2 17.52 6.47 22 12 22Z"
                fill="#7C89AB"
                fillOpacity="0.800000"
                fillRule="evenodd"
            />
        </g>
        <path
            id="primary"
            d="M11.5 6L12.5 6C12.7761 6 13 6.22388 13 6.5L13 12L16.4163 12C16.6924 12 16.9163 12.2239 16.9163 12.5L16.9163 13.5C16.9163 13.7761 16.6924 14 16.4163 14L12 14C11.4478 14 11 13.5522 11 13L11 12L11 12L11 6.5C11 6.22388 11.2239 6 11.5 6Z"
            clipRule="evenodd"
            fill="#7C89AB"
            fillOpacity="0.800000"
            fillRule="evenodd"
        />
    </Icon>
);
