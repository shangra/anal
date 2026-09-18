import React from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const BottomSVG: React.FC<IconComponentProps> = (props) => (
    <Icon {...props}>
        <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            fill='currentColor'
        >
            <path d='M14,1 a1,1 0 0 1 1,1 v10 a1,1 0 0 1 -1,1 H2 a1,1 0 0 1 -1,-1 V2 a1,1 0 0 1 1,-1 zM2,0 a2,2 0 0 0 -2,2 v10 a2,2 0 0 0 2,2 h12 a2,2 0 0 0 2,-2 V2 a2,2 0 0 0 -2,-2 z' />
            <path
                d='M6.083700403571129,6.083700463175774 a1,1 0 0 1 1,-1 h2 a1,1 0 0 1 1,1 v8 a1,1 0 0 1 -1,1 H7.083700403571129 a1,1 0 0 1 -1,-1 z'
                transform='rotate(90 8,10.2)'
            />
        </svg>
    </Icon>
);
