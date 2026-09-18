import React from 'react';
import { FullSizeOffIcon, FullSizeOnIcon } from 'ui-kit';

import { Plugin, Transaction } from '../../AdapterSpreadSheet/plugin';
import { IconButton } from '../../UIKit/IconButton';
import { FULLSCREEN_ACTIONS, PLUGIN_FULLSCREEN_KEY } from './constants';
import { PluginFullscreenOptions, PluginFullscreenState } from './types';

export class PluginFullscreen extends Plugin<typeof PLUGIN_FULLSCREEN_KEY, PluginFullscreenState, PluginFullscreenOptions> {
    readonly key = PLUGIN_FULLSCREEN_KEY;

    readonly initialState: PluginFullscreenState = { fullscreen: false };

    // containerRef приходит через options при регистрации плагина:
    // plugins={{ fullscreen: { plugin: new PluginFullscreen(), options: { containerRef } } }}
    private get _containerRef(): React.RefObject<HTMLElement> {
        return (this.options as PluginFullscreenOptions).containerRef;
    }

    // ─── СТАДИЯ 2: reducer ────────────────────────────────────────────────────

    override reducer(state: PluginFullscreenState, tr: Transaction): PluginFullscreenState {
        switch (tr.action?.type) {
            case FULLSCREEN_ACTIONS.TOGGLE:
                return { fullscreen: tr.action.payload };
            default:
                return state;
        }
    }

    // ─── Handler ──────────────────────────────────────────────────────────────

    onClick = (fullscreen: boolean): void => {
        this.context.dispatch({ type: FULLSCREEN_ACTIONS.TOGGLE, payload: fullscreen });

        if (!fullscreen && document.fullscreenElement) {
            document.exitFullscreen();
            document.getElementById('fullscreen-portals')?.remove();
            return;
        }

        this._containerRef.current?.requestFullscreen()?.catch((err) => {
            console.error(`Error enabling fullscreen: ${err.message}`);
        });
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        const { fullscreen } = this.getState();

        return (
            <IconButton
                icon={fullscreen ? FullSizeOffIcon : FullSizeOnIcon}
                color="secondary"
                title="Развернуть на весь экран"
                onClick={() => this.onClick(!fullscreen)}
            />
        );
    }
}
