import { Component } from 'react';
import { Alert as AlertComponent, AlertProps as AlertComponentProps } from 'ui-kit';

export class Alert extends Component<AlertComponentProps> {
    render() {
        return <AlertComponent {...this.props} />;
    }
}

export type AlertProps = AlertComponentProps;
