import { Component } from "react";
import { Tab as TabComponent, TabProps as TabComponentProps} from 'ui-kit'

export class Tab extends Component<TabComponentProps> {
    render = () => (
        <TabComponent {...this.props} />
    )
}

export type TabProps = TabComponentProps