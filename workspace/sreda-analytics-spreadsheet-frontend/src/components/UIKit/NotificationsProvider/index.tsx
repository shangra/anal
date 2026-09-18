import { Component } from 'react';
import {
    NotificationsProvider as NotificationsProviderComponent,
    NotificationsProviderProps as NotificationsProviderComponentProps,
} from 'ui-kit';

export class NotificationsProvider extends Component<NotificationsProviderComponentProps> {
    render() {
        return <NotificationsProviderComponent {...this.props} />;
    }
}

export type NotificationsProviderProps = NotificationsProviderComponentProps;
