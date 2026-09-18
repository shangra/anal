import React, { Component } from 'react';
import style from './Error.module.css';

export class ApiError extends Component {
    render() {
        const errorCode = this.props.errorCode ?? '404';
        let errorInfo = 'Страница не найдена';
        let errorDescription;
        let errorMessages = [];

        if (typeof this.props.errorInfo === 'object') {
            const inputError = this.props.errorInfo;
            errorInfo = inputError.response.data.message || inputError.response.statusText || errorInfo;

            errorDescription = inputError.stack ?? undefined;
            errorMessages = inputError.errors ?? [];
        } else if (this.props.errorInfo) {
            errorInfo = this.props.errorInfo;
        }

        let errorIcon = <i className="bi bi-bug-fill" />;
        if (errorCode.toString() === '423' || errorCode.toString() === '403') {
            errorIcon = <i className="bi bi-shield-lock-fill" />;
        } else if (errorCode.toString() === '404') {
            errorIcon = <i className="bi bi-octagon-fill" />;
        } else if (errorCode.toString() === '800') {
            // работы на сервере
            errorIcon = <i className="bi bi-wrench-adjustable-circle-fill" />;
        }

        let blockErrorDescription = '';
        if (errorDescription) {
            const blockErrorMessages = errorMessages.map((message) => <h4>{message}</h4>);

            blockErrorDescription = (
                <>
                    <p>
                        <a
                            className="btn btn-dark"
                            data-bs-toggle="collapse"
                            href="#collapseErrorInfo"
                            role="button"
                            aria-expanded="false"
                            aria-controls="collapseErrorInfo"
                        >
                            Подробное описание
                        </a>
                    </p>
                    <div className="collapse" id="collapseErrorInfo">
                        <div className={`card card-body ${style.errorDescription}`}>
                            {blockErrorMessages}
                            <br />
                            {errorDescription}
                        </div>
                    </div>
                </>
            );
        }

        // className={"position-absolute start-50 translate-middle"} style={{ top: "25%"}}
        return (
            <div className="container w-100 h-100 p-2">
                <div>
                    <div className="text-center">
                        <div style={{ fontSize: 'xxx-large' }}>{errorIcon}</div>
                        <h1 title={errorInfo} className={style.cutText}>
                            {errorInfo}
                        </h1>
                        <h5>Код ошибки: {errorCode}</h5>
                        {blockErrorDescription}
                    </div>
                </div>
            </div>
        );
    }
}
