import { PureComponent } from 'react';

import style from './errorGatewayTimeout.module.css';

class ErrorGatewayTimeout extends PureComponent {
    render() {
        return (
            <div className={`DesktopContainer ${style.error}`}>
                <h1 className="pb-4">Сервер не отвечает</h1>
                <p className="pb-2">Возникла ошибка при подключении к серверу (504 Gateway Timeout).</p>
                <p className="pb-2">Пожалуйста, проверьте подключение к серверу или повторите попытку позже.</p>
            </div>
        );
    }
}

export default ErrorGatewayTimeout;
