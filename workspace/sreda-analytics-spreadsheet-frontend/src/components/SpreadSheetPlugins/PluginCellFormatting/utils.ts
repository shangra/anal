import dayjs from 'dayjs';

import { CellDataType } from '../../AdapterSpreadSheet/types';
import { CellFormattingType } from './types';

// ─── Проверки ─────────────────────────────────────────────────────────────────

/**
 * Проверяет, относится ли формат к числовым типам.
 */
export function isNumericFormat(format: CellFormattingType): boolean {
    return [
        CellFormattingType.money,
        CellFormattingType.finance,
        CellFormattingType.fractional,
        CellFormattingType.percent,
        CellFormattingType.number,
        CellFormattingType.count,
        CellFormattingType.exponential,
    ].includes(format);
}

// ─── Нормализация ──────────────────────────────────────────────────────────────

/**
 * Нормализует строковое представление числа: заменяет запятую на точку.
 * Если значение не строка — возвращает как есть.
 */
export function normalizeNumericString(raw: CellDataType): CellDataType {
    return typeof raw === 'string' ? raw.replace(',', '.') : raw;
}

// ─── Масштабирование ───────────────────────────────────────────────────────────

/** Форматы, которые по умолчанию используют разделители разрядов (группировку) */
export const GROUPING_FORMATTING_TYPES: readonly CellFormattingType[] = [
    CellFormattingType.money,
    CellFormattingType.finance,
    CellFormattingType.number,
    CellFormattingType.count,
    CellFormattingType.percent,
] as const;

// ─── Форматирование чисел с локалью ───────────────────────────────────────────

/**
 * Форматирует число с фиксированным количеством знаков после запятой в локали ru-RU.
 * @param useGrouping - Если false, разделители разрядов не добавляются (по умолчанию true).
 */
export function formatWithLocale(data: number, decimalPlaces: number, useGrouping: boolean): string {
    return data.toLocaleString('ru-RU', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
        useGrouping,
    });
}

// ─── Числовые форматы ──────────────────────────────────────────────────────────

/**
 * Форматирует число в процентах.
 * Пример: 0.55 → "55,00%"
 */
export function formatPercent(data: number, decimalPlaces: number, useGrouping: boolean = true): string {
    if (data === 0) return '0';
    return `${formatWithLocale(data * 100, decimalPlaces, useGrouping)}%`;
}

/**
 * Форматирует число в экспоненциальном формате.
 * Пример: 1234 → "1,23e+3"
 */
export function formatExponential(data: number, decimalPlaces: number): string {
    if (data === 0) return '0';
    return data.toExponential(decimalPlaces).replace('.', ',');
}

/**
 * Форматирует число в денежном формате.
 * Пример: 1234.5 → "1 234,50 ₽"
 */
export function formatMoney(data: number, decimalPlaces: number, useGrouping: boolean = true): string {
    return `${formatWithLocale(data, decimalPlaces, useGrouping)} ₽`;
}

/**
 * Форматирует число в финансовом формате.
 * Пример: 0 → "- ₽", 1234.5 → "1 234,50 ₽"
 */
export function formatFinance(data: number, decimalPlaces: number, useGrouping: boolean = true): string {
    if (data === 0) return '- ₽';
    return `${formatWithLocale(data, decimalPlaces, useGrouping)} ₽`;
}

/**
 * Форматирует число в обычном числовом формате (без символа валюты, без разделителей разрядов).
 */
export function formatNumber(data: number, decimalPlaces: number, useGrouping: boolean = false): string {
    return formatWithLocale(data, decimalPlaces, useGrouping);
}

// ─── Дробный формат (fractional) ──────────────────────────────────────────────

/**
 * Аппроксимация десятичной дроби рациональным числом
 * через цепные дроби (continued fractions) с ограничением знаменателя.
 */
export function approximateFraction(value: number, maxDenominator: number): { numerator: number; denominator: number } {
    let h1 = 0;
    let h2 = 1;
    let k1 = 1;
    let k2 = 0;
    let remaining = value;
    let iteration = 0;
    const MAX_ITERATIONS = 100;

    while (iteration < MAX_ITERATIONS) {
        iteration += 1;

        const a = Math.floor(remaining);
        const h = a * h2 + h1;
        const k = a * k2 + k1;

        if (k > maxDenominator) break;

        h1 = h2;
        h2 = h;
        k1 = k2;
        k2 = k;

        const diff = remaining - a;
        if (Math.abs(diff) < 1e-10) break;

        remaining = 1 / diff;
    }

    return { numerator: h2, denominator: k2 };
}

/**
 * Преобразует число в обыкновенную дробь (как в Excel).
 * Пример: 55.44 → "55 4/9", 0.5 → "1/2"
 * Используется аппроксимация цепными дробями с ограничением знаменателя до 9.
 */
export function formatFractional(data: number): string {
    if (data === 0) return '0';
    if (data % 1 === 0) {
        return data.toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }

    const sign = data < 0 ? -1 : 1;
    const abs = Math.abs(data);
    const wholePart = Math.floor(abs);
    const frac = abs - wholePart;

    const { numerator, denominator } = approximateFraction(frac, 9);

    const wholeStr =
        wholePart > 0 ? wholePart.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '';

    const signStr = sign < 0 ? '-' : '';

    if (wholePart > 0) {
        return `${signStr}${wholeStr} ${numerator}/${denominator}`;
    }
    return `${signStr}${numerator}/${denominator}`;
}

// ─── Числовое форматирование (общая точка входа) ──────────────────────────────

/**
 * Форматирует число в зависимости от указанного формата.
 */
export function formatNumeric(
    data: number,
    format: CellFormattingType,
    opts: { decimalPlaces: number; useGrouping?: boolean },
): string {
    const { decimalPlaces, useGrouping = true } = opts;

    switch (format) {
        case CellFormattingType.percent:
            return formatPercent(data, decimalPlaces, useGrouping);

        case CellFormattingType.exponential:
            return formatExponential(data, decimalPlaces);

        case CellFormattingType.number:
        case CellFormattingType.count:
            return formatNumber(data, decimalPlaces, useGrouping);

        case CellFormattingType.money:
            return formatMoney(data, decimalPlaces, useGrouping);

        case CellFormattingType.finance:
            return formatFinance(data, decimalPlaces, useGrouping);

        // default — Общий формат, форматируется как число (с группировкой если включена)
        case CellFormattingType.default:
            return formatNumber(data, decimalPlaces, useGrouping);

        // fractional — обыкновенная дробь (как в Excel)
        default:
            return formatFractional(data);
    }
}

// ─── Форматирование дат ────────────────────────────────────────────────────────

const DATE_FORMATS = [
    'DD.MM.YYYY',
    'DD.MM.YYYY HH:mm:ss',
    'YYYY-MM-DD',
    'YYYY-MM-DD HH:mm:ss',
    'DD/MM/YYYY',
    'DD/MM/YYYY HH:mm:ss',
];

/**
 * Парсит число как Unix timestamp, пробуя различные единицы измерения:
 * 1. Миллисекунды (самый распространённый)
 * 2. Секунды (если миллисекунды дают год вне диапазона 1900-2100)
 * 3. Микросекунды (если секунды дают год вне диапазона)
 *
 * Если год вне диапазона 1900-2100 — пробует следующий формат.
 */
function parseNumericDate(data: number): dayjs.Dayjs | null {
    // Пробуем как миллисекунды
    let date = dayjs(data);
    if (date.isValid()) {
        const year = date.year();
        if (year >= 1900 && year <= 2100) return date;
    }

    // Пробуем как секунды
    date = dayjs(data * 1000);
    if (date.isValid()) {
        const year = date.year();
        if (year >= 1900 && year <= 2100) return date;
    }

    // Пробуем как микросекунды (data / 1000)
    date = dayjs(data / 1000);
    if (date.isValid()) {
        const year = date.year();
        if (year >= 1900 && year <= 2100) return date;
    }

    return null;
}

/**
 * Парсит строку как дату, пробуя различные форматы.
 */
function parseStringDate(str: string): dayjs.Dayjs | null {
    const trimmed = str.trim();

    // Пробуем ISO-строку
    let date = dayjs(trimmed);
    if (date.isValid()) return date;

    // Пробуем популярные форматы
    for (const fmt of DATE_FORMATS) {
        date = dayjs(trimmed, fmt, 'ru');
        if (date.isValid()) return date;
    }

    return null;
}

/**
 * Парсит значение как дату, поддерживая:
 * - Unix timestamp (миллисекунды и секунды)
 * - ISO-строки
 * - Популярные форматы (DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY и т.д.)
 */
export function parseDateValue(data: CellDataType): dayjs.Dayjs | null {
    if (data == null) return null;

    if (typeof data === 'number' && !Number.isNaN(data)) {
        return parseNumericDate(data);
    }

    return parseStringDate(String(data));
}

/**
 * Форматирует дату в зависимости от типа формата.
 */
export function formatDate(data: CellDataType, format: CellFormattingType): string {
    const date = parseDateValue(data);
    if (!date || !date.isValid()) return data != null ? String(data) : '';

    return format === CellFormattingType.date ? date.format('DD.MM.YYYY') : date.format('DD.MM.YYYY HH:mm');
}

// ─── Нечисловые форматы ────────────────────────────────────────────────────────

/**
 * Форматирует нечисловые данные (даты, текст).
 */
export function formatNonNumeric(data: CellDataType, format: CellFormattingType): string {
    switch (format) {
        case CellFormattingType.date:
        case CellFormattingType.datetime:
            return formatDate(data, format);

        case CellFormattingType.text:
            return String(data ?? '');

        default:
            return String(data ?? '');
    }
}
