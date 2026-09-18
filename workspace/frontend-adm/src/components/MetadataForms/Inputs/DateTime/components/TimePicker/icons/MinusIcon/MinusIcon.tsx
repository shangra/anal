import { FC } from 'react';
import { IconComponentProps, Icon } from 'ui-kit';

export const MinusIcon: FC<IconComponentProps> = (props) => (
        <Icon {...props} viewBox="0 0 24 24">
            <g style={{mixBlendMode:"normal"}}>
                <rect y="10.500000" rx="1.500000" width="24.000000" height="3.000000" />
            </g>
        </Icon>
    );
