import React from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const OpenFullWindowIcon: React.FC<IconComponentProps> = (props) => (
    <Icon {...props}>
        <defs>
            <clipPath id='clip38_10317'>
                <rect
                    id='.window-expand'
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
        <g clipPath='url(#clip38_10317)'>
            <path
                id='Vector 151'
                d='M16 2C16 1.26 15.4 0.66 14.66 0.66L1.33 0.66C0.59 0.66 0 1.26 0 2L0 14C0 14.73 0.59 15.33 1.33 15.33L14.66 15.33C15.4 15.33 16 14.73 16 14L16 2ZM1.66 4.66L1.66 13.66L14.33 13.66L14.33 4.66L1.66 4.66Z'
                fill='#7C89AB'
                fillOpacity='0.300000'
                fillRule='evenodd'
            />
        </g>
    </Icon>
);
