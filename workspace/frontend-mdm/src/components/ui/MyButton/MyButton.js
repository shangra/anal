import { Button } from 'react-bootstrap';

import Loader from '../../Loader/Loader';
import MySpinner from '../MySpinner/MySpinner';
import styles from './MyButton.module.css';

class MyButton extends Loader {
    clickHandlerWithSpinner = (e) => {
        this.startLoading();

        const result = this.props.onClick(e);
        if (result instanceof Promise) {
            result.finally(this.stopLoading);
        } else {
            this.stopLoading();
        }
    };

    render() {
        const { withLoader, onClick, style, type, disabled, title, size } = this.props;
        let { className } = this.props;

        className = className === undefined ? '' : ` ${className}`;
        const clickHandler = withLoader ? this.clickHandlerWithSpinner : onClick;
        const classSize = size ? ` btn-${size}` : '';
        className = `${className}${classSize}`;

        const CMP = this.props?.type?.toLowerCase() === 'submit' ? Button : 'div';
        return !this.props.isLoading && this.state.isLoading === 0 ? (
            <CMP
                data-test-id={this.props.testId}
                className={`${styles['my-btn']} btn-mis btn btn-primary ${className}`}
                {...(title ? { title } : {})}
                {...(disabled ? { disabled } : {})}
                {...(onClick ? { onClick: clickHandler } : {})}
                {...(style ? { style } : {})}
                {...(type ? { type } : {})}
            >
                {this.props.children}
            </CMP>
        ) : (
            <CMP
                data-test-id={this.props.testId}
                className={`${styles['my-btn']} btn-mis btn btn-primary ${className}`}
                {...(disabled ? { disabled } : {})}
                {...(style ? { style } : {})}
                {...(type ? { type } : {})}
            >
                <div className="invisible" style={{ height: 0, display: 'none' }}>
                    {this.props.children}
                </div>
                <MySpinner size={18} />
            </CMP>
        );
    }
}

export default MyButton;
