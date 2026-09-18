import React from 'react';

import { ContextMenu } from '../../AdapterSpreadSheet/components/ContextMenu';
import { Cell } from '../../AdapterSpreadSheet/models';
import { Plugin, Transaction } from '../../AdapterSpreadSheet/plugin';
import { ContextMenuContext, TContextMenuItem } from '../../AdapterSpreadSheet/types';
import { CONTEXT_MENU_ACTION, PLUGIN_CONTEXT_MENU_KEY } from './constants';

export interface PluginContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    /** Ячейка, на которой открыли меню — нужна для контекста item'ов */
    cell: Cell | null;
}

export class PluginContextMenu extends Plugin<typeof PLUGIN_CONTEXT_MENU_KEY, PluginContextMenuState> {
    readonly key = PLUGIN_CONTEXT_MENU_KEY;

    readonly initialState: PluginContextMenuState = {
        visible: false,
        x: 0,
        y: 0,
        cell: null,
    };

    // ── reducer ───────────────────────────────────────────────────────────────

    override reducer(state: PluginContextMenuState, tr: Transaction): PluginContextMenuState {
        const { action } = tr;

        if (action?.type === 'CONTEXT_MENU') {
            const { x, y, cell } = action.payload;
            if (cell.coordinates.columnIndex === -1 && cell.coordinates.rowIndex === -1) {
                return state;
            }
            return { ...state, visible: true, x, y, cell };
        }

        if (action?.type === CONTEXT_MENU_ACTION.CLOSE) {
            return { ...state, visible: false, cell: null };
        }

        // Закрываем при клике по ячейке
        if ((action?.type === 'CELL_MOUSE_DOWN' || action?.type === 'ROOT_MOUSE_DOWN') && state.visible) {
            return { ...state, visible: false, cell: null };
        }

        return state;
    }

    // ── render ────────────────────────────────────────────────────────────────

    /**
     * render() вызывается ПОСЛЕ полного drain-цикла (через React re-render),
     * поэтому cursor и другие плагины уже в финальном состоянии.
     * Именно здесь корректно собирать items.
     */
    override render(): React.ReactElement {
        const { visible, x, y, cell } = this.getState();

        // Собираем items только когда меню видимо и есть ячейка
        let items: TContextMenuItem[] = [];
        if (visible && cell) {
            const ctx: ContextMenuContext = { type: 'cell', cell, x, y };
            const currentStates = this.context.snapshotPluginStates();
            items = this.context
                .getPlugins()
                .flatMap(
                    (p: any) => (p.getContextMenuItems?.(currentStates[p.key as string], ctx) ?? []) as TContextMenuItem[],
                );
        }

        return (
            <ContextMenu
                visible={visible}
                x={x}
                y={y}
                items={items}
                onClose={() => this.context.dispatch({ type: CONTEXT_MENU_ACTION.CLOSE }, { skipHistory: true })}
            />
        );
    }
}
