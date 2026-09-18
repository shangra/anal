import React from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const StickWindowIcon: React.FC<IconComponentProps> = (props) => (
    <Icon {...props}>
        <defs>
            <clipPath id='clip38_6405'>
                <rect
                    id='.window-setting'
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
        <g clipPath='url(#clip38_6405)'>
            <path
                id='Vector 154'
                d='M14 0.66L2 0.66C0.89 0.66 0 1.56 0 2.66L0 13.33C0 14.43 0.89 15.33 2 15.33L14 15.33C15.1 15.33 16 14.43 16 13.33L16 2.66C16 1.56 15.1 0.66 14 0.66ZM8 1.33L5.69 3.83L10.3 3.83L8 1.33ZM0.66 8L3.16 10.3L3.16 5.69L0.66 8ZM12.83 10.3L15.33 8L12.83 5.69L12.83 10.3ZM10.3 12.16L8 14.66L5.69 12.16L10.3 12.16Z'
                fill='#7C89AB'
                fillOpacity='0.300000'
                fillRule='evenodd'
            />
        </g>
    </Icon>
);
