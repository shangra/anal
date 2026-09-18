import { FC } from 'react';
import { createPortal } from 'react-dom';

import { PortalProps } from './types';

export const Portal: FC<PortalProps> = (props) => {
    const { rootId, children } = props;

    const parent = document.getElementById(rootId);

    if (parent) {
        return createPortal(children, parent);
    }
    return null;
};
