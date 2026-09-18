import { Component } from 'react';
import { Popover as PopoverComponent, PopoverProps as PopoverComponentProps } from "ui-kit"

export class Popover extends Component<PopoverComponentProps> {
    render = () => (
        <PopoverComponent {...this.props} />
    )
}

export type PopoverComponent = PopoverComponentProps