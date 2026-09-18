import type { ReactNode } from 'react';
import StateManager from 'lite-react-statemanager';
import { v4 as uuidv4 } from 'uuid';
import type { PanelPosition } from 'components/WindowsCMP/interfaces';

export type WindowCloseCallback = () => void;

export type WindowTitle = ReactNode;

export type WindowContent = ReactNode;

export type WindowType = 'setting' | 'tab';

export interface OpenWindowOptions {
    uuid?: string | null;
    width?: string;
    height?: string;
    position?: PanelPosition;
    type?: WindowType;
    portal?: Element | null;
    onClose?: WindowCloseCallback;
    isMinimized?: boolean;
}

interface WindowRegistryEntry {
    key: string;
    title: WindowTitle;
    style: { width: string; height: string };
    content: WindowContent;
    callback?: WindowCloseCallback;
    portal?: Element | null;
    onClose?: WindowCloseCallback;
    position?: PanelPosition;
    type?: WindowType;
}

export interface WindowsHelper {
    open: (
        title: WindowTitle,
        content: WindowContent,
        options?: OpenWindowOptions,
        callback?: WindowCloseCallback,
    ) => string;
    close: (uuid: string | null | undefined, callback?: WindowCloseCallback) => void;
    removeRegistry: (uuid: string | null | undefined) => void;
    rename: (uuid: string, title: string) => void;
    focus: (uuid: string) => void;
}

const __windowsRegistry = new Map<string, WindowRegistryEntry>();

const $windows: WindowsHelper = {
    open: (title, content, options = {}, callback = undefined) => {
        const uuid = options.uuid ?? uuidv4();
        const payload: WindowRegistryEntry = {
            key: uuid,
            title,
            style: { width: options.width ?? '600px', height: options.height ?? '350px' },
            content,
            callback,
            portal: options.portal,
            onClose: options.onClose,
            position: options.position,
            type: options.type,
        };

        __windowsRegistry.set(uuid, payload);

        StateManager.setState({ windows: payload });
        return uuid;
    },

    close: (uuid, callback) => {
        if (!uuid) return;
        __windowsRegistry.delete(uuid);
        StateManager.setState({
            windows: {
                key: uuid,
                close: true,
                callback,
            },
        });
    },

    removeRegistry: (uuid) => {
        if (!uuid) {
            return;
        }
        if (__windowsRegistry.has(uuid)) {
            __windowsRegistry.delete(uuid);
        }
    },

    rename: (uuid, title) => {
        if (!uuid) return;
        const prev = __windowsRegistry.get(uuid);
        if (!prev) {
            return;
        }
        if (prev.title === title) return;

        const next = { ...prev, title };
        __windowsRegistry.set(uuid, next);
        StateManager.setState({ windows: next });
    },

    focus: (uuid) => {
        if (!uuid || !__windowsRegistry.has(uuid)) return;

        const win = __windowsRegistry.get(uuid);
        StateManager.setState({ windows: { ...win } });
    }
};

export default $windows;
