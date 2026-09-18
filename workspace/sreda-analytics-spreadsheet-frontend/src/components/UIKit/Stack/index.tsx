import { Component } from 'react';
import { Stack as StackComponent, StackProps as StackComponentProps } from 'ui-kit';

export class Stack extends Component<StackComponentProps> {
    render() {
        return <StackComponent {...this.props} />;
    }
}

export type StackProps = StackComponentProps;
