/* eslint-disable max-classes-per-file */
/**
 * VirtualMetadata — иммутабельные read-only view-ы поверх sparse overrides.
 *
 * Классы реализуют IColumnsMetadata / IRowsMetadata и являются единственным
 * представлением метаданных, которое получает Canvas.
 *
 * Они создаются и мемоизируются в MetadataManager; при любой мутации менеджер
 * инвалидирует кеш и пересоздаёт view при следующем обращении.
 */

import { ColumnMeta, RowMeta } from '../types';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IColumnMetadata {
    index: number;
    /** Абсолютная X-координата начала колонки в world space */
    x: number;
    width: number;
    /** Буквенный заголовок: A, B, …, AA, … */
    name: string;
}

export interface IRowMetadata {
    index: number;
    /** Абсолютная Y-координата начала строки в world space */
    y: number;
    height: number;
}

export interface IColumnsMetadata {
    readonly length: number;
    at(i: number): IColumnMetadata;
    slice(start: number, end: number): IColumnMetadata[];
    [Symbol.iterator](): Iterator<IColumnMetadata>;
}

export interface IRowsMetadata {
    readonly length: number;
    at(i: number): IRowMetadata;
    slice(start: number, end: number): IRowMetadata[];
    [Symbol.iterator](): Iterator<IRowMetadata>;
}

// ─── Генерация заголовков колонок ─────────────────────────────────────────────

/**
 * 0->'A', 1->'B', …, 25->'Z', 26->'AA', …
 */
export function generateColumnName(index: number): string {
    let result = '';
    let n = index + 1;
    while (n > 0) {
        const rem = n % 26;
        n = rem === 0 ? n / 26 - 1 : (n - rem) / 26;
        result = String.fromCodePoint(64 + (rem === 0 ? 26 : rem)) + result;
    }
    return result;
}

// ─── Сдвиг sparse overrides при INSERT / DELETE ───────────────────────────────

export function insertShiftMeta<T>(meta: Record<number, T>, from: number, count: number): Record<number, T> {
    const entries = Object.entries(meta);
    if (!entries.length) return meta;
    const result: Record<number, T> = {};
    for (const [key, value] of entries) {
        const idx = Number(key);
        result[idx < from ? idx : idx + count] = value;
    }
    return result;
}

export function conditionalInsertShiftMeta<T>(
    meta: Record<number, T>,
    from: number,
    count: number,
    shouldShift: boolean,
): Record<number, T> {
    if (!shouldShift) return { ...meta };
    return insertShiftMeta(meta, from, count);
}

export function deleteShiftMeta<T>(meta: Record<number, T>, from: number, count: number): Record<number, T> {
    const entries = Object.entries(meta);
    if (!entries.length) return meta;
    const to = from + count;
    const result: Record<number, T> = {};
    for (const [key, value] of entries) {
        const idx = Number(key);
        if (idx < from) result[idx] = value;
        if (idx >= to) result[idx - count] = value;
    }
    return result;
}

// ─── VirtualColumnsMetadata ───────────────────────────────────────────────────

/**
 * Виртуальный массив колонок.
 * Позиция x вычисляется за O(k), где k — кол-во overrides до i.
 * Для плотных overrides — быстро; для sparse (типичный случай) — O(1) амортизированно.
 */
export class VirtualColumnsMetadata implements IColumnsMetadata {
    private _prefixCache: Float64Array | null = null;

    private _cacheCount = 0;

    constructor(
        private readonly count: number,
        private readonly overrides: Readonly<Record<number, ColumnMeta>>,
        private readonly defaultWidth: number,
    ) {}

    get length(): number {
        return this.count;
    }

    getOverrides(): Readonly<Record<number, ColumnMeta>> {
        return this.overrides;
    }

    getDefaultWidth(): number {
        return this.defaultWidth;
    }

    private _buildCache(): Float64Array {
        if (this._prefixCache && this._cacheCount === this.count) {
            return this._prefixCache;
        }
        const cache = new Float64Array(this.count);
        let x = 0;
        for (let i = 0; i < this.count; i++) {
            cache[i] = x;
            x += this.overrides[i]?.width ?? this.defaultWidth;
        }
        this._prefixCache = cache;
        this._cacheCount = this.count;
        return cache;
    }

    at(i: number): IColumnMetadata {
        const cache = this._buildCache();
        const width = this.overrides[i]?.width ?? this.defaultWidth;
        return { index: i, x: cache[i], width, name: generateColumnName(i) };
    }

    slice(start: number, end: number): IColumnMetadata[] {
        const cache = this._buildCache();
        const out: IColumnMetadata[] = [];
        for (let i = start; i < Math.min(end, this.count); i++) {
            const width = this.overrides[i]?.width ?? this.defaultWidth;
            out.push({ index: i, x: cache[i], width, name: generateColumnName(i) });
        }
        return out;
    }

    [Symbol.iterator](): Iterator<IColumnMetadata> {
        let i = 0;
        let x = 0;
        const { count, overrides, defaultWidth } = this;
        return {
            next(): IteratorResult<IColumnMetadata> {
                if (i >= count) return { done: true, value: undefined };
                const width = overrides[i]?.width ?? defaultWidth;
                const value = { index: i, x, width, name: generateColumnName(i) };
                x += width;
                i++;
                return { done: false, value };
            },
        };
    }
}

// ─── VirtualRowsMetadata ──────────────────────────────────────────────────────

export class VirtualRowsMetadata implements IRowsMetadata {
    private _prefixCache: Float64Array | null = null;

    private _cacheCount = 0;

    constructor(
        private readonly count: number,
        private readonly overrides: Readonly<Record<number, RowMeta>>,
        private readonly defaultHeight: number,
    ) {}

    get length(): number {
        return this.count;
    }

    getOverrides(): Readonly<Record<number, RowMeta>> {
        return this.overrides;
    }

    getDefaultHeight(): number {
        return this.defaultHeight;
    }

    private _buildCache(): Float64Array {
        if (this._prefixCache && this._cacheCount === this.count) {
            return this._prefixCache;
        }
        const cache = new Float64Array(this.count);
        let y = 0;
        for (let i = 0; i < this.count; i++) {
            cache[i] = y;
            y += this.overrides[i]?.height ?? this.defaultHeight;
        }
        this._prefixCache = cache;
        this._cacheCount = this.count;
        return cache;
    }

    at(i: number): IRowMetadata {
        const cache = this._buildCache();
        const height = this.overrides[i]?.height ?? this.defaultHeight;
        return { index: i, y: cache[i], height };
    }

    slice(start: number, end: number): IRowMetadata[] {
        const cache = this._buildCache();
        const out: IRowMetadata[] = [];
        for (let i = start; i < Math.min(end, this.count); i++) {
            const height = this.overrides[i]?.height ?? this.defaultHeight;
            out.push({ index: i, y: cache[i], height });
        }
        return out;
    }

    [Symbol.iterator](): Iterator<IRowMetadata> {
        let i = 0;
        let y = 0;
        const { count, overrides, defaultHeight } = this;
        return {
            next(): IteratorResult<IRowMetadata> {
                if (i >= count) return { done: true, value: undefined };
                const height = overrides[i]?.height ?? defaultHeight;
                const value = { index: i, y, height };
                y += height;
                i++;
                return { done: false, value };
            },
        };
    }
}
