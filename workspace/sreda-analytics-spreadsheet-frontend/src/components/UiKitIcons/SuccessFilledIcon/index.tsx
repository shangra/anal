import { FC } from 'react';

import { Icon, IconComponentProps } from '../../UIKit/Icon';

export const SuccessFilledIcon: FC<IconComponentProps> = (props) => (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <Icon {...props} viewBox="0 0 32 32" size="large">
        <defs>
            <linearGradient
                x1="32.000000"
                y1="32.000000"
                x2="32.000000"
                y2="0.000000"
                id="paint_linear_6605_17660_0"
                gradientUnits="userSpaceOnUse"
            >
                <stop stopColor="#4DCA94" />
                <stop offset="1.000000" stopColor="#4DCA94" stopOpacity="0.000000" />
            </linearGradient>
        </defs>
        <path
            id="Oval Copy 2"
            d="M16 32C24.83 32 32 24.83 32 16C32 7.16 24.83 0 16 0C7.16 0 0 7.16 0 16C0 24.83 7.16 32 16 32Z"
            fill="#3BC476"
            fillOpacity="1.000000"
            fillRule="evenodd"
        />
        <path
            id="Oval Copy 2"
            d="M16 32C24.83 32 32 24.83 32 16C32 7.16 24.83 0 16 0C7.16 0 0 7.16 0 16C0 24.83 7.16 32 16 32Z"
            fill="url(#paint_linear_6605_17660_0)"
            fillOpacity="0"
            fillRule="evenodd"
        />
        <g opacity="0.750000">
            <path
                id="Fill 1"
                d="M10.13 16.95C10.04 16.86 10 16.72 10 16.63C10 16.54 10.04 16.4 10.13 16.31L10.78 15.68C10.96 15.5 11.24 15.5 11.43 15.68L11.47 15.73L14.01 18.38C14.1 18.47 14.24 18.47 14.33 18.38L20.52 12.13L20.56 12.13C20.75 11.95 21.03 11.95 21.21 12.13L21.86 12.76C22.04 12.94 22.04 13.21 21.86 13.39L14.47 20.86C14.38 20.95 14.29 21 14.15 21C14.01 21 13.92 20.95 13.83 20.86L10.22 17.08L10.13 16.95Z"
                fill="#FFFFFF"
                fillOpacity="1.000000"
                fillRule="evenodd"
            />
        </g>
    </Icon>
);
//  style="mix-blend-mode:normal"
