import { Component } from 'react';
import { IconButton as IconButtonComponent, IconButtonProps as IconButtonComponentProps } from 'ui-kit';

export class IconButton extends Component<IconButtonComponentProps> {
    render() {
        return <IconButtonComponent {...this.props} />;
    }
}

export type IconButtonProps = IconButtonComponentProps;
