import React from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const InfoIcon: React.FC<IconComponentProps> = (props) => (
    <Icon {...props} width={44} height={44}>
        <rect
            id='_masterIcon'
            width='16.000000'
            height='16.000000'
            fill='#FFFFFF'
            fillOpacity='0'
        />
        <g opacity='0.650000'>
            <path
                id='path'
                d='M0 8C0 3.58 3.58 0 8 0C12.41 0 16 3.58 16 8C16 12.41 12.41 16 8 16C3.58 16 0 12.41 0 8ZM1.45 8C1.45 11.6 4.39 14.54 8 14.54C11.6 14.54 14.54 11.6 14.54 8C14.54 4.39 11.6 1.45 8 1.45C4.39 1.45 1.45 4.39 1.45 8Z'
                fill='#7C89AB'
                fillOpacity='1.000000'
                fillRule='evenodd'
            />
        </g>
        <path
            id='path'
            d='M8.83 4.33C8.83 4.88 8.38 5.33 7.83 5.33C7.28 5.33 6.83 4.88 6.83 4.33C6.83 3.78 7.28 3.33 7.83 3.33C8.38 3.33 8.83 3.78 8.83 4.33ZM7.33 6.66C6.96 6.66 6.66 6.96 6.66 7.33C6.66 7.7 6.96 8 7.33 8L7.33 12C7.33 12.36 7.63 12.66 8 12.66L8.66 12.66C9.03 12.66 9.33 12.36 9.33 12C9.33 11.63 9.03 11.33 8.66 11.33L8.66 7.33C8.66 6.96 8.36 6.66 8 6.66L7.33 6.66Z'
            fill='#7C89AB'
            fillOpacity='0.600000'
            fillRule='evenodd'
        />
    </Icon>
);
