import { PureComponent } from 'react';

import style from './errorAuth.module.css';

class ErrorAuth extends PureComponent {
    render() {
        return (
            <div className={`DesktopContainer ${style.error}`}>
                <h1 style={{ paddingBottom: 'var(--ui-kit-spacing-12)' }}>Ошибка доступа</h1>
            </div>
        );
    }
}

export default ErrorAuth;
