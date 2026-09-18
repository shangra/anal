import { FC } from 'react';
import { IconComponentProps, Icon } from 'ui-kit';

export const DropUpIcon: FC<IconComponentProps> = (props) => (
        <Icon {...props} viewBox="0 0 24 24" style={{
            transform: "rotate(180deg)",
            ...props.style
        }}>
            <path d="M5.06 6.93C4.46 6.34 3.53 6.34 2.93 6.93C2.34 7.53 2.34 8.46 2.93 9.06L10.93 17.06C11.23 17.35 11.58 17.5 12 17.5C12.41 17.5 12.76 17.35 13.06 17.06L21.06 9.06C21.65 8.46 21.65 7.53 21.06 6.93C20.46 6.34 19.53 6.34 18.93 6.93L12 13.87L5.06 6.93Z"
                  fillRule="evenodd"
            />
        </Icon>
    );