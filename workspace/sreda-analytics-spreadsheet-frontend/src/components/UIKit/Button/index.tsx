import { Component } from 'react';
import { Button as ButtonComponent, ButtonProps as ButtonComponentProps } from 'ui-kit';

export class Button extends Component<ButtonComponentProps> {
    render() {
        return <ButtonComponent {...this.props} />;
    }
}

export type ButtonProps = ButtonComponentProps;
