import { FC } from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const MoreIcon: FC<IconComponentProps> = (props) => (
        <Icon {...props} viewBox="0 0 24 24">
            <path id="path" d="M18 12C18 13.64 19.35 15 21 15C22.65 15 24 13.64 24 12C24 10.35 22.65 9 21 9C19.35 9 18 10.35 18 12ZM15 12C15 10.35 13.65 9 12 9C10.35 9 9 10.35 9 12C9 13.64 10.35 15 12 15C13.65 15 15 13.64 15 12ZM3 9C4.64 9 6 10.35 6 12C6 13.64 4.64 15 3 15C1.35 15 0 13.64 0 12C0 10.35 1.35 9 3 9Z"
                  fillRule="evenodd"/>
        </Icon>
    );