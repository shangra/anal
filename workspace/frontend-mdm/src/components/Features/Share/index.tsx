import { Component } from 'react';
import { IconButton, Tooltip } from 'ui-kit';
import { ShareIcon } from './icons/ShareIcon';
import $message from '../../ui/message.helper';
import { ShareProps } from './types';
import { withRouter } from '../..//HOC/withRouter';

export class ShareClass extends Component<ShareProps, {}> {
    handleClick = () => {
        navigator.clipboard
            .writeText(window.location.href)
            .then(() => $message.show('Ссылка на страницу скопирована'))
            .catch(() => false);
    }

    render() {
        return (
            <Tooltip>
                <IconButton
                    {...this.props}
                    onClick={this.handleClick}
                    icon={ShareIcon}
                    rounded
                    variant="outlined"
                />
            </Tooltip>
        );
    }
}

export const Share = withRouter(ShareClass);