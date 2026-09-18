import React from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const HideWindowIcon: React.FC<IconComponentProps> = (props) => (
    <Icon {...props} width={44} height={44}>
        <defs>
            <clipPath id='clip38_10352'>
                <rect
                    id='.window-collapse'
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
        <g clipPath='url(#clip38_10352)'>
            <path
                id='Vector 152'
                d='M1.33 12.66L14.66 12.66C15.03 12.66 15.33 12.96 15.33 13.33L15.33 14.66C15.33 15.03 15.03 15.33 14.66 15.33L1.33 15.33C0.96 15.33 0.66 15.03 0.66 14.66L0.66 13.33C0.66 12.96 0.96 12.66 1.33 12.66Z'
                fill='#7C89AB'
                fillOpacity='0.300000'
                fillRule='evenodd'
            />
        </g>
    </Icon>
);
