import { FC } from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const ColumnIcon: FC<Partial<IconComponentProps>> = (props) => (
    <Icon viewBox="0 0 24 24" {...props}>
        <path
            id="path"
            d="M2.87 2.87C3.44 2.31 4.2 2 5 2L19 2C19.79 2 20.55 2.31 21.12 2.87C21.68 3.44 22 4.2 22 5L22 19C22 19.79 21.68 20.55 21.12 21.12C20.55 21.68 19.79 22 19 22L5 22C4.2 22 3.44 21.68 2.87 21.12C2.31 20.55 2 19.79 2 19L2 5C2 4.2 2.31 3.44 2.87 2.87ZM13 20L19 20C19.26 20 19.51 19.89 19.7 19.7C19.89 19.51 20 19.26 20 19L20 5C20 4.73 19.89 4.48 19.7 4.29C19.51 4.1 19.26 4 19 4L13 4L13 20ZM11 4L11 20L5 20C4.73 20 4.48 19.89 4.29 19.7C4.1 19.51 4 19.26 4 19L4 5C4 4.73 4.1 4.48 4.29 4.29C4.48 4.1 4.73 4 5 4L11 4Z"
            fill="#7C89AB"
            fillOpacity="0.600000"
            fillRule="evenodd"
        />
    </Icon>
);
