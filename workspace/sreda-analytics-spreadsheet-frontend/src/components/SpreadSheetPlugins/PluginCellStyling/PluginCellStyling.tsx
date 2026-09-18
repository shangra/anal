import React from 'react';
import { ArrowDownIcon, ArrowUpIcon, Button, ColorPicker, EnterIcon, Select } from 'ui-kit';

import { Cell, Range } from '../../AdapterSpreadSheet/models';
import { Plugin, SpreadsheetAction, Transaction } from '../../AdapterSpreadSheet/plugin';
import { ICellStyles, ObjectIndexes } from '../../AdapterSpreadSheet/types';
import { DEFAULT_FONT_SIZE } from '../../SpreadSheetTables/CanvasTable/const';
import { ISpreadSheet } from '../../TableAdapters/types';
import { IconButton } from '../../UIKit/IconButton';
import {
    AlignBottomIcon,
    AlignCenterIcon,
    AlignLeftIcon,
    AlignMiddleIcon,
    AlignRightIcon,
    AlignTopIcon,
    BorderColorIcon,
    FillTextColorIcon,
    FontBoldIcon,
    FontColorIcon,
    FontItalicIcon,
    FontStriketroughIcon,
    FontUnderlineIcon,
    FormatPainterIcon,
} from '../../UiKitIcons';
import { CELL_FORMATTING_ACTION, PLUGIN_CELL_FORMATTING_KEY } from '../PluginCellFormatting/constants';
import { PluginCellFormattingConfig } from '../PluginCellFormatting/types';
import { PLUGIN_CURSOR_CELL_KEY } from '../PluginCursorCell/constants';
import { CELL_STYLING_ACTION, CELL_STYLING_FONT_FAMILY, CELL_STYLING_FONT_SIZE, PLUGIN_CELL_STYLING_KEY } from './constants';
import styles from './styles.module.css';
import { PluginCellStylingOptions, PluginCellStylingState } from './types';

export class PluginCellStyling extends Plugin<
    typeof PLUGIN_CELL_STYLING_KEY,
    PluginCellStylingState,
    PluginCellStylingOptions
> {
    readonly key = PLUGIN_CELL_STYLING_KEY;

    readonly initialState: PluginCellStylingState = {};

    // ─── Формат по образцу ──────────

    /** Активен ли режим "Формат по образцу" */
    private _isFormatPainterActive = false;

    /** Сохранённые стили ячейки-источника */
    private _painterSourceStyles: ICellStyles | null = null;

    /** Сохранённый числовой формат ячейки-источника */
    private _painterSourceFormatConfig: PluginCellFormattingConfig | null = null;

    // ─── СТАДИЯ 1: collectVeto ──────────────────────────────────────────

    override collectVeto(_tr: Transaction, _state: PluginCellStylingState): string | null {
        return null; // не блокируем
    }

    // ─── СТАДИЯ 2: reducer ────────────────────────────────────────────────────

    override reducer(state: PluginCellStylingState, _tr: Transaction): PluginCellStylingState {
        return state; // нет стейта - нет проблем
    }

    // ─── СТАДИЯ 3: appendTransaction ─────────────────────────────────────────

    override appendTransaction(
        _tr: Transaction,
        _prevState: PluginCellStylingState,
        _nextState: PluginCellStylingState,
    ): SpreadsheetAction | null {
        return null;
    }

    // ─── getCellStyle: интеграция со SpreadsheetAdapter.getCellStyle ──────────

    override getCellStyle(_state: PluginCellStylingState, cell: ObjectIndexes): ICellStyles {
        return this.context?.styleManager?.getCellStyle(cell.rowIndex, cell.columnIndex) ?? {};
    }

    /**
     * Агрегирует стили диапазона: если ВСЕ ячейки имеют одинаковое значение свойства —
     * возвращает его; иначе — undefined (считается что "нет" для toggle-логики).
     */
    private _aggregateStyles(cellStyles: ICellStyles[]): ICellStyles {
        if (!cellStyles.length) return {};
        const result: ICellStyles = { ...cellStyles[0] };

        for (const key of Object.keys(result) as (keyof ICellStyles)[]) {
            const allSame = cellStyles.every((s) => JSON.stringify(s[key]) === JSON.stringify(result[key]));
            if (!allSame) {
                delete (result as Record<string, unknown>)[key];
            }
        }
        return result;
    }

    // ─── Формат по образцу ─────────────────────────────────────────────────

    private _toggleFormatPainter(): void {
        if (this._isFormatPainterActive) {
            // Деактивация режима
            this._isFormatPainterActive = false;
            this._painterSourceStyles = null;
            this._painterSourceFormatConfig = null;

            this.context.dispatch({ type: CELL_STYLING_ACTION.FORMAT_PAINTER_COPIED }, { skipHistory: true });
        } else {
            this._copyFormatFromCursor();
        }
    }

    /**
     * Копирует стили с текущей курсорной ячейки.
     */
    private _copyFormatFromCursor(): boolean {
        const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY);
        const ranges = cursorState?.ranges ?? [];
        if (!ranges.length) return false;

        const activeRange = ranges[cursorState?.activeRangeIndex ?? 0] ?? ranges[ranges.length - 1];
        const cursor = activeRange?.cursor;
        if (!cursor) return false;

        const { rowIndex, columnIndex } = cursor.coordinates;

        this._painterSourceStyles = this.context.styleManager.getCellStyle(rowIndex, columnIndex);
        this._painterSourceFormatConfig =
            this.context.pluginConfigManager.getPluginConfig(rowIndex, columnIndex, PLUGIN_CELL_FORMATTING_KEY) ?? null;

        this._isFormatPainterActive = true;

        this.context.dispatch({ type: CELL_STYLING_ACTION.FORMAT_PAINTER_COPIED }, { skipHistory: true });

        return true;
    }

    /**
     * Применяет сохранённое форматирование к целевым диапазонам.
     * Вызывается из afterTransaction после клика по целевой ячейке.
     */
    private _applyFormatPainter(targetRanges: Range[]): void {
        if (!this._isFormatPainterActive || !this._painterSourceStyles) return;

        const tx = this.context.transaction().withAction({
            type: CELL_FORMATTING_ACTION.FORMAT_PAINTER_APPLY,
            payload: { ranges: targetRanges, config: this._painterSourceFormatConfig },
        });

        for (const range of targetRanges) {
            // Очищаем существующие стили целевого диапазона, чтобы старый фон
            // (и другие свойства) не остались после merge в StyleManager
            tx.clearRangeStyles(range);
            // Применяем стили источника (полная замена, не merge)
            tx.setRangeStyle(range, this._painterSourceStyles);
        }

        tx.commit();

        // Сбрасываем режим (однократное применение)
        this._isFormatPainterActive = false;
        this._painterSourceStyles = null;
        this._painterSourceFormatConfig = null;

        this.context.dispatch({ type: CELL_STYLING_ACTION.FORMAT_PAINTER_COPIED }, { skipHistory: true });
    }

    /**
     * Применяет стиль к курсору и всем выделенным диапазонам.
     */
    private _applyStyle(updater: (existing: ICellStyles) => ICellStyles): void {
        const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY)!;

        const { ranges } = cursorState;
        if (!ranges.length) return;

        const tx = this.context.transaction().withAction({ type: CELL_STYLING_ACTION.STYLE_APPLIED });

        for (const range of ranges) {
            // Для одиночной ячейки — читаем её стиль
            if (range.size === 1) {
                const existing = this.getCellStyle(this.getState(), range.topLeft.coordinates);
                tx.setRangeStyle(range, updater(existing));
                continue;
            }

            // Для диапазона — применяем Excel-логику:
            // если ВСЕ ячейки имеют свойство — убираем его; иначе — устанавливаем.
            // Собираем стили всех ячеек диапазона:
            const cellStyles = range.map((cell) => this.getCellStyle(this.getState(), cell.coordinates));

            // Передаём агрегированный стиль в updater
            // (updater сам решает как интерпретировать)
            const aggregated = this._aggregateStyles(cellStyles);
            tx.setRangeStyle(range, updater(aggregated));
        }

        tx.commit();
    }

    private _getCursor(): Cell | null {
        const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY);
        const ranges = cursorState?.ranges ?? [];
        const activeRange = ranges[cursorState?.activeRangeIndex ?? 0] ?? ranges[ranges.length - 1] ?? null;
        return activeRange?.cursor ?? null;
    }

    // ─── afterTransaction ────────────────────────────────────────────────────

    override afterTransaction(tr: Transaction, _prevState: PluginCellStylingState, _nextState: PluginCellStylingState): void {
        // Если режим не активен — ничего не делаем
        if (!this._isFormatPainterActive) return;

        // Реагируем на отпускание мыши (клик или drag).
        // CELL_MOUSE_UP → PluginCursorCell.appendTransaction → RANGE_DRAG_END (в _txQueue).
        // Используем requestAnimationFrame, чтобы дождаться обработки RANGE_DRAG_END
        if (tr.action?.type !== 'CELL_MOUSE_UP') return;

        requestAnimationFrame(() => {
            const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY);
            const ranges = cursorState?.ranges ?? [];
            if (!ranges.length) return;
            this._applyFormatPainter(ranges);
        });
    }

    // ─── getTableAdapterProps ────────────────────────────────────────────────

    override getTableAdapterProps(state: PluginCellStylingState): Partial<ISpreadSheet> {
        if (this._isFormatPainterActive) {
            return { cursorStyle: 'copy' };
        }
        return {};
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    override render(): React.ReactElement {
        const cursor = this._getCursor();

        const cursorStyles = cursor
            ? this.context.styleManager.getCellStyle(cursor.coordinates.rowIndex, cursor.coordinates.columnIndex)
            : null;

        const fonts = Object.entries(CELL_STYLING_FONT_FAMILY).map(([key, value]) => ({
            value,
            label: key,
            title: key,
        }));
        const sizes = CELL_STYLING_FONT_SIZE.map((i) => ({
            value: i,
            label: String(i),
            title: String(i),
        }));
        const sizeIndex = (CELL_STYLING_FONT_SIZE as readonly number[]).indexOf(cursorStyles?.fontSize ?? DEFAULT_FONT_SIZE);

        const isBold = !!cursor && cursorStyles?.fontWeight === 'bold';
        const isItalic = !!cursor && cursorStyles?.fontStyle === 'italic';
        const isUnderline = !!cursor && !!cursorStyles?.fontDecoration?.isUnderline;
        const isStrike = !!cursor && !!cursorStyles?.fontDecoration?.isStrikeThrough;
        const isHLeft = !!cursor && cursorStyles?.horizontalAlign === 'start';
        const isHCenter = !!cursor && cursorStyles?.horizontalAlign === 'center';
        const isHRight = !!cursor && cursorStyles?.horizontalAlign === 'end';
        const isVTop = !!cursor && cursorStyles?.verticalAlign === 'start';
        const isVMid = !!cursor && cursorStyles?.verticalAlign === 'center';
        const isVBot = !!cursor && cursorStyles?.verticalAlign === 'end';

        const color = (cursorStyles?.color as string) ?? '';
        const bgColor = (cursorStyles?.backgroundColor as string) ?? '';
        const borderColor = (cursorStyles?.borderColor as string) ?? '';
        const hyphenation = cursorStyles?.hyphenation ?? 'ncrop';

        const disabled = !cursor;

        return (
            <div className={styles.block}>
                {/* ── Шрифт ── */}
                <div className={styles['block-group']}>
                    <div className={styles.block}>
                        <Select
                            options={fonts}
                            value={(cursorStyles?.fontFamily ?? 'SB Sans Text') as CELL_STYLING_FONT_FAMILY}
                            hasSearch={false}
                            style={{ width: 265 }}
                            onChange={(v: any) => this._applyStyle((s) => ({ ...s, fontFamily: v }))}
                            disabled={disabled}
                            resettable={false}
                        />
                        <Select
                            options={sizes}
                            style={{ width: 110 }}
                            hasSearch={false}
                            value={cursorStyles?.fontSize ?? DEFAULT_FONT_SIZE}
                            onChange={(v: any) => this._applyStyle((s) => ({ ...s, fontSize: v }))}
                            disabled={disabled}
                            resettable={false}
                        />
                        <div className={styles['line-group']}>
                            <IconButton
                                color="controlled"
                                title="Увеличить размер шрифта"
                                icon={ArrowUpIcon}
                                disabled={disabled}
                                onClick={() => {
                                    const clamped = Math.min(CELL_STYLING_FONT_SIZE.length - 1, sizeIndex + 1);
                                    this._applyStyle((s) => ({ ...s, fontSize: CELL_STYLING_FONT_SIZE[clamped] }));
                                }}
                            />
                            <IconButton
                                color="controlled"
                                title="Уменьшить размер шрифта"
                                icon={ArrowDownIcon}
                                disabled={disabled}
                                onClick={() => {
                                    const clamped = Math.max(0, sizeIndex - 1);
                                    this._applyStyle((s) => ({ ...s, fontSize: CELL_STYLING_FONT_SIZE[clamped] }));
                                }}
                            />
                        </div>
                    </div>

                    {/* ── Форматирование текста ── */}
                    <div className={styles.block}>
                        <div className={styles['line-group']}>
                            <IconButton
                                icon={FontBoldIcon}
                                title="Полужирный"
                                disabled={disabled}
                                variant={isBold ? 'contained' : 'outlined'}
                                onClick={() => this._applyStyle((s) => ({ ...s, fontWeight: isBold ? undefined : 'bold' }))}
                            />
                            <IconButton
                                icon={FontItalicIcon}
                                title="Курсив"
                                disabled={disabled}
                                variant={isItalic ? 'contained' : 'outlined'}
                                onClick={() => this._applyStyle((s) => ({ ...s, fontStyle: isItalic ? undefined : 'italic' }))}
                            />
                            <IconButton
                                icon={FontUnderlineIcon}
                                title="Подчеркнутый"
                                disabled={disabled}
                                variant={isUnderline ? 'contained' : 'outlined'}
                                onClick={() =>
                                    this._applyStyle((s) => ({
                                        ...s,
                                        fontDecoration: { ...(s.fontDecoration ?? {}), isUnderline: !isUnderline },
                                    }))
                                }
                            />
                            <IconButton
                                icon={FontStriketroughIcon}
                                title="Зачеркнутый"
                                disabled={disabled}
                                variant={isStrike ? 'contained' : 'outlined'}
                                onClick={() =>
                                    this._applyStyle((s) => ({
                                        ...s,
                                        fontDecoration: { ...(s.fontDecoration ?? {}), isStrikeThrough: !isStrike },
                                    }))
                                }
                            />
                        </div>

                        {/* ── Цвета ── */}
                        <div className={styles['line-group']}>
                            <ColorPicker
                                containerStyle={{ position: 'relative' }}
                                value={color}
                                onChange={(v) => this._applyStyle((s) => ({ ...s, color: v }))}
                                recentPrefix="color"
                            >
                                <IconButton icon={FontColorIcon} title="Цвет шрифта" variant="outlined" disabled={disabled} />
                                <div
                                    className={styles['selected-color']}
                                    style={{
                                        left: 1,
                                        backgroundColor: color,
                                        borderBottomLeftRadius: 'var(--ui-kit-button-border-radius)',
                                    }}
                                />
                            </ColorPicker>
                            <ColorPicker
                                containerStyle={{ position: 'relative' }}
                                value={bgColor}
                                onChange={(v) => this._applyStyle((s) => ({ ...s, backgroundColor: v }))}
                                recentPrefix="background-color"
                            >
                                <IconButton
                                    icon={FillTextColorIcon}
                                    title="Цвет заливки"
                                    variant="outlined"
                                    disabled={disabled}
                                />
                                <div className={styles['selected-color']} style={{ backgroundColor: bgColor }} />
                            </ColorPicker>
                            <ColorPicker
                                containerStyle={{ position: 'relative' }}
                                value={borderColor}
                                onChange={(v) => this._applyStyle((s) => ({ ...s, borderColor: v }))}
                                recentPrefix="border-color"
                            >
                                <IconButton
                                    icon={BorderColorIcon}
                                    title="Цвет границы"
                                    variant="outlined"
                                    disabled={disabled}
                                />
                                <div
                                    className={styles['selected-color']}
                                    style={{
                                        backgroundColor: borderColor,
                                        borderBottomRightRadius: 'var(--ui-kit-button-border-radius)',
                                    }}
                                />
                            </ColorPicker>
                            <IconButton
                                icon={FormatPainterIcon}
                                title={this._isFormatPainterActive ? 'Отменить формат по образцу' : 'Формат по образцу'}
                                variant={this._isFormatPainterActive ? 'contained' : 'outlined'}
                                disabled={disabled}
                                onClick={() => this._toggleFormatPainter()}
                                style={{ borderLeft: '0' }}
                            />
                        </div>

                        {/* ── Перенос текста ── */}
                        <Button
                            variant={hyphenation === 'ncrop' ? 'text' : 'contained'}
                            color="secondary"
                            leftIcon={EnterIcon}
                            disabled={disabled}
                            onClick={() =>
                                this._applyStyle((s) => ({
                                    ...s,
                                    hyphenation: hyphenation === 'ncrop' ? 'transfer' : 'ncrop',
                                }))
                            }
                        >
                            Переносить текст
                        </Button>
                    </div>
                </div>

                {/* ── Выравнивание ── */}
                <div className={styles['block-group']}>
                    <div className={styles.block}>
                        <div className={styles['line-group']}>
                            <IconButton
                                icon={AlignTopIcon}
                                title="По верхнему краю"
                                disabled={disabled}
                                variant={isVTop ? 'contained' : 'outlined'}
                                onClick={() => this._applyStyle((s) => ({ ...s, verticalAlign: 'start' }))}
                            />
                            <IconButton
                                icon={AlignMiddleIcon}
                                title="Посередине"
                                disabled={disabled}
                                variant={isVMid ? 'contained' : 'outlined'}
                                onClick={() => this._applyStyle((s) => ({ ...s, verticalAlign: 'center' }))}
                            />
                            <IconButton
                                icon={AlignBottomIcon}
                                title="По нижнему краю"
                                disabled={disabled}
                                variant={isVBot ? 'contained' : 'outlined'}
                                onClick={() => this._applyStyle((s) => ({ ...s, verticalAlign: 'end' }))}
                            />
                        </div>
                    </div>
                    <div className={styles.block}>
                        <div className={styles['line-group']}>
                            <IconButton
                                icon={AlignLeftIcon}
                                title="По левому краю"
                                disabled={disabled}
                                variant={isHLeft ? 'contained' : 'outlined'}
                                onClick={() => this._applyStyle((s) => ({ ...s, horizontalAlign: 'start' }))}
                            />
                            <IconButton
                                icon={AlignCenterIcon}
                                title="По центру"
                                disabled={disabled}
                                variant={isHCenter ? 'contained' : 'outlined'}
                                onClick={() => this._applyStyle((s) => ({ ...s, horizontalAlign: 'center' }))}
                            />
                            <IconButton
                                icon={AlignRightIcon}
                                title="По правому краю"
                                disabled={disabled}
                                variant={isHRight ? 'contained' : 'outlined'}
                                onClick={() => this._applyStyle((s) => ({ ...s, horizontalAlign: 'end' }))}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
