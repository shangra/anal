import { FC } from 'react';

import { Icon, IconComponentProps } from '../../UIKit/Icon';

export const DownIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 24 24">
        <defs>
            <clipPath id="clip15_14">
                <rect id="arrow24down" width="24.000000" height="24.000000" fillOpacity="0" />
            </clipPath>
        </defs>
        <g clipPath="url(#clip15_14)">
            <path
                id="arrow"
                d="M7.25 9.25C7.59 8.91 8.15 8.91 8.49 9.25L11.64 12.41L14.8 9.25C15.14 8.91 15.69 8.91 16.04 9.25C16.38 9.59 16.38 10.15 16.04 10.49L12.26 14.26C11.92 14.6 11.37 14.6 11.02 14.26L7.25 10.49C6.91 10.15 6.91 9.59 7.25 9.25Z"
                fillOpacity="1.000000"
                fillRule="evenodd"
            />
        </g>
    </Icon>
);
