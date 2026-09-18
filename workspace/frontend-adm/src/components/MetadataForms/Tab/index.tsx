import { Component, type ReactNode } from 'react';
import { Tab as UITab } from 'ui-kit';

interface ITabProps {
    style?: React.CSSProperties;
    children: ReactNode[];
}

interface ITabState {}

export class Tab extends Component<ITabProps, ITabState> {
    constructor(props: ITabProps) {
        super(props);
    }

    render() {
        return <UITab style={this.props.style}>{this.props.children}</UITab>;
    }
}
