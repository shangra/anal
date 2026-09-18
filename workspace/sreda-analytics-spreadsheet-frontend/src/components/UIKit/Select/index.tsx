import { Component } from 'react';
import { Select as SelectComponent, SelectOption as SelectOptionComponent, SelectProps as SelectComponentProps } from 'ui-kit';

export class Select<T> extends Component<SelectComponentProps<T>> {
    render() {
        return <SelectComponent {...this.props} />;
    }
}

export type SelectProps<T> = SelectComponentProps<T>;
export type SelectOption<T> = SelectOptionComponent<T>;
