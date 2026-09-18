import { Component, ReactNode } from 'react';
import { Modal as ModalComponent, ModalProps as ModalComponentProps } from "ui-kit"

export class Modal extends Component<ModalComponentProps> {
    render = () => (
        <ModalComponent {...this.props} />
    )
}

export type ModalProps = ModalComponentProps