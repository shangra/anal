import { Component } from 'react';
import { Dropdown as DropdownComponent, DropdownProps as DropdownComponentProps } from 'ui-kit';

export class Dropdown extends Component<DropdownComponentProps> {
    render() {
        return <DropdownComponent {...this.props} />;
    }
}

export type DropdownProps = DropdownComponentProps;
