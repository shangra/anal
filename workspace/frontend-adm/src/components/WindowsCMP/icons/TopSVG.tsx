import React from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const TopSVG: React.FC<IconComponentProps> = (props) => (
    <Icon {...props}>
        <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            fill='currentColor'
        >
            <path d='M14,1 a1,1 0 0 1 1,1 v10 a1,1 0 0 1 -1,1 H2 a1,1 0 0 1 -1,-1 V2 a1,1 0 0 1 1,-1 zM2,0 a2,2 0 0 0 -2,2 v10 a2,2 0 0 0 2,2 h12 a2,2 0 0 0 2,-2 V2 a2,2 0 0 0 -2,-2 z' />
            <path
                d='M5.995594680309296,0.004405304789543124 a1,1 0 0 1 1,-1 h2 a1,1 0 0 1 1,1 v8 a1,1 0 0 1 -1,1 H6.995594680309296 a1,1 0 0 1 -1,-1 z'
                transform='rotate(90 8,4) '
            />
        </svg>
    </Icon>
);
