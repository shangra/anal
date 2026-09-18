import { Component } from 'react';
import { Loader as LoaderComponent, LoaderProps as LoaderComponentProps } from 'ui-kit';

export class Loader extends Component<LoaderComponentProps> {
    render() {
        return <LoaderComponent {...this.props} />;
    }
}

export type LoaderProps = LoaderComponentProps;
