import { Component } from 'react';
import { Backdrop as BackdropComponent, BackdropProps as BackdropComponentProps } from 'ui-kit';

export class Backdrop extends Component<BackdropComponentProps> {
    render() {
        return <BackdropComponent {...this.props} />;
    }
}

export type BackdropProps = BackdropComponentProps;
