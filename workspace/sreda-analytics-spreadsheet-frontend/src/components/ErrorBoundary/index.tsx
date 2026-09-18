import React, { ErrorInfo } from 'react';

import style from './index.module.css';

interface IErrorBoundaryProps {
    fallbackUI?: React.ReactNode | ((error: Error) => React.ReactNode);
    children: React.ReactNode;
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

    render() {
        if (this.state.error) {
            // Render custom fallback UI
            if (this.props.fallbackUI) {
                return typeof this.props.fallbackUI === 'function'
                    ? this.props.fallbackUI(this.state.error)
                    : this.props.fallbackUI;
            }

            return <span className={style.error}>In component something went wrong</span>;
        }

        return this.props.children;
    }
}
