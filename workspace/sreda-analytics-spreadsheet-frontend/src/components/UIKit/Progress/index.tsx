import { Component } from 'react';
import { Progress as ProgressComponent, ProgressProps as ProgressComponentProps } from 'ui-kit';

export class Progress extends Component<ProgressProps> {
    render() {
        return <ProgressComponent {...this.props} />;
    }
}

export type ProgressProps = ProgressComponentProps;
