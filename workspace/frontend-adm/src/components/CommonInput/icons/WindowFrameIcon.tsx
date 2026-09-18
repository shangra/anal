import { FC } from 'react';
import { IconComponentProps, Icon } from 'ui-kit';

export const WindowFrameIcon: FC<IconComponentProps> = (props) => (
        <Icon {...props} viewBox="0 0 24 24" style={{...props.style}}>
            <g>
                <g opacity="0.65">
                    <path d="M24 3C24 1.89 23.1 1 22 1L7 1C5.89 1 5 1.89 5 3L5 6L7.5 6L7.5 5L21.5 5L21.5 15.5L19 15.5L19 18L22 18C23.1 18 24 17.1 24 16L24 3Z"
                          fillRule="evenodd"/>
                </g>
                <path d="M19 8C19 6.89 18.1 6 17 6L2 6C0.89 6 0 6.89 0 8L0 21C0 22.1 0.89 23 2 23L17 23C18.1 23 19 22.1 19 21L19 8ZM2.5 10L2.5 20.5L16.5 20.5L16.5 10L2.5 10Z"
                      fillRule="evenodd"/>
            </g>
        </Icon>
    );