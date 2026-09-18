import { FC } from 'react';
import { Icon } from '../../UIKit/Icon';
import { IconComponentProps } from '../../UIKit/Icon';

export const EyeOpenedIcon: FC<IconComponentProps> = (props) => (
    <Icon {...props} viewBox="0 0 24 24">
        <path
            opacity="0.65"
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M12 8.88889C10.2564 8.88889 8.9231 10.237 8.9231 12C8.9231 13.763 10.2564 15.1111 12 15.1111C13.7436 15.1111 15.0769 13.763 15.0769 12C15.0769 10.237 13.7436 8.88889 12 8.88889Z"
            fill-opacity="0.8"
        />
        <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M12 5C7.45455 5 3.54545 7.89333 2 12C3.54545 16.1067 7.45455 19 12 19C16.5455 19 20.4545 16.1067 22 12C20.4545 7.89333 16.5455 5 12 5ZM12 17.4444C8.98462 17.4444 6.61538 15.0489 6.61538 12C6.61538 8.95111 8.98462 6.55556 12 6.55556C15.0154 6.55556 17.3846 8.95111 17.3846 12C17.3846 15.0489 15.0154 17.4444 12 17.4444Z"
            fill-opacity="0.8"
        />
    </Icon>
);
