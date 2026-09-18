import React from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const CloseFullWindowIcon: React.FC<IconComponentProps> = (props) => (
    <Icon {...props}>
        <defs>
            <clipPath id='clip38_10318'>
                <rect
                    id='.window-exit-full'
                    width='16.000000'
                    height='16.000000'
                    fill='white'
                    fillOpacity='0'
                />
            </clipPath>
        </defs>
        <rect
            id='_masterIcon'
            width='16.000000'
            height='16.000000'
            fill='#FFFFFF'
            fillOpacity='0'
        />
        <g clipPath='url(#clip38_10318)'>
            <path
                id='Vector 152'
                d='M16 2C16 1.26 15.4 0.66 14.66 0.66L10 0.66L10 2L14.33 2L14.33 6.66L16 6.66L16 2ZM6.66 0.66L2 0.66C1.26 0.66 0.66 1.26 0.66 2L0.66 6.66L2 6.66L2 2L6.66 2L6.66 0.66ZM14.33 9.33L16 9.33L16 14C16 14.73 15.4 15.33 14.66 15.33L10 15.33L10 13.66L14.33 13.66L14.33 9.33ZM2 9.33L0.66 9.33L0.66 14C0.66 14.73 1.26 15.33 2 15.33L6.66 15.33L6.66 13.66L2 13.66L2 9.33Z'
                fill='#7C89AB'
                fillOpacity='0.300000'
                fillRule='evenodd'
            />
        </g>
    </Icon>
);
