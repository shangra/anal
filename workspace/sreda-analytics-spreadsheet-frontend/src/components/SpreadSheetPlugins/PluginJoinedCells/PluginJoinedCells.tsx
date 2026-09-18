import React from 'react';

import { Cell, JoinedCell, Range } from '../../AdapterSpreadSheet/models';
import { Plugin, Transaction, TransactionBuilder } from '../../AdapterSpreadSheet/plugin';
import { ColumnIndex, ICell, RowIndex } from '../../AdapterSpreadSheet/types';
import { ISpreadSheet } from '../../TableAdapters/types';
import { IconButton } from '../../UIKit/IconButton';
import { ObjectGroupIcon, ObjectUngroupIcon } from '../../UiKitIcons';
import { PLUGIN_CURSOR_CELL_KEY } from '../PluginCursorCell/constants';
import { PLUGIN_JOINED_CELLS_KEY } from './constants';
import styles from './index.module.css';
import type { PluginJoinedCellsOptions, PluginJoinedCellsState } from './types';

export class PluginJoinedCells extends Plugin<
    typeof PLUGIN_JOINED_CELLS_KEY,
    PluginJoinedCellsState,
    PluginJoinedCellsOptions
> {
    readonly key = PLUGIN_JOINED_CELLS_KEY;

    readonly initialState: PluginJoinedCellsState = { joinedCells: [] };

    // ─── СТАДИЯ 2: reducer ────────────────────────────────────────────────────

    override reducer(state: PluginJoinedCellsState, tr: Transaction): PluginJoinedCellsState {
        switch (tr.action?.type) {
            case 'JOINED_CELLS_SET':
                return { ...state, joinedCells: tr.action!.payload };

            default:
                return state;
        }
    }

    override getTableAdapterProps(state: PluginJoinedCellsState): Partial<ISpreadSheet> {
        return { joinedCells: state.joinedCells };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private _ranges(): Range[] {
        return this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY)?.ranges ?? [];
    }

    private canJoinedCells(): boolean {
        const rs = this._ranges();
        return rs.length > 0 && !rs.some((r) => r.size < 2);
    }

    private canSplitCells(): boolean {
        const rs = this._ranges();
        if (!rs.length) return false;
        const { joinedCells: jcs } = this.getState();
        return rs.some((r) => jcs.some((jc) => jc.range.intersects(r)));
    }

    /**
     * Проверяет диапазоны и очищает диапазоны кроме верхней левой.
     * Возвращает false если пользователь отменил confirm при обнаружении второй непустой ячейки.
     */
    private _prejoinCheck(ranges: Range[], tx: TransactionBuilder): boolean {
        const dataMatrix = this.context.getData();
        let nonEmptyCount = 0;

        for (const range of ranges) {
            const tl = range.topLeft.coordinates;
            const br = range.bottomRight.coordinates;
            let topLeftCell: ICell | undefined;

            for (const [r, rowMap] of dataMatrix) {
                if (r < tl.rowIndex || r > br.rowIndex) continue;

                for (const [c, cellData] of rowMap) {
                    if (c < tl.columnIndex || c > br.columnIndex) continue;

                    if (cellData?.data != null && cellData.data !== '') {
                        nonEmptyCount++;
                        if (nonEmptyCount === 2) {
                            // eslint-disable-next-line no-restricted-globals, no-alert
                            const shouldContinue = confirm(
                                'При объединении ячеек сохранится значение только верхней левой ячейки.',
                            );
                            if (!shouldContinue) return false;
                        }
                    }

                    if (r === tl.rowIndex && c === tl.columnIndex && cellData) {
                        topLeftCell = cellData;
                    }
                }
            }

            tx.deleteRange(range);
            if (topLeftCell) {
                const row = new Map<ColumnIndex, ICell>();
                row.set(tl.columnIndex, topLeftCell);
                const cells = new Map<RowIndex, Map<ColumnIndex, ICell>>();
                cells.set(tl.rowIndex, row);
                tx.setCells(cells);
            }
        }

        return true;
    }

    // ─── Handlers ─────────────────────────────────────────────────────────────

    handleJoinSelectedCells = (): void => {
        const ranges = this._ranges();
        if (!ranges.length) return;

        const validRanges = ranges.filter((r) => r.size >= 2);

        const tx = this.context.transaction().withAction({
            type: 'JOINED_CELLS_SET',
            payload: [
                ...this.getState().joinedCells.filter((jc) => !validRanges.some((r) => jc.range.intersects(r))),
                ...validRanges.map((r) => new JoinedCell(r, new Cell(r.topLeft.coordinates))),
            ],
        });

        const hasTwoOrMoreNonEmpty = this._prejoinCheck(validRanges, tx);

        if (!hasTwoOrMoreNonEmpty) return;

        tx.commit(false);
    };

    handleSplitSelectedCells = (): void => {
        const ranges = this._ranges();
        if (!ranges.length) return;
        const { joinedCells: jcs } = this.getState();
        const filtered = jcs.filter((jc) => !ranges.some((r) => jc.range.intersects(r)));
        this.context.dispatch({ type: 'JOINED_CELLS_SET', payload: filtered });
    };

    // ─── afterTransaction ─────────────────────────────────────────────────────

    override afterTransaction(
        _tr: Transaction,
        _prevState: PluginJoinedCellsState,
        _nextState: PluginJoinedCellsState,
    ): void {}

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        const { joinedCells: jcs } = this.getState();
        const hasJoinedCells = jcs.length > 0;

        return (
            <div className={styles.container}>
                <IconButton
                    color="controlled"
                    title="Объединить ячейки"
                    icon={ObjectGroupIcon}
                    disabled={!this.canJoinedCells()}
                    onClick={this.handleJoinSelectedCells}
                />
                <IconButton
                    color="controlled"
                    title="Разъединить ячейки"
                    icon={ObjectUngroupIcon}
                    disabled={!this.canSplitCells() || !hasJoinedCells}
                    onClick={this.handleSplitSelectedCells}
                />
            </div>
        );
    }
}
