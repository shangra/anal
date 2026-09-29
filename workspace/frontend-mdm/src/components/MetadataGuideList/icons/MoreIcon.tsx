import React from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const MoreIcon: React.FC<IconComponentProps> = (props) => (
    <Icon {...props} width={44} height={44}>
        <rect
            id='_masterIcon'
            width='16.000000'
            height='16.000000'
            fill='#FFFFFF'
            fillOpacity='0'
        />
        <path
            id='path'
            d='M8 4C9.1 4 10 3.09 10 2C10 0.9 9.1 0 8 0C6.89 0 6 0.9 6 2C6 3.09 6.89 4 8 4ZM8 6C6.89 6 6 6.9 6 8C6 9.09 6.89 10 8 10C9.1 10 10 9.09 10 8C10 6.9 9.1 6 8 6ZM6 14C6 12.9 6.89 12 8 12C9.1 12 10 12.9 10 14C10 15.1 9.1 16 8 16C6.89 16 6 15.1 6 14Z'
            fill='#7C89AB'
            fillOpacity='1.000000'
            fillRule='evenodd'
        />
    </Icon>
);
