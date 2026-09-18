import { FC } from 'react';
import { IconComponentProps } from '../../UIKit/Icon';
import { Icon } from '../../UIKit/Icon';

export const StarFillIcon: FC<IconComponentProps> = (props) => {
    return (
        <Icon {...props} viewBox="0 0 24 24">
		    <path d="M23.5 8.35L15.9 7.69C15.71 7.67 15.53 7.55 15.46 7.36L12.49 0.32C12.3 -0.11 11.68 -0.11 11.5 0.32L8.53 7.38C8.45 7.56 8.28 7.69 8.08 7.7L0.49 8.35C0.01 8.39 -0.18 8.98 0.18 9.3L5.95 14.33C6.1 14.46 6.17 14.66 6.12 14.86L4.39 22.33C4.28 22.79 4.78 23.16 5.19 22.91L11.72 18.95C11.89 18.85 12.1 18.85 12.27 18.95L18.8 22.92C19.21 23.16 19.71 22.8 19.6 22.33L17.88 14.86C17.83 14.66 17.9 14.46 18.05 14.33L23.81 9.29C24.17 8.98 23.98 8.39 23.5 8.35Z" fillRule="evenodd"/>
        </Icon>
    );
};
