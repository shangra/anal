import { FC } from 'react';
import { Icon } from '../../UIKit/Icon';
import { IconComponentProps } from '../../UIKit/Icon';

export const LeftIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 16 16">
        <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0" />
    </Icon>
);
