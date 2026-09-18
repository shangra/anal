import { Plugin, SpreadsheetAction, Transaction } from '../../AdapterSpreadSheet/plugin';
import { ContextMenuContext, TContextMenuItem } from '../../AdapterSpreadSheet/types';
import { ISpreadSheet } from '../../TableAdapters/types';
import { PLUGIN_CURSOR_CELL_KEY } from '../PluginCursorCell/constants';
import { PLUGIN_FROZEN_PANES_KEY } from './constants';
import { PluginFrozenPanesOptions, PluginFrozenPanesState } from './types';

export class PluginFrozenPanes extends Plugin<
    typeof PLUGIN_FROZEN_PANES_KEY,
    PluginFrozenPanesState,
    PluginFrozenPanesOptions
> {
    readonly key = PLUGIN_FROZEN_PANES_KEY;

    readonly initialState: PluginFrozenPanesState = { frozenRows: 0, frozenColumns: 0 };

    // ─── СТАДИЯ 1: collectVeto ──────────────────────────────────────────

    override collectVeto(_tr: Transaction, _state: PluginFrozenPanesState): string | null {
        return null; // не блокируем
    }

    // ─── СТАДИЯ 2: reducer ────────────────────────────────────────────────────

    override reducer(state: PluginFrozenPanesState, tr: Transaction): PluginFrozenPanesState {
        const { action } = tr;
        switch (action?.type) {
            case 'FREEZE_PANES':
                return {
                    frozenRows: action.payload.frozenRows,
                    frozenColumns: action.payload.frozenColumns,
                };

            case 'UNFREEZE_PANES':
                return { frozenRows: 0, frozenColumns: 0 };

            default:
                return state;
        }
    }

    // ─── Приватные вспомогательные методы ─────────────────────────────────────

    private _freezePanes = (rowIndex?: number, columnIndex?: number): void => {
        const cursor = this.context.getPlugin(PLUGIN_CURSOR_CELL_KEY)!.cursor?.cell;
        const frozenRows = rowIndex ?? cursor?.coordinates.rowIndex ?? 0;
        const frozenColumns = columnIndex ?? cursor?.coordinates.columnIndex ?? 0;
        this.context.dispatch({ type: 'FREEZE_PANES', payload: { frozenRows, frozenColumns } });
    };

    private _unfreezePanes = (): void => this.context.dispatch({ type: 'UNFREEZE_PANES' });

    // ─── СТАДИЯ 3: appendTransaction ─────────────────────────────────────────

    override appendTransaction(
        _tr: Transaction,
        _prevState: PluginFrozenPanesState,
        _nextState: PluginFrozenPanesState,
    ): SpreadsheetAction | SpreadsheetAction[] | null {
        return null;
    }

    override getContextMenuItems(state: PluginFrozenPanesState, ctx: ContextMenuContext): TContextMenuItem[] {
        const { rowIndex, columnIndex } = ctx.cell.coordinates;
        const isCell = columnIndex !== -1 && rowIndex !== -1;
        if (!isCell) return [];

        const { frozenRows, frozenColumns } = state;

        const items: TContextMenuItem[] = [];
        const hasFrozen = frozenRows > 0 || frozenColumns > 0;
        if (hasFrozen) {
            items.push(
                { label: 'Снять закрепление областей', action: () => this._unfreezePanes(), disabled: false },
                { divider: true },
            );
        } else {
            items.push(
                {
                    label: 'Закрепить области',
                    action: () => this._freezePanes(rowIndex, columnIndex),
                    disabled: false,
                },
                { label: 'Закрепить строки', action: () => this._freezePanes(rowIndex, 0), disabled: false },
                { label: 'Закрепить столбцы', action: () => this._freezePanes(0, columnIndex), disabled: false },
                { divider: true },
            );
        }
        return items;
    }

    override getTableAdapterProps(state: PluginFrozenPanesState): Partial<ISpreadSheet> {
        const { frozenRows, frozenColumns } = state;
        return { frozenRows, frozenColumns };
    }
}
