import { FC } from 'react';
import { Icon, IconComponentProps } from 'ui-kit';

export const AddIcon: FC<IconComponentProps> = (props) => (
        <Icon
            viewBox="0 0 16 16"
            {...props}
        >
            <rect id="_masterIcon" width="16.000000" height="16.000000" fill="#FFFFFF" fillOpacity="0"/>
            <path id="path" d="M7 9L7 15C7 15.55 7.44 16 8 16C8.55 16 9 15.55 9 15L9 9L15 9C15.55 9 16 8.55 16 8C16 7.44 15.55 7 15 7L9 7L9 1C9 0.44 8.55 0 8 0C7.44 0 7 0.44 7 1L7 7L1 7C0.44 7 0 7.44 0 8C0 8.55 0.44 9 1 9L7 9Z" fill="#7C89AB" fillOpacity="1.000000" fillRule="evenodd"/>
        </Icon>
    )