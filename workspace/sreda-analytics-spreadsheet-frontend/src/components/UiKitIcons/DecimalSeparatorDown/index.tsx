import { FC } from 'react';

import { Icon, IconComponentProps } from '../../UIKit/Icon';

export const DecimalSeparatorDown: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 24 24">
        <path d="M16.5 2v8 M13.5 7l3 3 3-3" />
        <path d="M2.5 16L4 14v6" />
        <path d="M7 20l-1 2" />
        <rect x="10" y="14" width="3" height="6" rx="1.5" />
        <rect x="15" y="14" width="3" height="6" rx="1.5" />
        <rect x="20" y="14" width="3" height="6" rx="1.5" />
    </Icon>
);
