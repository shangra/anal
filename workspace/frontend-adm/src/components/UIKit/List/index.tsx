import { Component } from 'react';
import { List as ListComponent, ListProps as ListComponentProps } from "ui-kit"

export class List<T> extends Component<ListComponentProps<T>> {
    render = () => (
        <ListComponent {...this.props} />
    )
}

export type ListProps<T> = ListComponentProps<T>