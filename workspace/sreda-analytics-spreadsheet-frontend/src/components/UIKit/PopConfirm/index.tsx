import { Component } from 'react';
import { PopConfirm as PopConfirmComponent, PopConfirmProps as PopConfirmComponentProps } from "ui-kit"

export class PopConfirm extends Component<PopConfirmComponentProps> {
    render = () => (
        <PopConfirmComponent {...this.props} />
    )
}

export type PopConfirmComponent = PopConfirmComponentProps