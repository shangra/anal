import { FC } from 'react';

import { Icon, IconComponentProps } from '../../UIKit/Icon';

export const TableExpandedIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 14.667 14.667">
        <path
            d="M9 0L1 0C0.44 0 0 0.44 0 1C0 1.55 0.44 2 1 2L9 2C9.55 2 10 1.55 10 1C10 0.44 9.55 0 9 0ZM11 4L3 4C2.44 4 2 4.44 2 5C2 5.55 2.44 6 3 6L11 6C11.55 6 12 5.55 12 5C12 4.44 11.55 4 11 4ZM5 8L13 8C13.55 8 14 8.44 14 9C14 9.55 13.55 10 13 10L5 10C4.44 10 4 9.55 4 9C4 8.44 4.44 8 5 8ZM15 12L7 12C6.44 12 6 12.44 6 13C6 13.55 6.44 14 7 14L15 14C15.55 14 16 13.55 16 13C16 12.44 15.55 12 15 12Z"
            fillRule="evenodd" />
    </Icon>
);
