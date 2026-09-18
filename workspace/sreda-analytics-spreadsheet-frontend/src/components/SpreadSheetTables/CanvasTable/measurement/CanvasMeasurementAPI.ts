import { IMeasurementAPI } from '../../../AdapterSpreadSheet/measurement/types';
import { COMPONENT_SIZE, COMPONENTS_GAP, DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, LINE_HEIGHT_FACTOR } from '../const';
import { ITextMeasureOptions, ITextMeasureResult } from './types';

const MAX_CACHE_SIZE = 10_000;

/**
 * Реализация IMeasurementAPI через Canvas 2D OffscreenCanvas (или fallback
 * на обычный HTMLCanvasElement). Создаёт единственный контекст размером 1×1
 * исключительно для measureText — не влияет на рендеринг.
 */
export class CanvasMeasurementAPI implements IMeasurementAPI {
    private readonly _ctx: CanvasRenderingContext2D;

    private readonly _cache: Map<string, ITextMeasureResult> = new Map();

    private constructor(ctx: CanvasRenderingContext2D) {
        this._ctx = ctx;
    }

    // ── Фабрика ───────────────────────────────────────────────────────────────

    static create(ctx?: CanvasRenderingContext2D | null): CanvasMeasurementAPI | null {
        if (ctx) return new CanvasMeasurementAPI(ctx);

        // Fallback: OffscreenCanvas если контекст не передан
        try {
            if (typeof OffscreenCanvas !== 'undefined') {
                const offscreen = new OffscreenCanvas(1, 1);
                const offscreenCtx = offscreen.getContext('2d') as CanvasRenderingContext2D | null;
                if (offscreenCtx) return new CanvasMeasurementAPI(offscreenCtx);
            }
        } catch {
            /* fallback */
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const fallbackCtx = canvas.getContext('2d');
        return fallbackCtx ? new CanvasMeasurementAPI(fallbackCtx) : null;
    }

    // ── IMeasurementAPI ───────────────────────────────────────────────────────

    measureText(options: ITextMeasureOptions): ITextMeasureResult {
        const key = this._key(options);

        const cached = this._cache.get(key);
        if (cached) return cached;

        const result = this._compute(options);
        this._evictIfNeeded();
        this._cache.set(key, result);
        return result;
    }

    measureBatch(items: ITextMeasureOptions[]): ITextMeasureResult[] {
        return items.map((item) => this.measureText(item));
    }

    clearCache(): void {
        this._cache.clear();
    }

    // ── Внутренняя логика ────────────────────────────────────────────────────

    private _compute(opts: ITextMeasureOptions): ITextMeasureResult {
        const {
            text,
            fontSize = DEFAULT_FONT_SIZE,
            fontFamily = DEFAULT_FONT_FAMILY,
            fontWeight = '',
            fontStyle = '',
            maxWidth,
            lineHeightFactor = LINE_HEIGHT_FACTOR,
            componentsCount = 0,
            componentSize = COMPONENT_SIZE,
            componentGap = COMPONENTS_GAP,
        } = opts;

        // Ширина каждой группы компонентов (size * n + gap * (n-1))
        const componentsWidth = this._componentGroupWidth(componentsCount, componentSize, componentGap);

        // Зарезервированное пространство: группа + gap до текста
        const reservedWidth = componentsWidth > 0 ? componentsWidth + componentGap : 0;

        // Доступная ширина для текста с учётом компонентов
        const textMaxWidth = maxWidth && maxWidth > 0 ? Math.max(0, maxWidth - reservedWidth) : undefined;

        const ctx = this._ctx;

        ctx.save();
        ctx.font = this._fontString(fontSize, fontFamily, fontWeight, fontStyle);

        const lines = textMaxWidth !== undefined && textMaxWidth > 0 ? this._wrap(text, textMaxWidth) : [text];

        let maxLineWidth = 0;
        let totalHeight = 0;

        for (const line of lines) {
            const metrics = ctx.measureText(line);
            if (metrics.width > maxLineWidth) maxLineWidth = metrics.width;

            const lineHeight =
                typeof metrics.actualBoundingBoxAscent === 'number' && typeof metrics.actualBoundingBoxDescent === 'number'
                    ? (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) * lineHeightFactor
                    : fontSize * lineHeightFactor;

            totalHeight += lineHeight;
        }

        ctx.restore();

        const textWidth = Math.ceil(maxLineWidth);
        const totalWidth = textWidth + reservedWidth;

        return {
            width: textWidth,
            height: totalHeight,
            lines,
            totalWidth,
            componentsWidth,
        };
    }

    /** size * n + gap * (n - 1), возвращает 0 при n = 0 */
    private _componentGroupWidth(count: number, size: number, gap: number): number {
        if (count <= 0 || size <= 0) return 0;
        return size * count + gap * (count - 1);
    }

    private _wrap(text: string, maxWidth: number): string[] {
        const lines: string[] = [];

        // Сначала разбиваем по явным переносам строк
        for (const paragraph of text.split('\n')) {
            const words = paragraph.split(' ');
            let current = '';

            for (const word of words) {
                // Слово длиннее maxWidth — разбиваем посимвольно
                if (this._ctx.measureText(word).width > maxWidth) {
                    if (current) {
                        lines.push(current);
                        current = '';
                    }
                    let charBuf = '';
                    for (const char of word) {
                        const candidate = charBuf + char;
                        if (this._ctx.measureText(candidate).width > maxWidth && charBuf) {
                            lines.push(charBuf);
                            charBuf = char;
                        } else {
                            charBuf = candidate;
                        }
                    }
                    if (charBuf) current = charBuf;
                    continue;
                }

                const candidate = current ? `${current} ${word}` : word;
                if (current && this._ctx.measureText(candidate).width > maxWidth) {
                    lines.push(current);
                    current = word;
                } else {
                    current = candidate;
                }
            }

            if (current) lines.push(current);
        }

        return lines.length ? lines : [''];
    }

    private _fontString(size: number, family: string, weight: string | number, style: string): string {
        const parts: string[] = [];
        if (style && style !== 'normal') parts.push(style);
        if (weight && weight !== 'normal') parts.push(String(weight));
        parts.push(`${size}px`);
        parts.push(family);
        return parts.join(' ');
    }

    private _key(opts: ITextMeasureOptions): string {
        return [
            opts.text,
            opts.fontSize ?? '',
            opts.fontFamily ?? '',
            opts.fontWeight ?? '',
            opts.fontStyle ?? '',
            opts.maxWidth ?? '',
            opts.lineHeightFactor ?? '',
            opts.componentsCount ?? 0,
            opts.componentSize ?? 0,
            opts.componentGap ?? 0,
        ].join('\x00');
    }

    private _evictIfNeeded(): void {
        if (this._cache.size >= MAX_CACHE_SIZE) {
            // LRU-приближение: удаляем первые 10% записей
            const evict = Math.ceil(MAX_CACHE_SIZE * 0.1);
            const iter = this._cache.keys();
            for (let i = 0; i < evict; i++) {
                const { value, done } = iter.next();
                if (done) break;
                this._cache.delete(value);
            }
        }
    }
}
