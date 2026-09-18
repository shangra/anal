import { Component } from 'react';
import { Badge as BadgeComponent, BadgeProps as BadgeComponentProps } from 'ui-kit';

export class Badge extends Component<BadgeComponentProps> {
    render() {
        return <BadgeComponent {...this.props} />;
    }
}

export type BadgeProps = BadgeComponentProps;
