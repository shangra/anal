import { FC } from 'react';
import { IconComponentProps } from '../../UIKit/Icon';
import { Icon } from '../../UIKit/Icon';

export const NotificationIcon: FC<IconComponentProps> = (props) => {

    return (
        <Icon {...props} viewBox="0 0 16 16">
            <g opacity="0.650000">
                <path id="Path" d="M7.73 15.99C9.05 15.99 10.13 14.91 10.13 13.59L5.33 13.59C5.33 14.91 6.41 15.99 7.73 15.99Z" fill="#7C89AB" fill-opacity="1.000000" fill-rule="evenodd" />
            </g>
            <path id="primary" d="M7.73 0C7.29 0 6.93 0.35 6.93 0.8L6.93 1.67C5.1 2.05 3.73 3.66 3.73 5.6L3.73 8.83C3.73 10 2.87 10.31 2.41 10.39L2.13 10.39C1.69 10.39 1.33 10.75 1.33 11.2C1.33 11.64 1.69 12 2.13 12L13.33 12C13.77 12 14.13 11.64 14.13 11.2C14.13 10.75 13.77 10.39 13.33 10.39L13.05 10.39C12.59 10.31 11.73 10 11.73 8.83L11.73 5.6C11.73 3.66 10.35 2.05 8.53 1.67L8.53 0.8C8.53 0.35 8.17 0 7.73 0Z" fill="#7C89AB" fill-opacity="1.000000" fill-rule="nonzero" />
        </Icon>
    );
};
