import { Component, ReactNode } from 'react';
import cn from 'classnames'

import { ActionButton } from '../ActionButton';
import styles from './Fullscreen.module.css';

interface IFullscreenProps {
    onClose: () => void;
    children: ReactNode;
    className?: string;
    style?: object;
}
export class Fullscreen extends Component<IFullscreenProps> {
    render() {
        return (
            <div className={cn(styles.fullscreen, this.props?.className)} style={this.props?.style}>
                {this.props.children}
                <div className={styles.close}>
                    <ActionButton iconClassName="bi bi-fullscreen-exit" onClick={this.props.onClose} />
                </div>
            </div>
        );
    }
}
