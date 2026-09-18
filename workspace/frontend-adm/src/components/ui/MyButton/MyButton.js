import { Button } from 'ui-kit';

import  LoaderClass from '../../Loader/Loader';
import styles from './MyButton.module.css';
import { Loader } from 'ui-kit';

class MyButton extends LoaderClass {
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
                <Loader size='medium'/>
            </CMP>
        );
    }
}

export default MyButton;
