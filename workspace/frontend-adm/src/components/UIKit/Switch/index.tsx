import { Component } from 'react';
import { Switch as SwitchComponent, SwitchProps as SwitchComponentProps} from 'ui-kit'

export class Switch extends Component<SwitchComponentProps> {
    render = () => (
        <SwitchComponent {...this.props} />
    )
}

export type SwitchProps = SwitchComponentProps