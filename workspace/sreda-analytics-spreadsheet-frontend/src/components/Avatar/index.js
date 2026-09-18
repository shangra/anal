import React from 'react';

import { BACKEND_PROXY } from '../../settings/settings';
import styles from './Avatar.module.css';

export class Avatar extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            avatarUrl: this.props.avatarId ? `${BACKEND_PROXY}/files/get/${this.props.avatarId}/avatar.jpeg` : '',
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.avatarId !== this.props.avatarId) {
            let url = '';
            if (this.props.avatarId !== '') {
                url = `${BACKEND_PROXY}/files/get/${this.props.avatarId}/avatar.jpeg`;
            }
            this.setState({ avatarUrl: url });
        }
    }

    render() {
        let avatar = <div style={{ width: this.props.width, height: this.props.height }} className={styles['user-avatar']} />;
        if (this.state.avatarUrl !== '') {
            avatar = (
                <div
                    style={{
                        width: this.props.width,
                        height: this.props.height,
                        backgroundImage: `url(${this.state.avatarUrl})`,
                    }}
                    className={styles['user-avatar']}
                />
            );
        }
        return avatar;
    }
}
