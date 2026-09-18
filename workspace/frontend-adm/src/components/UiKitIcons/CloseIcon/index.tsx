import { FC } from "react";
import { Icon } from "../../UIKit/Icon";
import { IconComponentProps } from '../../UIKit/Icon';


export const CloseIcon: FC<IconComponentProps> = (props) => {
    return <Icon {...props} viewBox="0 0 15 15" >
        <g opacity="0.650000">
            <path d="M13.02 14.43C13.41 14.82 14.04 14.82 14.43 14.43C14.82 14.04 14.82 13.41 14.43 13.02L8.77 7.36L14.43 1.7C14.82 1.31 14.82 0.68 14.43 0.29C14.04 -0.1 13.41 -0.1 13.02 0.29L7.36 5.94L1.7 0.29C1.31 -0.1 0.68 -0.1 0.29 0.29C-0.1 0.68 -0.1 1.31 0.29 1.7L5.95 7.36L0.29 13.02C-0.1 13.41 -0.1 14.04 0.29 14.43C0.68 14.82 1.31 14.82 1.7 14.43L7.36 8.77L13.02 14.43Z"
                fillRule="nonzero" />
        </g>
    </Icon>
}

