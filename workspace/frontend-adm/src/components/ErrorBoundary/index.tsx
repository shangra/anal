import React, { ErrorInfo } from 'react';
import style from './index.module.css';
import download from '../../vendors/download-react';
import { formatDateTime } from 'components/Utils/DateTimeProcessor/utils';
import { Button } from 'ui-kit';
import $windows from 'components/WindowsCMP/windows.helper';
import { v4 as uuidv4 } from 'uuid';
import $message from 'components/ui/MyFlash/message.helper';

interface IErrorBoundaryProps {
    fallbackUI?: React.ReactNode | ((error: Error) => React.ReactNode);
    children: React.ReactNode;
    downloadLogs?: {
        fileName?: string;
        logObj: Object;
    };
}

interface IErrorBoundaryState {
    error: Error | null;
}

export class ErrorBoundary extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
    constructor(props: IErrorBoundaryProps) {
        super(props);

        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error) {
        // Update state so the next render will show the fallback UI.
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can also log the error to an error reporting service
        console.error(error, errorInfo);
    }

    handleDownloadLogs = () => {
        if (!this.props.downloadLogs || !this.state.error) return;

        let logsFileData;
        try {
            logsFileData = JSON.stringify(
                {
                    error: this.state.error.message,
                    trace: this.props.downloadLogs.logObj,
                },
                null,
                4,
            );
        } catch (error) {
            console.error(error);
            logsFileData = JSON.stringify({ error: this.state.error.message, trace: {} });
        }
        const logsFileName =
            this.props.downloadLogs.fileName ??
            `Error boundary logs ${formatDateTime(new Date().toString(), {
                dateDivider: '-',
                dateTimeDivider: '_',
                timeDivider: '_',
            })}`;
        const logsFileMimeType = 'application/json;charset=utf-8';

        download(logsFileData, logsFileName, logsFileMimeType);
    };

    copyErrorToClipboard = () => {
        if (this.state.error) {
            try {
                navigator.clipboard.writeText(this.state.error.message);
                $message.show('Текст скопирован в буфер обмена');
            } catch (error) {
                $message.show(`Ошибка при копировании текста: ${error}`);
            }
        }
    };

    render() {
        if (this.state.error) {
            // Render custom fallback UI
            if (this.props.fallbackUI) {
                return typeof this.props.fallbackUI === 'function'
                    ? this.props.fallbackUI(this.state.error)
                    : this.props.fallbackUI;
            }

            return (
                <div className={style.error}>
                    <div>Что-то пошло не так:</div>
                    {this.state.error?.message && (
                        <div>
                            <code>{this.state.error.message}</code>
                        </div>
                    )}
                    <div>
                        <Button onClick={this.copyErrorToClipboard}>Скопировать ошибку</Button>&nbsp;
                        {this.props.downloadLogs ? <Button onClick={this.handleDownloadLogs}>Скачать логи</Button> : null}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
