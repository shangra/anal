import dayjs from 'dayjs';
import React, { ReactElement } from 'react';
import { FotIcon, IconButton, PercentIcon, Select, SelectOption } from 'ui-kit';

import { Cell } from '../../AdapterSpreadSheet/models';
import { Plugin, SpreadsheetAction, Transaction, TransactionBuilder } from '../../AdapterSpreadSheet/plugin';
import { CellDataType, ObjectIndexes } from '../../AdapterSpreadSheet/types';
import { NumberFormatIcon, PrecisionDigitDownIcon, PrecisionDigitUpIcon } from '../../UiKitIcons';
import { CELL_FORMATTING_ACTION, PLUGIN_CELL_FORMATTING_KEY } from './constants';
import { CellFormattingType, CellFormattingTypeNames, PluginCellFormattingOptions, PluginCellFormattingState } from './types';
import { formatNumeric, GROUPING_FORMATTING_TYPES, isNumericFormat, normalizeNumericString } from './utils';

export class PluginCellFormatting extends Plugin<
    typeof PLUGIN_CELL_FORMATTING_KEY,
    PluginCellFormattingState,
    PluginCellFormattingOptions
> {
    readonly key = PLUGIN_CELL_FORMATTING_KEY;

    readonly initialState: PluginCellFormattingState = {};

    private static readonly FORMAT_OPTIONS: SelectOption<string>[] = Object.keys(CellFormattingType).map((t) => ({
        label: CellFormattingTypeNames[t as keyof typeof CellFormattingTypeNames],
        value: t,
    }));

    // ─── Reducer ─────────────────────────────────────────────────────────────

    override reducer(state: PluginCellFormattingState, tr: Transaction): PluginCellFormattingState {
        switch (tr.action?.type) {
            default:
                return state;
        }
    }

    override appendTransaction(
        tr: Transaction,
        _prevState: PluginCellFormattingState,
        _nextState: PluginCellFormattingState,
    ):
        | SpreadsheetAction
        | SpreadsheetAction[]
        | TransactionBuilder
        | TransactionBuilder[]
        | (SpreadsheetAction | TransactionBuilder)[]
        | null {
        if (tr.action?.type !== CELL_FORMATTING_ACTION.FORMAT_PAINTER_APPLY) return null;

        const { ranges, config } = tr.action.payload;
        if (!config) return null;

        const tx = this.context.transaction();
        for (const range of ranges) {
            // Полная замена формата источника (не merge)
            tx.clearPluginConfigInRange(range, this.key);
            tx.setPluginConfigRange(range, this.key, config, false);
        }

        return tx;
    }

    // ─── getCellDisplay ───────────────────────────────────────────────────────

    override getCellDisplay(_state: PluginCellFormattingState, cell: ObjectIndexes, raw: CellDataType): string | undefined {
        const config = this.context.getCellPluginConfig(
            new Cell({ rowIndex: cell.rowIndex, columnIndex: cell.columnIndex }),
            this.key,
        );

        if (!config?.format || config.format === CellFormattingType.default) {
            // Для Общего формата форматируем число, только если включена группировка
            // или явно настроена разрядность (иначе возвращаем сырое значение).
            const hasExplicitDecimalPlaces = config?.decimalPlaces != null;
            if (config?.useGrouping || hasExplicitDecimalPlaces) {
                const normalized = normalizeNumericString(raw);
                if (raw == null || Number.isNaN(Number(normalized))) return undefined;

                return formatNumeric(Number(normalized), CellFormattingType.default, {
                    decimalPlaces: config?.decimalPlaces ?? 2,
                    useGrouping: config?.useGrouping ?? false,
                });
            }
            return undefined;
        }

        if (isNumericFormat(config.format)) {
            const normalized = normalizeNumericString(raw);
            if (raw == null || Number.isNaN(Number(normalized))) return undefined;

            return formatNumeric(Number(normalized), config.format, {
                decimalPlaces: config.decimalPlaces ?? 2,
                useGrouping: config.useGrouping,
            });
        }

        return this._formatNonNumeric(raw, config.format);
    }

    private _formatNonNumeric(data: CellDataType, format: CellFormattingType): string {
        switch (format) {
            case CellFormattingType.date:
                return dayjs(String(data)).format('DD.MM.YYYY');
            case CellFormattingType.datetime:
                return dayjs(String(data)).format('DD.MM.YYYY HH:mm:ss');
            case CellFormattingType.text:
                return String(data ?? '');
            default:
                return String(data ?? '');
        }
    }

    // ─── Обновление формата диапазона ─────────────────────────────────────────

    setFormat = (format: CellFormattingType): void => {
        const ranges = this.context.getPluginState('PluginCursorCell')?.ranges ?? [];
        if (!ranges.length) return;
        const config = { format };
        const tx = this.context.transaction();

        for (const range of ranges) tx.setPluginConfigRange(range, this.key, config, false);
        tx.commit();
    };

    setDecimalPlaces = (delta: 1 | -1): void => {
        const ranges = this.context.getPluginState('PluginCursorCell')?.ranges ?? [];
        if (!ranges.length) return;

        const cursor = this._getCursor();
        if (!cursor) return;

        // Как в Excel: отталкиваемся от активной (курсорной) ячейки и применяем результат ко всему диапазону
        const cursorConfig = this.context.getCellPluginConfig(cursor, this.key);
        const next = Math.min(30, Math.max(0, (cursorConfig?.decimalPlaces ?? 2) + delta));

        const tx = this.context.transaction();

        for (const range of ranges) {
            tx.setPluginConfigRange(range, this.key, { decimalPlaces: next }, false);
        }
        tx.commit();
    };

    /** Переключает показ разделителей разрядов (группировку) */
    toggleGrouping = (): void => {
        const cursor = this._getCursor();
        if (!cursor) return;

        const ranges = this.context.getPluginState('PluginCursorCell')?.ranges ?? [];
        if (!ranges.length) return;

        // Берём useGrouping с курсорной ячейки, инвертируем и применяем ко всем ячейкам диапазона
        const currentConfig = this.context.getCellPluginConfig(cursor, this.key);
        const cursorFormat = currentConfig?.format ?? CellFormattingType.default;
        const defaultValue =
            cursorFormat === CellFormattingType.default ? false : GROUPING_FORMATTING_TYPES.includes(cursorFormat);
        const next = !(currentConfig?.useGrouping ?? defaultValue);

        const tx = this.context.transaction();

        for (const range of ranges) {
            tx.setPluginConfigRange(range, this.key, { useGrouping: next }, false);
        }
        tx.commit();
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    private _getCursor(): Cell | null {
        const state = this.context.getPluginState('PluginCursorCell');
        if (!state?.ranges?.length) return null;
        const active = state.ranges[state.activeRangeIndex] ?? state.ranges[state.ranges.length - 1];
        return active?.cursor ?? null;
    }

    override render(): ReactElement {
        const cursor = this._getCursor();

        // Конфиг курсорной (активной) ячейки — источник отображаемых значений для всей панели
        const config = cursor ? this.context.getCellPluginConfig(cursor, this.key) : undefined;

        const resolvedFormat = config?.format ?? CellFormattingType.default;
        const currentDecimalPlaces = config?.decimalPlaces ?? 2;
        const currentUseGrouping =
            config?.useGrouping ??
            (resolvedFormat === CellFormattingType.default ? false : GROUPING_FORMATTING_TYPES.includes(resolvedFormat));
        const currentIsMoneyFormat = resolvedFormat === CellFormattingType.money;
        const currentIsPercentFormat = resolvedFormat === CellFormattingType.percent;

        const formatOptions = PluginCellFormatting.FORMAT_OPTIONS;

        return (
            <>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {/* Выбор формата */}
                    <Select
                        resettable
                        options={formatOptions}
                        value={resolvedFormat}
                        onChange={(v) => this.setFormat((v as CellFormattingType) ?? resolvedFormat)}
                        disabled={!cursor}
                        style={{ width: 176 }}
                        hasSearch={false}
                    />
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <IconButton
                        icon={FotIcon}
                        title="Денежный формат"
                        variant={currentIsMoneyFormat ? 'contained' : 'outlined'}
                        onClick={() => this.setFormat(CellFormattingType.money)}
                        disabled={!cursor}
                    />
                    <IconButton
                        icon={PercentIcon}
                        title="Процентный формат"
                        variant={currentIsPercentFormat ? 'contained' : 'outlined'}
                        onClick={() => this.setFormat(CellFormattingType.percent)}
                        disabled={!cursor}
                    />
                    <IconButton
                        icon={NumberFormatIcon}
                        title="Формат с разделителями"
                        onClick={() => this.toggleGrouping()}
                        variant={currentUseGrouping ? 'contained' : 'outlined'}
                        disabled={!cursor}
                    />
                    {/* Знаки после запятой */}
                    <IconButton
                        icon={PrecisionDigitUpIcon}
                        title="Увеличить разрядность"
                        onClick={() => this.setDecimalPlaces(1)}
                        disabled={
                            !cursor ||
                            (!isNumericFormat(resolvedFormat) && resolvedFormat !== CellFormattingType.default) ||
                            currentDecimalPlaces >= 30
                        }
                    />
                    <IconButton
                        icon={PrecisionDigitDownIcon}
                        title="Уменьшить разрядность"
                        onClick={() => this.setDecimalPlaces(-1)}
                        disabled={
                            !cursor ||
                            (!isNumericFormat(resolvedFormat) && resolvedFormat !== CellFormattingType.default) ||
                            currentDecimalPlaces <= 0
                        }
                    />
                </div>
            </>
        );
    }
}
