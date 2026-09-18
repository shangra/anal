import { Component } from 'react';
import { NotificationsProvider as NotificationsProviderComponent, NotificationsProviderProps as NotificationsProviderComponentProps} from "ui-kit"

export class NotificationsProvider extends Component<NotificationsProviderComponentProps> {
    render = () => (
        <NotificationsProviderComponent {...this.props} />
    )
}

export type NotificationsProviderProps = NotificationsProviderComponentProps