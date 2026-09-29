import { PureComponent } from 'react';

import style from './errorAuth.module.css';

class ErrorAuth extends PureComponent {
    render() {
        return (
            <div className={`DesktopContainer ${style.error}`}>
                <h1 className="pb-4">Ошибка доступа</h1>
            </div>
        );
    }
}

export default ErrorAuth;
