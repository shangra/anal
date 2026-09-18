import React from 'react';
import { v4 as uuidv4 } from 'uuid';

import { DEFAULT_SPREAD_SHEET_ID } from '../../AdapterSpreadSheet/constants';
import { Cell, Range } from '../../AdapterSpreadSheet/models';
import { Plugin, SpreadsheetAction, Transaction } from '../../AdapterSpreadSheet/plugin';
import { CellDataType, ColumnIndex, RowIndex } from '../../AdapterSpreadSheet/types';
import { LineComputedDataProps } from '../../ChartGenerationCMP/src/types';
import $windows from '../../ui/windows.helper';
import { IconButton } from '../../UIKit/IconButton';
import { DiagramIcon } from '../../UiKitIcons';
import { PLUGIN_CURSOR_CELL_KEY } from '../PluginCursorCell/constants';
import { ChartWindow } from './components/ChartWindow';
import { PLUGIN_CHART_GENERATION_KEY } from './constants';
import { PluginChartGenerationOptions, PluginChartGenerationState } from './types';
import { parseRangesForChart } from './utils';

export class PluginChartGeneration extends Plugin<
    typeof PLUGIN_CHART_GENERATION_KEY,
    PluginChartGenerationState,
    PluginChartGenerationOptions
> {
    // ─── Слайс ───────────────────────────────────────────────────────────────

    readonly key = PLUGIN_CHART_GENERATION_KEY;

    readonly initialState: PluginChartGenerationState = {
        chartData: null,
        charts: {},
    };

    // ─── Reducer ─────────────────────────────────────────────────────────────

    override reducer(state: PluginChartGenerationState, tr: Transaction): PluginChartGenerationState {
        switch (tr.action?.type) {
            // ── Данные графика ────────────────────────────────────────────────
            case 'CHART_DATA_UPDATE':
                return { ...state, chartData: tr.action.payload.chartData };

            // ── Управление окнами ─────────────────────────────────────────────
            case 'CHART_CREATE':
                return {
                    ...state,
                    charts: {
                        ...state.charts,
                        [tr.action.payload.uuid]: { meta: null },
                    },
                };

            case 'CHART_META_UPDATE':
                return {
                    ...state,
                    charts: {
                        ...state.charts,
                        [tr.action.payload.uuid]: { meta: tr.action.payload.meta },
                    },
                };

            case 'CHART_REMOVE': {
                const { [tr.action.payload.uuid]: _removed, ...rest } = state.charts;
                return { ...state, charts: rest };
            }

            default:
                return state;
        }
    }

    // ─── appendTransaction: реактивное обновление данных графика ─────────────

    /**
     * Стадия 3 транзакционного цикла.
     *
     * Отслеживает:
     *   • изменения выделения (RANGES_SET, RANGE_ADD, RANGE_DRAG_END) ->
     *     пересчитывает данные из новых диапазонов
     *   • изменения ячеек (CELLS_SET, CELL_DATA_SET) ->
     *     пересчитывает только если изменённые ячейки попадают в текущее выделение
     *
     * Оптимизация: пересчёт не запускается если нет открытых окон графиков.
     */
    override appendTransaction(
        tr: Transaction,
        _prevState: PluginChartGenerationState,
        nextState: PluginChartGenerationState,
    ): SpreadsheetAction[] | SpreadsheetAction | null {
        if (!Object.keys(nextState.charts).length) return null;

        const { action } = tr;
        if (!action) return null;

        const { type } = action;

        const isSelectionChange =
            type === 'RANGES_SET' || type === 'RANGE_ADD' || type === 'RANGE_DRAG_END' || type === 'CELL_EDIT_END';

        // Детектируем изменения данных через getDataChanges() — реагируем на
        // любой источник (bulk set, paste, delete, fill, формулы и т.д.)
        const dataChanges = tr.getDataChanges();
        const isDataChange = dataChanges.length > 0;

        if (!isSelectionChange && !isDataChange) return null;

        const ranges = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY)?.ranges ?? [];

        if (isDataChange && ranges.length > 0) {
            // Преобразуем DataChange[] в Map для _doesDataOverlapRanges
            const changed = new Map<number, Map<number, null>>();
            for (const { rowIndex, columnIndex } of dataChanges) {
                if (!changed.has(rowIndex)) changed.set(rowIndex, new Map());
                changed.get(rowIndex)!.set(columnIndex, null);
            }
            if (!this._doesDataOverlapRanges(changed, ranges)) return null;
        }

        const chartData = this._computeChartData(ranges);
        return { type: 'CHART_DATA_UPDATE', payload: { chartData } };
    }

    // ─── Приватные методы вычисления ─────────────────────────────────────────

    /**
     * Вычисляет данные для графика из массива диапазонов.
     * Читает данные через context.getCellAt() (mutable data matrix).
     * Вызывается ПОСЛЕ мутации матрицы в AdapterSpreadSheet.
     */
    private _computeChartData(ranges: Range[]): LineComputedDataProps | null {
        if (!ranges.length) return null;

        const allData: (CellDataType | null)[][] = ranges.flatMap((range) => this._getRangeData(range));

        // Для построения графика нужен хотя бы заголовок + одна строка данных
        if (allData.length < 2) return null;

        return parseRangesForChart(allData);
    }

    /**
     * Считывает данные одного диапазона в виде двумерного массива.
     *
     * Null-значения сохраняют позиции (не пропускаются через continue),
     * что гарантирует корректное соответствие индексов при парсинге:
     *   col 0 -> имя серии / угловая ячейка
     *   col N -> значения / категории
     */
    private _getRangeData(range: Range): (CellDataType | null)[][] {
        const { topLeft, bottomRight } = range;
        const result: (CellDataType | null)[][] = [];

        for (let row = topLeft.coordinates.rowIndex; row <= bottomRight.coordinates.rowIndex; row++) {
            const rowData: (CellDataType | null)[] = [];

            for (let col = topLeft.coordinates.columnIndex; col <= bottomRight.coordinates.columnIndex; col++) {
                const cell = this.context.getCellAt(new Cell({ rowIndex: row, columnIndex: col }));
                const raw = cell?.data ?? null;
                // Нормализуем пустые строки в null для единообразия
                rowData.push(raw === '' ? null : (raw as CellDataType));
            }

            result.push(rowData);
        }

        return result;
    }

    /**
     * Проверяет, пересекаются ли изменённые ячейки с текущим выделением.
     * Используется для оптимизации: пересчёт при CELLS_SET только при необходимости.
     */
    private _doesDataOverlapRanges(data: Map<RowIndex, Map<ColumnIndex, any>>, ranges: Range[]): boolean {
        for (const [rowIndex, row] of data) {
            for (const [columnIndex] of row) {
                const cell = new Cell({ rowIndex, columnIndex });
                if (ranges.some((r) => r.contains(cell))) return true;
            }
        }
        return false;
    }

    // ─── Обработчик создания графика ─────────────────────────────────────────

    private _handleCreateChart = (): void => {
        const { chartData } = this.getState();

        // Нужна хотя бы одна серия данных
        if (!chartData || !chartData.itemsData.length) return;

        const uuid = uuidv4();
        const spreadSheetId = (this.options as PluginChartGenerationOptions).spreadSheetId || DEFAULT_SPREAD_SHEET_ID;

        this.context.dispatch({ type: 'CHART_CREATE', payload: { uuid } });

        $windows.open('Chart', <ChartWindow uuid={uuid} spreadSheetId={spreadSheetId} />, { uuid });
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        const { chartData } = this.getState();
        const canCreate = (chartData?.itemsData?.length ?? 0) > 0;

        return (
            <IconButton
                color="controlled"
                title={canCreate ? 'Создать график' : 'Выделите диапазон данных для графика'}
                icon={DiagramIcon}
                disabled={!canCreate}
                onClick={this._handleCreateChart}
            />
        );
    }
}
