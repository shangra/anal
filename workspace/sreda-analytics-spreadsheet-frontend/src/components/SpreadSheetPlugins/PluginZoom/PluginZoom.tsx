import React, { ChangeEvent } from 'react';
import { Input, MinusOutlineIcon, PlusOutlineIcon } from 'ui-kit';

import { Plugin, Transaction } from '../../AdapterSpreadSheet/plugin';
import { debounce } from '../../AdapterSpreadSheet/utils';
import { ISpreadSheet } from '../../TableAdapters/types';
import { IconButton } from '../../UIKit/IconButton';
import { Slider } from '../../UIKit/Slider';
import { MAX, MIN, PLUGIN_ZOOM_KEY, ZOOM_ACTION } from './constants';
import { PluginZoomOptions, PluginZoomState } from './types';

export class PluginZoom extends Plugin<typeof PLUGIN_ZOOM_KEY, PluginZoomState, PluginZoomOptions> {
    readonly key = PLUGIN_ZOOM_KEY;

    readonly initialState: PluginZoomState = { zoom: 100, value: 100 };

    private debouncedSetZoom = debounce((zoom: number) => {
        const clamped = Math.max(MIN, Math.min(MAX, zoom));
        this.context.dispatch({ type: 'ZOOM_SET', payload: clamped });
    }, 600);

    // ─── СТАДИЯ 2: reducer ────────────────────────────────────────────────────

    override reducer(state: PluginZoomState, tr: Transaction): PluginZoomState {
        switch (tr.action?.type) {
            // Синхронизируемся с любым ZOOM_SET (от canvas onZooming ИЛИ от нас)
            case 'ZOOM_SET':
                return { zoom: tr.action.payload, value: tr.action.payload };

            // Промежуточное состояние поля ввода (value может выходить за MIN/MAX)
            case ZOOM_ACTION.INPUT_CHANGE:
                return tr.action.payload as PluginZoomState;

            // Blur — приводим value к фактическому zoom
            case ZOOM_ACTION.BLUR:
                return { ...state, value: Math.floor(state.zoom) };

            default:
                return state;
        }
    }

    override getTableAdapterProps(state: PluginZoomState): Partial<ISpreadSheet> {
        return { zoom: state.zoom };
    }

    // ─── Handlers ─────────────────────────────────────────────────────────────

    onChangeZoom = (zoom: number): void => {
        const clamped = parseInt(Math.max(MIN, Math.min(MAX, zoom)).toString(), 10);
        // ZOOM_SET обработает CorePlugin (обновит core.zoom) + наш reducer (sync)
        this.debouncedSetZoom.cancel();
        this.context.dispatch({ type: 'ZOOM_SET', payload: clamped });
    };

    onChangeInputZoom = (e: ChangeEvent<HTMLInputElement>): void => {
        const rawValue = e.target.value.replace(/[^0-9.]/g, '');
        const value = parseInt(rawValue || '0', 10);

        // Обновляем только отображаемое значение в стейте, не трогая фактический зум сразу
        // Это позволяет пользователю ввести цифры по очереди, не упираясь в мин. лимит
        this.context.dispatch({
            type: ZOOM_ACTION.INPUT_CHANGE,
            payload: { zoom: this.getState().zoom, value },
        });

        this.debouncedSetZoom(value);
    };

    onBlur = (): void => {
        this.debouncedSetZoom.flush();

        const { zoom } = this.getState();
        this.context.dispatch({
            type: ZOOM_ACTION.INPUT_CHANGE,
            payload: { zoom, value: Math.floor(zoom) },
        });

        this.context.dispatch({ type: ZOOM_ACTION.BLUR });
    };

    override onUnmount(): void {
        this.debouncedSetZoom.cancel();
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        const { zoom, value } = this.getState();

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconButton
                    icon={MinusOutlineIcon}
                    variant="text"
                    size="small"
                    color="secondary"
                    onClick={() => this.onChangeZoom(zoom - 10)}
                />
                <Slider
                    color="secondary"
                    min={MIN}
                    max={MAX}
                    value={zoom}
                    onChange={(v: number) => this.onChangeZoom(v)}
                    // @ts-expect-error
                    style={{ width: 100, margin: 0 }}
                />
                <IconButton
                    icon={PlusOutlineIcon}
                    variant="text"
                    size="small"
                    color="secondary"
                    onClick={() => this.onChangeZoom(zoom + 10)}
                />
                <Input
                    style={{ width: 56 }}
                    variant="outlined"
                    value={`${value}%`}
                    onChange={this.onChangeInputZoom}
                    onBlur={this.onBlur}
                />
            </div>
        );
    }
}
