import { FC } from 'react';

import { Icon, IconComponentProps } from '../../UIKit/Icon';

export const AddIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 24 24">
        <defs>
            <clipPath id="clip8_2">
                <rect id="add" width="24.000000" height="24.000000" fillOpacity="0" />
            </clipPath>
        </defs>
        <g clipPath="url(#clip8_2)">
            <path
                id="Path"
                d="M3 12C3 16.96 7.02 21 12 21C16.96 21 21 16.96 21 12C21 7.01 16.96 3 12 3C7.02 3 3 7.01 3 12ZM19 12C19 15.86 15.86 19 12 19C8.13 19 5 15.86 5 12C5 8.13 8.13 5 12 5C15.86 5 19 8.13 19 12ZM13 11L13 7L11 7L11 11L7 11L7 13L11 13L11 17L13 17L13 13L17 13L17 11L13 11Z"
                fillOpacity="1.000000"
                fillRule="evenodd"
            />
        </g>
    </Icon>
);
