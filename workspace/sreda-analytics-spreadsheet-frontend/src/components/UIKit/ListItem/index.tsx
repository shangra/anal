import { Component } from 'react';
import { ListItem as ListItemComponent, ListItemProps as ListItemComponentProps } from 'ui-kit';

export class ListItem extends Component<ListItemComponentProps> {
    render() {
        return <ListItemComponent {...this.props} />;
    }
}

export type ListItemProps = ListItemComponentProps;
