import { FC } from 'react';

import { Icon, IconComponentProps } from '../../UIKit/Icon';

export const ErrorFilledIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 32 32" size="large">
        <defs>
            <linearGradient
                x1="-3.822098"
                y1="36.490437"
                x2="37.158775"
                y2="36.490437"
                id="paint_linear_6605_17650_0"
                gradientUnits="userSpaceOnUse"
            >
                <stop stopColor="#FF6357" />
                <stop offset="1.000000" stopColor="#FF6357" stopOpacity="0.000000" />
            </linearGradient>
        </defs>
        <path
            id="Oval Copy 2"
            d="M16 32C24.83 32 32 24.83 32 16C32 7.16 24.83 0 16 0C7.16 0 0 7.16 0 16C0 24.83 7.16 32 16 32Z"
            fill="#FF6357"
            fillOpacity="1.000000"
            fillRule="evenodd"
        />
        <path
            id="Oval Copy 2"
            d="M16 32C24.83 32 32 24.83 32 16C32 7.16 24.83 0 16 0C7.16 0 0 7.16 0 16C0 24.83 7.16 32 16 32Z"
            fill="url(#paint_linear_6605_17650_0)"
            fillOpacity="1.000000"
            fillRule="evenodd"
        />
        <g opacity="0.750000">
            <path
                id="Union"
                d="M16 17.1785L20.7139 21.8926C21.0393 22.218 21.5671 22.218 21.8926 21.8926C22.218 21.5671 22.218 21.0395 21.8926 20.7141L17.1785 16.0001L21.8926 11.286C22.218 10.9606 22.218 10.4329 21.8926 10.1075C21.5671 9.78204 21.0393 9.78204 20.7139 10.1075L16 14.8215L11.2859 10.1075C10.9604 9.78204 10.4329 9.78204 10.1074 10.1075C9.78198 10.4329 9.78198 10.9606 10.1074 11.286L14.8213 16.0001L10.1074 20.7141C9.78198 21.0395 9.78198 21.5671 10.1074 21.8926C10.4329 22.218 10.9604 22.218 11.2859 21.8926L16 17.1785Z"
                clipRule="evenodd"
                fill="#FFFFFF"
                fillOpacity="1.000000"
                fillRule="evenodd"
            />
        </g>
    </Icon>
);

// style="mix-blend-mode:normal"
