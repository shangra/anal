import React, { Component } from 'react';
import { Modal } from 'react-bootstrap';
import StateManager from 'lite-react-statemanager';
import { IconButton, CloseIcon } from 'ui-kit';
import style from './MyModal.module.css';
import { MyConfirmMDM } from '../MyConfirmMDM';
import cn from 'classnames';
import './override.css';

export class MyModal extends Component {
    constructor(props) {
        super(props);
        // console.log('sdfsdf')
        this.state = {
            modal: {
                show: false,
                isConfirm: false,
                style: {},
                modalClassName: '',
                backdropClassName: '',
            },
        };

        this.hideModal = this.hideModal.bind(this);
        this.subscribeModal = this.subscribeModal.bind(this);
    }

    componentDidMount() {
        StateManager.subscribeState({ modal: { subscribeModal: this.subscribeModal } });
    }

    componentWillUnmount() {
        StateManager.unsubscribeState({ modal: ['subscribeModal'] });
    }

    //-----------------------------

    hideModal() {
        StateManager.setState({ modal: { show: false } });
        if (this.state.modal.element?.callback) this.state.modal.element.callback();
    }

    subscribeModal(store) {
        this.setState({ modal: store.modal }, () => {
            if (this.state.modal.element?.callback) this.state.modal.element.callback();
        });
    }

    render() {
        const size = this.state.modal.size ?? 'md';
        const ButtonInHeader = this.state.modal.element?.buttons ?? '';
        const fullscreen = this.state.modal.fullscreen ?? false;

        return (
            <Modal
                id="my-modal"
                className={cn(style.myModal)}
                backdrop={this.state.modal.hideWhenClickBackdrop? true : "static"}
                keyboard
                size={size}
                fullscreen={fullscreen}
                aria-labelledby="contained-modal-title-vcenter"
                centered
                scrollable={this.state.modal.scrollable}
                show={this.state.modal.show}
                onHide={this.hideModal}
                animation
                backdropClassName={this.state.modal.backdropClassName || style.modalBackdropLayout}
                dialogClassName={this.state.modal.modalClassName || style.modalDialogLayout}
                style={this.state.modal.style}
            >
                <Modal.Header className={cn('justify-content-between border-0', style.myModalHeader)}>
                    <Modal.Title className="text-center fs-5">{this.state.modal.element?.name}</Modal.Title>
                    <div>
                        {ButtonInHeader}
                        <IconButton
                            variant="text"
                            icon={CloseIcon}
                            onClick={this.hideModal}
                        />
                    </div>
                </Modal.Header>
                <Modal.Body>{this.state.modal.isConfirm ? <MyConfirmMDM /> : this.state.modal.content}</Modal.Body>
            </Modal>
        );
    }
}
