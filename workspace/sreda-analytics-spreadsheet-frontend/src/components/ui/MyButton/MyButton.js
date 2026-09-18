import { Button as UiKitButton, Loader as UiKitLoader } from 'ui-kit';
import Loader from '../../Loader/Loader';

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
        const { withLoader, onClick, style, type, disabled, title, children, testId } = this.props;
        let { className } = this.props;

        className = className === undefined ? '' : ` ${className}`;
        const clickHandler = withLoader ? this.clickHandlerWithSpinner : onClick;

        className = `${styles['my-btn']}${className}`;

        const isLoading = this.props.isLoading || this.state?.isLoading !== 0;

        return !isLoading ? (
            <UiKitButton
                data-test-id={testId}
                className={className}
                disabled={disabled || false}
                title={title}
                onClick={!disabled ? clickHandler : undefined}
                style={style}
                type={type}
            >
                {children}
            </UiKitButton>
        ) : (
            <UiKitButton data-test-id={testId} className={className} disabled={disabled || false} style={style} type={type}>
                <span style={{ display: 'none' }}>{children}</span>
                <UiKitLoader className={styles.loader} size="small" />
            </UiKitButton>
        );
    }
}

export default MyButton;
