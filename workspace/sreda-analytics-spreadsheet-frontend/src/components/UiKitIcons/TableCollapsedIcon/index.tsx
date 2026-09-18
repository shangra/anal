import { FC } from 'react';

import { Icon, IconComponentProps } from '../../UIKit/Icon';

export const TableCollapsedIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 14.667 14.667">
        <path
            d="M14 1L2 1C1.44 1 1 1.44 1 2C1 2.55 1.44 3 2 3L14 3C14.55 3 15 2.55 15 2C15 1.44 14.55 1 14 1ZM14 5L2 5C1.44 5 1 5.44 1 6C1 6.55 1.44 7 2 7L14 7C14.55 7 15 6.55 15 6C15 5.44 14.55 5 14 5ZM2 9L14 9C14.55 9 15 9.44 15 10C15 10.55 14.55 11 14 11L2 11C1.44 11 1 10.55 1 10C1 9.44 1.44 9 2 9ZM14 13L2 13C1.44 13 1 13.44 1 14C1 14.55 1.44 15 2 15L14 15C14.55 15 15 14.55 15 14C15 13.44 14.55 13 14 13Z"
            fillRule="evenodd" />
    </Icon>
);
