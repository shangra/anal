import type { ReactNode } from 'react';
// @ts-ignore — StateManager не типизирован
import StateManager from 'lite-react-statemanager';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ShowModalOptions {
    size?: ModalSize;
    buttons?: ReactNode;
    zIndex?: number | string;
    fullscreen?: boolean;
    /**
     * Если `true` — клик по подложке закрывает модалку (обратная семантика к react-bootstrap).
     * В ui-kit это `closeByOutsideClick`.
     */
    hideWhenClickBackdrop?: boolean;
    scrollable?: boolean;
    style?: Record<string, unknown>;
}

export type ModalCloseCallback = () => void;

export interface ModalElement {
    name: string;
    buttons?: ReactNode;
    callback?: ModalCloseCallback;
}

export interface ModalState {
    show: boolean;
    element: ModalElement;
    size?: ModalSize;
    zIndex?: number | string;
    fullscreen?: boolean;
    hideWhenClickBackdrop?: boolean;
    content?: ReactNode;
    scrollable?: boolean;
    style?: Record<string, unknown>;
}

interface ModalStore {
    modal: ModalState;
}

const $modal = {
    show: (
        title: string,
        content?: ReactNode,
        options?: ShowModalOptions,
        callback?: ModalCloseCallback,
    ): void => {
        // @ts-ignore — StateManager не типизирован
        StateManager.setState({
            modal: {
                show: true,
                element: {
                    name: title,
                    buttons: options?.buttons,
                    callback,
                },
                size: options?.size,
                zIndex: options?.zIndex,
                fullscreen: options?.fullscreen,
                hideWhenClickBackdrop: options?.hideWhenClickBackdrop,
                content,
                scrollable: options?.scrollable,
                style: options?.style,
            },
        });
    },

    hide: (callback?: ModalCloseCallback): void => {
        // @ts-ignore — StateManager не типизирован
        StateManager.setState({
            modal: {
                show: false,
                element: {
                    ...(callback ? { callback } : {}),
                    name: '',
                    buttons: undefined,
                },
            },
        });
    },
};

export default $modal;
export { $modal };
export type { ModalStore };
