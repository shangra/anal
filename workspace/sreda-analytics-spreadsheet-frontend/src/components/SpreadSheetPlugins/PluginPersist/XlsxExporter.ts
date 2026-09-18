import type { Cell as ExcelJSCell, Workbook as TWorkbook } from 'exceljs';

import { Cell } from '../../AdapterSpreadSheet/models';
import { PluginContext } from '../../AdapterSpreadSheet/plugin/Plugin';
import { ICell, ICellStyles } from '../../AdapterSpreadSheet/types';
import { CellFormattingType, PluginCellFormattingConfig } from '../PluginCellFormatting/types';
import { GROUPING_FORMATTING_TYPES } from '../PluginCellFormatting/utils';
import { XLSX_MIME_TYPE } from './constants';

// ─── Константы конвертации единиц ────────────────────────────────────────────

/**
 * Пиксели -> символьные единицы ExcelJS.
 * ExcelJS измеряет ширину колонки в символах Calibri 11pt (~7px/символ).
 */
const PX_TO_EXCEL_COL_WIDTH = 1 / 7;

/**
 * Пиксели -> пункты ExcelJS (96 DPI: 1px = 0.75pt).
 */
const PX_TO_EXCEL_ROW_HEIGHT = 0.75;

// ─── Маппинг числовых форматов ───────────────────────────────────────────────
//
// CellFormattingType (string) -> Excel numFmt строка.
// Используем локальные форматы: дата DD.MM.YYYY, рубль [$₽-419].
// {n} — подстановка числового шаблона, собранного из разрядности и группировки
// ячейки: раньше здесь было жёсткое '#,##0', и Excel показывал 1.5 как 2.

const NUMBER_FORMAT_MAP: Readonly<Record<string, string>> = {
    default: '{n}',
    number: '{n}',
    money: '[$₽-419] {n}',
    finance: '_-[$₽-419] * {n}_-;-[$₽-419] * {n}_-',
    count: '{n}',
    date: 'DD.MM.YYYY',
    datetime: 'DD.MM.YYYY HH:MM:SS',
    percent: '{n}%',
    fractional: '# ?/?',
    exponential: '{n}E+00',
    text: '@',
    additional: 'General',
};

/**
 * Числовая запись, которую Excel сохранит, не изменив её вид: целое без
 * ведущих нулей, без '+' и экспоненты. Всё остальное («007», «1.5», «1e5»,
 * 20-значный номер счёта) при записи числом выглядело бы в файле иначе,
 * чем в таблице.
 */
const EXACT_INTEGER_RE = /^-?(0|[1-9]\d*)$/;

// ─── Опции экспорта ───────────────────────────────────────────────────────────

export interface XlsxExportOptions {
    /**
     * Имя рабочего листа.
     * @default 'Sheet1'
     */
    sheetName?: string;

    /**
     * Экспортировать формулы (true) или только вычисленные значения (false).
     * При true в .xlsx сохраняются формулы + кэшированный результат —
     * Excel открывает без пересчёта.
     * @default true
     */
    includeFormulas?: boolean;

    /**
     * Экспортировать стили: шрифт, заливка, выравнивание, границы.
     * @default true
     */
    includeStyles?: boolean;

    /**
     * Экспортировать объединения ячеек (PluginJoinedCells).
     * @default true
     */
    includeMergedCells?: boolean;

    /**
     * Экспортировать ширины колонок и высоты строк (PluginMetadata).
     * @default true
     */
    includeLayout?: boolean;

    reportName?: string;
}

// ─── XlsxExporter ────────────────────────────────────────────────────────────

/**
 * Экспортирует текущее состояние таблицы в XLSX-формат через ExcelJS.
 *
 * Что экспортируется:
 *   ✓ Данные ячеек (значения и формулы с кэшем)
 *   ✓ Стили (шрифт, заливка, выравнивание, границы)
 *   ✓ Числовые форматы (PluginCellFormatting)
 *   ✓ Объединённые ячейки (PluginJoinedCells)
 *   ✓ Ширины колонок / высоты строк (PluginMetadata)
 *
 * Что НЕ экспортируется:
 *   ✗ Компоненты ячеек (кнопки — нет аналога в XLSX)
 *   ✗ Анимации и визуальные спецэффекты
 *   ✗ Градиентные заливки (ExcelJS не поддерживает)
 *
 * Использует динамический импорт ExcelJS — подгружается только при первом вызове.
 */
export class XlsxExporter {
    static async export(context: PluginContext, options: XlsxExportOptions = {}): Promise<Blob> {
        const {
            sheetName = 'Sheet1',
            includeFormulas = true,
            includeStyles = true,
            includeMergedCells = true,
            includeLayout = true,
            reportName = '',
        } = options;

        // Динамический импорт — пользователь платит размером bundle только при экспорте
        const { Workbook } = await import('exceljs');

        const workbook: TWorkbook = new Workbook();
        workbook.creator = 'SREDA Matrix';
        workbook.created = new Date();
        workbook.modified = new Date();

        const worksheet = workbook.addWorksheet(sheetName, {
            pageSetup: { fitToPage: true, fitToWidth: 1 },
        });

        // ── Служебный блок шапки листа ───────────────────────────────────────
        const formatedNow = new Date().toLocaleString('ru-RU');

        worksheet.getCell('A1').value = 'Для служебного использования';
        worksheet.getCell('A3').value = 'Имя:';
        worksheet.getCell('B3').value = reportName;
        worksheet.getCell('A4').value = 'Дата и время генерации:';
        worksheet.getCell('B4').value = formatedNow;

        // Количество служебных строк, на которое сдвигаются данные листа
        const HEADER_ROWS = 5;

        const data = context.getData();

        // ── Метаданные из MetadataManager ────────────────────────────────────
        const mm = context.metadataManager;
        const rowsMeta = mm.getRowsOverrides();
        const columnsMeta = mm.getColumnsOverrides();

        // ── Диапазон данных ───────────────────────────────────────────────────
        const { maxRow, maxCol } = XlsxExporter._computeDataRange(data);

        const filterRows: Record<string, any> = {};

        const pivotState = context.getPluginState('PluginPivot') as { pivotParams?: Record<string, string> } | undefined;
        const pivotParams = pivotState?.pivotParams ?? {};
        // ── Ширины колонок ────────────────────────────────────────────────────
        if (includeLayout) {
            for (let col = 0; col <= maxCol; col++) {
                const colMeta = XlsxExporter._getMeta(columnsMeta, col);
                if (colMeta?.width) {
                    worksheet.getColumn(col + 1).width = Math.max(
                        2,
                        Math.round(colMeta.width * PX_TO_EXCEL_COL_WIDTH * 10) / 10,
                    );
                }
            }
        }

        // ── Высоты строк ──────────────────────────────────────────────────────
        if (includeLayout) {
            for (let row = 0; row <= maxRow; row++) {
                const rowMeta = XlsxExporter._getMeta(rowsMeta, row);
                if (rowMeta?.height) {
                    worksheet.getRow(row + 1 + HEADER_ROWS).height =
                        Math.round(rowMeta.height * PX_TO_EXCEL_ROW_HEIGHT * 10) / 10;
                }
            }
        }

        // ── Данные ячеек ──────────────────────────────────────────────────────
        //
        // Итерируем фактический диапазон данных [0..maxRow] × [0..maxCol].
        // Пустые ячейки без стилей и конфигов пропускаем.

        for (let row = 0; row <= maxRow; row++) {
            for (let col = 0; col <= maxCol; col++) {
                const cellData = data.get(row)?.get(col) ?? null;

                const formulaConf = includeFormulas
                    ? context.getCellPluginConfig(new Cell({ rowIndex: row, columnIndex: col }), 'PluginFormulas')
                    : null;

                const filterConf = context.getCellPluginConfig(new Cell({ rowIndex: row, columnIndex: col }), 'PluginPivot');
                const filter = filterConf?.filter;
                if (filter) {
                    filterRows[filter.field] = {
                        label: pivotParams[filter.field] ?? filter.field,
                        formatedValues: filter.formatedValues,
                        row,
                    };
                }

                const formatConf =
                    context.getCellPluginConfig(new Cell({ rowIndex: row, columnIndex: col }), 'PluginCellFormatting') ??
                    undefined;

                const style = includeStyles ? context.styleManager.getCellStyle(row, col) : null;

                // Пропускаем ячейки без данных, стилей и конфигов
                const hasContent =
                    cellData !== null ||
                    formulaConf?.expression ||
                    (formatConf?.format && formatConf.format !== 'default') ||
                    (style && Object.keys(style).length > 0);

                if (!hasContent) continue;

                const excelCell: ExcelJSCell = worksheet.getCell(row + 1 + HEADER_ROWS, col + 1);

                // 1. Значение / формула
                if (formulaConf && formulaConf.expression) {
                    XlsxExporter._writeFormula(excelCell, cellData, formulaConf);
                } else if (cellData?.data !== undefined && cellData.data !== '') {
                    // Записываем обычные значения (не формулы)
                    const value = XlsxExporter._resolveValue(cellData.data, formatConf);
                    if (value !== null) {
                        excelCell.value = value;
                    }
                }

                // 2. Стили
                if (style && Object.keys(style).length > 0) {
                    XlsxExporter._applyStyle(excelCell, style);
                }

                // 3. Числовой формат
                const numFmt = XlsxExporter._resolveNumFmt(formatConf);
                if (numFmt) excelCell.numFmt = numFmt;
            }
        }

        // ── Объединённые ячейки ───────────────────────────────────────────────
        if (includeMergedCells) {
            const joinedState = context.getPluginState('PluginJoinedCells');
            const joinedCells = joinedState?.joinedCells ?? [];

            for (const jc of joinedCells) {
                try {
                    const tl = jc.range.topLeft.coordinates;
                    const br = jc.range.bottomRight.coordinates;
                    // Экспортируем только ячейки в пределах диапазона данных
                    if (tl.rowIndex <= maxRow && tl.columnIndex <= maxCol) {
                        worksheet.mergeCells(
                            tl.rowIndex + 1 + HEADER_ROWS,
                            tl.columnIndex + 1,
                            Math.min(br.rowIndex, maxRow) + 1 + HEADER_ROWS,
                            Math.min(br.columnIndex, maxCol) + 1,
                        );
                    }
                } catch {
                    // Некорректные диапазоны объединений игнорируем
                }
            }
        }

        if (Object.keys(filterRows).length > 0) {
            const filterEntries = Object.entries(filterRows).sort((a, b) => b[1].row - a[1].row);
            for (const [, config] of filterEntries) {
                if (!config.formatedValues || config.formatedValues.length === 0) continue;
                const extraFormatedValues = config.formatedValues.slice(1).map((value: string) => ['', value]);

                worksheet.spliceRows(
                    config.row + 1 + HEADER_ROWS,
                    1,
                    [config.label, config.formatedValues[0]],
                    ...extraFormatedValues,
                );
            }
        }

        worksheet.getCell('A1').value = 'Для служебного использования';

        // ── Сборка буфера ─────────────────────────────────────────────────────
        const buffer = await workbook.xlsx.writeBuffer();

        return new Blob([buffer as ArrayBuffer], {
            type: XLSX_MIME_TYPE,
        });
    }

    // ─── Значение ячейки ─────────────────────────────────────────────────────

    /**
     * Записывает формулу в ExcelJS-ячейку: { formula, result }.
     *
     * result — кэшированное значение, Excel откроет файл без пересчёта.
     * Кэш всегда приводится к числу (toNumericValue), а не к строке: иначе
     * Excel считает результат текстом, а ссылающиеся на ячейку формулы
     * получают #ЗНАЧ! при первом же пересчёте.
     */
    private static _writeFormula(
        cell: ExcelJSCell,
        cellData: ICell | null,
        formulaConf: { expression?: string } | null,
    ): void {
        const expr = formulaConf?.expression;
        if (!expr) return;

        // ExcelJS ожидает формулу без ведущего '='
        const formula = expr.startsWith('=') ? expr.slice(1) : expr;
        const result = XlsxExporter._coerceValue(cellData?.data);

        cell.value = result !== null ? { formula, result } : { formula };
    }

    /**
     * Значение для записи в ячейку XLSX.
     *
     * В файл попадает то же, что видит пользователь в таблице:
     *   • Текстовый формат и Общий без настроенной разрядности — таблица
     *     показывает сырую строку (getCellDisplay возвращает undefined),
     *     поэтому «007», «1.5» и длинные номера счетов пишутся строкой:
     *     Number() потерял бы ведущие нули, десятичную точку или точность.
     *   • Остальные форматы — число, Excel отрисует его по numFmt.
     */
    private static _resolveValue(
        raw: string | number | null | undefined,
        config: PluginCellFormattingConfig | undefined,
    ): string | number | null {
        if (raw === null || raw === undefined) return null;

        // Число из источника данных пришло числом — сохранять вид записи не нужно
        if (typeof raw === 'number') return raw;

        const str = String(raw).trim();
        if (str === '') return null;

        if (config?.format === CellFormattingType.text) return str;

        const isExactInteger = EXACT_INTEGER_RE.test(str) && Number.isSafeInteger(Number(str));
        if (!isExactInteger && XlsxExporter._isRawDisplay(config)) return str;

        return XlsxExporter._coerceValue(str);
    }

    /**
     * numFmt ячейки. undefined = General: Общий формат без настроенной
     * разрядности показывает значение «как есть».
     */
    private static _resolveNumFmt(config: PluginCellFormattingConfig | undefined): string | undefined {
        if (XlsxExporter._isRawDisplay(config)) return undefined;

        const format = config?.format ?? CellFormattingType.default;

        return NUMBER_FORMAT_MAP[format]?.replace(/\{n\}/g, XlsxExporter._numberPattern(config, format));
    }

    /** Общий формат без настроек разрядности — таблица показывает значение как есть */
    private static _isRawDisplay(config: PluginCellFormattingConfig | undefined): boolean {
        const format = config?.format ?? CellFormattingType.default;

        return format === CellFormattingType.default && config?.decimalPlaces == null && !config?.useGrouping;
    }

    /**
     * Числовой шаблон из разрядности и группировки ячейки.
     * Дефолты совпадают с PluginCellFormatting.getCellDisplay, чтобы Excel
     * показывал ровно то же, что таблица. Excel хранит numFmt в инвариантном
     * виде ('.' и ','), а отрисовывает по локали пользователя.
     */
    private static _numberPattern(config: PluginCellFormattingConfig | undefined, format: CellFormattingType): string {
        const decimalPlaces = Math.min(30, Math.max(0, config?.decimalPlaces ?? 2));
        const useGrouping = config?.useGrouping ?? GROUPING_FORMATTING_TYPES.includes(format);
        const integerPart = useGrouping ? '#,##0' : '0';

        return decimalPlaces > 0 ? `${integerPart}.${'0'.repeat(decimalPlaces)}` : integerPart;
    }

    /**
     * Преобразует CellDataType в наиболее подходящий нативный тип.
     * Строки, похожие на числа, конвертируются в number (важно для формул).
     */
    private static _coerceValue(raw: string | number | null | undefined): string | number | null {
        if (raw === null || raw === undefined) return null;
        if (typeof raw === 'number') return raw;

        const str = String(raw).trim();
        if (str === '') return null;

        // Пробуем число (учитываем запятую как десятичный разделитель)
        const normalized = str.replace(',', '.');
        const num = Number(normalized);
        if (!Number.isNaN(num) && normalized !== '') return num;

        return str;
    }

    // ─── Стили ───────────────────────────────────────────────────────────────

    private static _applyStyle(cell: ExcelJSCell, style: ICellStyles): void {
        const font = XlsxExporter._buildFont(style);
        if (font) cell.font = font;

        const fill = XlsxExporter._buildFill(style);
        // @ts-ignore
        if (fill) cell.fill = fill;

        const alignment = XlsxExporter._buildAlignment(style);
        if (alignment) cell.alignment = alignment;

        const border = XlsxExporter._buildBorder(style);
        if (border) cell.border = border;
    }

    private static _buildFont(style: ICellStyles): Record<string, unknown> | null {
        const font: Record<string, unknown> = {};

        if (style.fontFamily) {
            // CSS font-family может содержать стек: 'Roboto, Arial, sans-serif'
            // Берём первое имя, убираем кавычки и лишние пробелы
            const first = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
            if (first) font.name = first;
        }

        if (style.fontSize) font.size = style.fontSize;
        if (style.fontWeight === 'bold') font.bold = true;
        if (style.fontStyle === 'italic') font.italic = true;
        if (style.fontDecoration?.isUnderline) font.underline = true;
        if (style.fontDecoration?.isStrikeThrough) font.strike = true;

        if (style.color) {
            const argb = XlsxExporter._cssToArgb(style.color);
            if (argb) font.color = { argb };
        }

        return Object.keys(font).length > 0 ? font : null;
    }

    private static _buildFill(style: ICellStyles): Record<string, unknown> | null {
        if (!style.backgroundColor || typeof style.backgroundColor !== 'string') {
            return null; // Градиенты не поддерживаются XLSX (игнорируем IGradientColor)
        }

        const argb = XlsxExporter._cssToArgb(style.backgroundColor);
        if (!argb) return null;

        return {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb },
        };
    }

    private static _buildAlignment(style: ICellStyles): Record<string, unknown> | null {
        const alignment: Record<string, unknown> = {};

        if (style.horizontalAlign) {
            alignment.horizontal = XlsxExporter._mapHAlign(style.horizontalAlign);
        }
        if (style.verticalAlign) {
            alignment.vertical = XlsxExporter._mapVAlign(style.verticalAlign);
        }
        if (style.hyphenation === 'transfer') {
            alignment.wrapText = true;
        }
        if (style.paddingLeft !== undefined) alignment.indent = Math.round(style.paddingLeft / 8);

        return Object.keys(alignment).length > 0 ? alignment : null;
    }

    private static _buildBorder(style: ICellStyles): Record<string, unknown> | null {
        if (!style.borderColor && !style.borderStyle) return null;

        const border: Record<string, unknown> = {};
        const sides = ['left', 'right', 'top', 'bottom'] as const;

        for (const side of sides) {
            // borderColor / borderStyle могут быть строкой (все стороны) или IBorder
            const rawColor =
                typeof style.borderColor === 'object' && style.borderColor !== null
                    ? (style.borderColor as Record<string, string>)[side]
                    : (style.borderColor as string | undefined);

            const rawStyle =
                typeof style.borderStyle === 'object' && style.borderStyle !== null
                    ? (style.borderStyle as Record<string, string>)[side]
                    : (style.borderStyle as string | undefined);

            // Пропускаем сторону без цвета и стиля
            if (!rawColor && !rawStyle) continue;

            const argb = rawColor ? XlsxExporter._cssToArgb(rawColor) : null;
            border[side] = {
                style: XlsxExporter._mapBorderStyle(rawStyle ?? 'solid'),
                ...(argb ? { color: { argb } } : {}),
            };
        }

        return Object.keys(border).length > 0 ? border : null;
    }

    // ─── Маппинг значений ─────────────────────────────────────────────────────

    private static _mapHAlign(a: string): string {
        if (a === 'start') return 'left';
        if (a === 'end') return 'right';
        return 'center';
    }

    private static _mapVAlign(a: string): string {
        if (a === 'start') return 'top';
        if (a === 'end') return 'bottom';
        return 'middle';
    }

    private static _mapBorderStyle(s: string): string {
        if (s === 'dotted') return 'dotted';
        if (s === 'dashed') return 'dashed';
        return 'thin'; // solid -> thin (medium/thick потребует ширину)
    }

    // ─── Конвертация цвета ────────────────────────────────────────────────────

    /**
     * CSS-цвет -> ARGB hex для ExcelJS (формат `AARRGGBB`).
     *
     * Поддерживаемые форматы:
     *   `#RGB`           -> FF + расширенный
     *   `#RRGGBB`        -> FF + hex
     *   `#RRGGBBAA`      -> AA + RRGGBB (CSS-порядок -> Excel-порядок)
     *   `rgb(r,g,b)`     -> FF + hex
     *   `rgba(r,g,b,a)`  -> alpha + hex
     */
    private static _cssToArgb(color: string): string | null {
        if (!color || typeof color !== 'string') return null;
        const s = color.trim();

        // ── Hex ──────────────────────────────────────────────────────────────
        const hexMatch = s.match(/^#([0-9a-fA-F]{3,8})$/);
        if (hexMatch) {
            const h = hexMatch[1];
            switch (h.length) {
                case 3: {
                    const [r, g, b] = [h[0] + h[0], h[1] + h[1], h[2] + h[2]];
                    return `FF${r}${g}${b}`.toUpperCase();
                }
                case 6:
                    return `FF${h}`.toUpperCase();
                case 8: {
                    // CSS: RRGGBBAA -> Excel: AARRGGBB
                    const aa = h.slice(6, 8);
                    const rrggbb = h.slice(0, 6);
                    return `${aa}${rrggbb}`.toUpperCase();
                }
            }
        }

        // ── rgb / rgba ────────────────────────────────────────────────────────
        const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
        if (rgbMatch) {
            const pad = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
            const r = pad(parseInt(rgbMatch[1], 10));
            const g = pad(parseInt(rgbMatch[2], 10));
            const b = pad(parseInt(rgbMatch[3], 10));
            const a = rgbMatch[4] !== undefined ? pad(Math.round(parseFloat(rgbMatch[4]) * 255)) : 'ff';
            return `${a}${r}${g}${b}`.toUpperCase();
        }

        return null;
    }

    // ─── Утилиты ──────────────────────────────────────────────────────────────

    /**
     * Находит максимальные координаты занятых ячеек в матрице.
     * Используется для ограничения диапазона итерации.
     */
    private static _computeDataRange(data: ReadonlyMap<number, ReadonlyMap<number, ICell>>): {
        maxRow: number;
        maxCol: number;
    } {
        let maxRow = 0;
        let maxCol = 0;

        for (const [row, rowMap] of data) {
            if (row > maxRow) maxRow = row;
            for (const [col] of rowMap) {
                if (col > maxCol) maxCol = col;
            }
        }

        return { maxRow, maxCol };
    }

    /**
     * Безопасный доступ к метаданным строк/колонок.
     * Поддерживает Map<number, T> и Record<number|string, T>.
     */
    private static _getMeta<T>(
        meta: Map<number, T> | Record<string | number, T> | undefined | null,
        key: number,
    ): T | undefined {
        if (!meta) return undefined;
        if (meta instanceof Map) return meta.get(key);
        return meta[key] ?? meta[String(key)];
    }
}
