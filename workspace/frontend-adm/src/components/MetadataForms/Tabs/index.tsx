import { Component, type ReactElement } from 'react';
import { Tabs as UITabs } from 'ui-kit';

interface ITabsProps {
    style?: React.CSSProperties;
    children: ReactElement[];
}

interface ITabsState {}

export class Tabs extends Component<ITabsProps, ITabsState> {
    constructor(props: ITabsProps) {
        super(props);
    }

    render() {
        return (
            <UITabs variant="rounded" style={this.props.style}>
                {this.props.children}
            </UITabs>
        );
    }
}
