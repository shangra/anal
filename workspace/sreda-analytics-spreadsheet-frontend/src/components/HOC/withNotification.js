import React from 'react';
import { useNotification } from 'ui-kit';

export const withNotification = (Component) => {
    const Wrapper = React.forwardRef((props, ref) => {
        const notification = useNotification();
        return (
            <Component
                ref={ref}
                notification={notification}
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...props}
            />
        );
    });

    Wrapper.displayName = 'withNotification';
    return Wrapper;
};
