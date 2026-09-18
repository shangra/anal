import { FC } from 'react';
import { Icon } from '../../UIKit/Icon';
import { IconComponentProps } from '../../UIKit/Icon';

export const UpIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 24 24">
        <defs>
            <clipPath id="clip15_16">
                <rect id="arrow24up" width="24.000000" height="24.000000" transform="matrix(1 0 0 -1 0 24)" fillOpacity="0" />
            </clipPath>
        </defs>
        <g clipPath="url(#clip15_16)">
            <path
                id="arrow"
                d="M7.25 14.74C7.59 15.08 8.15 15.08 8.49 14.74L11.64 11.58L14.8 14.74C15.14 15.08 15.69 15.08 16.04 14.74C16.38 14.4 16.38 13.84 16.04 13.5L12.26 9.73C11.92 9.39 11.37 9.39 11.02 9.73L7.25 13.5C6.91 13.84 6.91 14.4 7.25 14.74Z"
                fillOpacity="1.000000"
                fillRule="evenodd"
            />
        </g>
    </Icon>
);
