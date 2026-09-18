import { FC } from 'react';
import { IconComponentProps } from '../../UIKit/Icon';
import { Icon } from '../../UIKit/Icon';

export const EditIcon: FC<IconComponentProps> = (props) => {

    return (
        <Icon {...props} viewBox="0 0 24 24">
            <path id="path" d="M19.43 1C18.53 1 17.62 1.35 16.92 2.05L3.26 15.71L3.21 15.98L2.26 20.73L2 22L3.26 21.73L8.01 20.78L8.28 20.73L21.94 7.07C23.35 5.66 23.35 3.45 21.94 2.05C21.24 1.35 20.34 1 19.43 1ZM19.43 2.64C19.87 2.64 20.31 2.84 20.73 3.26C21.57 4.1 21.57 5.01 20.73 5.85L19.79 6.77L17.23 4.2L18.14 3.26C18.56 2.84 19 2.64 19.43 2.64ZM3.26 15.71C5 16.32 7.86 18.94 8.29 20.72L9.5 19.51C8.95 17.6 6.38 15.07 4.49 14.48L3.26 15.71Z" fillRule="evenodd" />
        </Icon>
    );
};
