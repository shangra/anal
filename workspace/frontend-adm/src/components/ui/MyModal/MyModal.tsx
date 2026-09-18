import { Component, type CSSProperties } from 'react';
// @ts-ignore — StateManager не типизирован
import StateManager from 'lite-react-statemanager';
import { Modal as UiKitModal } from 'ui-kit';
import type { ModalState } from './modal.helper';
import style from './MyModal.module.css';
import './override.css';

const DEFAULT_MODAL_STATE: ModalState = {
    show: false,
    element: { name: '' },
    style: {},
};

export interface MyModalProps {}

interface MyModalState {
    modal: ModalState;
}

export class MyModal extends Component<MyModalProps, MyModalState> {
    constructor(props: MyModalProps) {
        super(props);

        this.state = {
            modal: DEFAULT_MODAL_STATE,
        };

        this.hideModal = this.hideModal.bind(this);
        this.subscribeModal = this.subscribeModal.bind(this);
        this.handleSetOpen = this.handleSetOpen.bind(this);
    }

    componentDidMount(): void {
        // @ts-ignore — StateManager не типизирован
        StateManager.subscribeState({ modal: { subscribeModal: this.subscribeModal } });
    }

    componentWillUnmount(): void {
        // @ts-ignore — StateManager не типизирован
        StateManager.unsubscribeState({ modal: ['subscribeModal'] });
    }

    private hideModal(): void {
        const callback = this.state.modal.element?.callback;
        // @ts-ignore — StateManager не типизирован
        StateManager.setState({ modal: { show: false, element: { name: '', buttons: undefined } } });
        if (callback) callback();
    }

    private handleSetOpen(opened: boolean): void {
        if (!opened) this.hideModal();
    }

    private subscribeModal(store: { modal?: ModalState }): void {
        if (!store || !store.modal) return;
        this.setState({ modal: store.modal }, () => {
            const callback = this.state.modal.element?.callback;
            if (callback) callback();
        });
    }

    render(): React.ReactNode {
        const { modal } = this.state;

        const buttons = modal.element?.buttons;
        const styleProp: CSSProperties = (modal.style as CSSProperties) ?? {};

        return (
            <UiKitModal
                testId="my-modal"
                classNames={style.myModal}
                opened={!!modal.show}
                title={modal.element?.name || undefined}
                actions={buttons}
                onSetOpen={this.handleSetOpen}
                onClose={this.hideModal}
                closeByOutsideClick={modal.hideWhenClickBackdrop ?? true}
                lockScroll={false}
                style={styleProp}
            >
                {modal.content}
            </UiKitModal>
        );
    }
}

export default MyModal;
