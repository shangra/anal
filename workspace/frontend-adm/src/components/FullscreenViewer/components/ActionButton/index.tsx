import { Component } from 'react';
import styles from './ActionButton.module.css';

interface IActionButtonProps {
    iconClassName: string;
    onClick?: () => void;
}

export class ActionButton extends Component<IActionButtonProps> {
    render() {
        return (
            <button type='button' aria-label={this.props.iconClassName} className={styles.button} onClick={this.props.onClick}>
                <i className={this.props.iconClassName} />
            </button>
        );
    }
}
