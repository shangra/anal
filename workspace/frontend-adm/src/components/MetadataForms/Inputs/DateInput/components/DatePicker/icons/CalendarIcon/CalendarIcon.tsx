import { FC } from 'react';
import { Icon, IconComponentProps } from "ui-kit";

export const CalendarIcon: FC<IconComponentProps> = (props) => (
        <Icon {...props} viewBox="0 0 24 24">
            <path d="M4.66 1.19C4.66 0.53 5.21 0 5.88 0L8.33 0C9 0 9.55 0.53 9.55 1.19L9.55 2.4L14.44 2.4L14.44 1.19C14.44 0.53 14.99 0 15.66 0L18.11 0C18.78 0 19.33 0.53 19.33 1.19L19.33 2.4L20.55 2.4C21.9 2.4 23 3.47 23 4.8L23 6L1 6L1.01 4.8C1.01 3.47 2.08 2.4 3.44 2.4L4.66 2.4L4.66 1.19Z"
                fillRule="nonzero"/>
            <g opacity="0.65">
                <path d="M23 8L1 8L1 20.5C1 21.88 2.09 23 3.44 23L20.55 23C21.9 23 23 21.88 23 20.5L23 8ZM20.55 10.5L3.44 10.5L3.44 20.5L20.55 20.5L20.55 10.5Z"
                    fillRule="evenodd"/>
            </g>
        </Icon>
    );