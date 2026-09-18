import { FC } from 'react';
import { Icon } from '../../UIKit/Icon';
import { IconComponentProps } from '../../UIKit/Icon';


export const StarFilledIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 41 40">
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M40.6798 17.1258L26.4102 15.8268L20.8333 1.95654L15.2564 15.8477L0.986816 17.1258L11.823 27.0361L8.56818 41.7654L20.8333 33.9503L33.0984 41.7654L29.8635 27.0361L40.6798 17.1258Z"
        />
    </Icon>
);
