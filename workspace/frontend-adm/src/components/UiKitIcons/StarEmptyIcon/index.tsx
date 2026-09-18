import { FC } from 'react';
import { Icon } from '../../UIKit/Icon';
import { IconComponentProps } from '../../UIKit/Icon';


export const StarEmptyIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 41 40">
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M40.6798 15.3064L26.4102 14.0759L20.8333 0.9375L15.2564 14.0957L0.986816 15.3064L11.823 24.6938L8.56818 38.6458L20.8333 31.2431L33.0984 38.6458L29.8635 24.6938L40.6798 15.3064ZM20.8333 27.5319L13.371 32.037L15.3557 23.5427L8.76663 17.8269L17.4594 17.0728L20.8333 9.07464L24.227 17.0926L32.9198 17.8468L26.3308 23.5626L28.3154 32.0569L20.8333 27.5319Z"
        />
    </Icon>
);
