import { Component } from 'react';
import { MultiSelect as MultiSelectComponent, MultiSelectProps as MultiSelectComponentProps } from 'ui-kit';

export class MultiSelect<T> extends Component<MultiSelectComponentProps<T>> {
    render() {
        return <MultiSelectComponent {...this.props} />;
    }
}

export type MultiSelectProps<T> = MultiSelectComponentProps<T>;
