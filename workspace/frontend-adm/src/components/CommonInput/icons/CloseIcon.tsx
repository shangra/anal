import { FC } from 'react';
import { IconComponentProps, Icon } from 'ui-kit';

export const CloseIcon: FC<IconComponentProps> = (props) => (
        <Icon {...props} viewBox="0 0 24 24">
            <g>
                <g opacity="0.65">
                    <path d="M20.45 22.56C21.03 23.14 21.97 23.14 22.56 22.56C23.14 21.97 23.14 21.03 22.56 20.45L14.11 12L22.56 3.55C23.14 2.96 23.14 2.02 22.56 1.43C21.97 0.85 21.03 0.85 20.45 1.43L12 9.88L3.55 1.43C2.96 0.85 2.02 0.85 1.43 1.43C0.85 2.02 0.85 2.96 1.43 3.55L9.88 12L1.43 20.45C0.85 21.03 0.85 21.97 1.43 22.56C2.02 23.14 2.96 23.14 3.55 22.56L12 14.11L20.45 22.56Z"
                          fillRule="nonzero"/>
                </g>
            </g>
        </Icon>
    );