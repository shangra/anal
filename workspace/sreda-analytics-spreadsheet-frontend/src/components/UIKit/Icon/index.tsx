import { Component } from 'react';
import {
    Icon as IconComponent,
    IconComponentProps as IconComponentComponentProps,
    IconProps as IconComponentUIProps,
} from 'ui-kit';

export class Icon extends Component<IconComponentUIProps> {
    render() {
        return <IconComponent {...this.props} />;
    }
}

export type IconProps = IconComponentUIProps;
export type IconComponentProps = IconComponentComponentProps;
