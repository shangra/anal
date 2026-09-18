import { Component } from 'react';
import { Tabs as TabsComponent, TabsProps as TabsComponentProps} from "ui-kit"

export class Tabs extends Component<TabsComponentProps> {
    render = () => (
        <TabsComponent {...this.props} />
    )
}

export type TabsProps = TabsComponentProps