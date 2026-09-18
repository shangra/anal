import React from 'react';
import { Typography } from 'ui-kit';

import { Plugin, Transaction } from '../../AdapterSpreadSheet/plugin';
import { PLUGIN_CURSOR_CELL_KEY } from '../PluginCursorCell/constants';
import { DEFAULT_NUMBER_DECIMAL_PLACES, PLUGIN_QUICK_CALC_KEY } from './constants';
import styles from './styles.module.css';
import { PluginQuickCalculationOptions, PluginQuickCalculationState } from './types';

export class PluginQuickCalculation extends Plugin<
    typeof PLUGIN_QUICK_CALC_KEY,
    PluginQuickCalculationState,
    PluginQuickCalculationOptions
> {
    readonly key = PLUGIN_QUICK_CALC_KEY;

    // Нет собственного изменяемого состояния — всё из CorePlugin
    readonly initialState: PluginQuickCalculationState = {};

    override reducer(state: PluginQuickCalculationState, _tr: Transaction): PluginQuickCalculationState {
        return state;
    }

    // ─── Вычисления ───────────────────────────────────────────────────────────

    private _calculate() {
        const ranges = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY)?.ranges ?? [];

        const EMPTY = { SUM: 0, COUNT: 0, AVG: 0, MIN: Infinity, MAX: -Infinity };
        if (!ranges.length) return EMPTY;

        const matrix = this.context.getData();
        const values: number[] = [];

        for (const range of ranges) {
            const { rowIndex: minRow, columnIndex: minCol } = range.topLeft.coordinates;
            const { rowIndex: maxRow, columnIndex: maxCol } = range.bottomRight.coordinates;

            for (const [rowIndex, rowMap] of matrix) {
                if (rowIndex < minRow || rowIndex > maxRow) continue;
                for (const [columnIndex, cell] of rowMap) {
                    if (columnIndex < minCol || columnIndex > maxCol) continue;
                    if (cell.data == null || cell.data === '') continue;
                    const n = Number(String(cell.data).replaceAll(',', '.').replaceAll(/\s/g, ''));
                    if (!Number.isNaN(n)) values.push(n);
                }
            }
        }

        const totalCount = ranges.reduce((acc, r) => acc + r.size, 0);

        let SUM = 0;
        let MIN = Infinity;
        let MAX = -Infinity;
        for (const v of values) {
            SUM += v;
            if (v < MIN) MIN = v;
            if (v > MAX) MAX = v;
        }

        const fix = (n: number) => (Number.isFinite(n) ? parseFloat(n.toFixed(DEFAULT_NUMBER_DECIMAL_PLACES)) : n);

        return {
            SUM: fix(SUM),
            COUNT: fix(totalCount),
            AVG: totalCount ? fix(SUM / totalCount) : 0,
            MIN: fix(MIN),
            MAX: fix(MAX),
        };
    }

    private _fmt = (n: number): string => n.toLocaleString('ru-RU');

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        const { SUM, COUNT, AVG, MIN, MAX } = this._calculate();

        const values = [
            { label: 'Сумма', value: this._fmt(SUM) },
            { label: 'Количество', value: this._fmt(COUNT) },
            { label: 'Среднее', value: this._fmt(AVG) },
            { label: 'Минимум', value: MIN === Infinity ? '0' : this._fmt(MIN) },
            { label: 'Максимум', value: MAX === -Infinity ? '0' : this._fmt(MAX) },
        ];

        return (
            <div
                style={{ display: 'flex', gap: 8, flexGrow: 1, flexShrink: 0, justifyContent: 'center', alignItems: 'center' }}
            >
                {values.map(({ label, value }) => (
                    <Typography key={label} className={styles['quick-calculation-item']} color="secondary">
                        {label}{' '}
                        <Typography color="primary" style={{ display: 'inline' }}>
                            {value}
                        </Typography>
                    </Typography>
                ))}
            </div>
        );
    }
}
