import { FC } from 'react';
import { IconComponentProps, Icon } from 'ui-kit';

export const PlusIcon: FC<IconComponentProps> = (props) => (
        <Icon {...props} viewBox="0 0 24 24">
	        <path d="M10.5 13.5L10.5 22.5C10.5 23.32 11.17 24 12 24C12.82 24 13.5 23.32 13.5 22.5L13.5 13.5L22.5 13.5C23.32 13.5 24 12.82 24 12C24 11.17 23.32 10.5 22.5 10.5L13.5 10.5L13.5 1.5C13.5 0.67 12.82 0 12 0C11.17 0 10.5 0.67 10.5 1.5L10.5 10.5L1.5 10.5C0.67 10.5 0 11.17 0 12C0 12.82 0.67 13.5 1.5 13.5L10.5 13.5Z" fillRule="evenodd"/>
        </Icon>
    );
