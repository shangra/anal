import { Component } from "react";
import {
    ToggleButton as ToggleButtonComponent,
    ToggleButtonProps as ToggleButtonComponentProps
} from 'ui-kit'


export class ToggleButton<T> extends Component<ToggleButtonComponentProps<T>, {}> {
    render = () => (
        <ToggleButtonComponent { ...this.props } />
    )
}

export type ToggleButtonProps<T> = ToggleButtonComponentProps<T>