import { FC } from 'react';
import { IconComponentProps, Icon } from 'ui-kit';

export const TimeIcon: FC<IconComponentProps> = (props) => (
        <Icon {...props} viewBox="0 0 24 24">
            <g opacity="0.650000">
                <path d="M0 12C0 5.37 5.37 0 12 0C18.62 0 24 5.37 24 12C24 18.62 18.62 24 12 24C5.37 24 0 18.62 0 12ZM3 12C3 7.02 7.02 3 12 3C16.97 3 21 7.02 21 12C21 16.97 16.97 21 12 21C7.02 21 3 16.97 3 12Z"  fillRule="evenodd"/>
            </g>
            <path d="M10.75 6L10.75 13.25C10.75 13.8 11.19 14.25 11.75 14.25L17.25 14.25C17.8 14.25 18.25 13.8 18.25 13.25L18.25 12.75C18.25 12.19 17.8 11.75 17.25 11.75L17 11.75L13.25 11.75L13.25 5.75C13.25 5.19 12.8 4.75 12.25 4.75L11.75 4.75C11.19 4.75 10.75 5.19 10.75 5.75L10.75 6Z" fillRule="evenodd"/>
        </Icon>
    );
