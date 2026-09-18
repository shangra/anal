// ─── Types ────────────────────────────────────────────────────────────────────

export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'none' | 'hidden';

export interface ParsedBorder {
    width: number; // px
    style: BorderStyle;
    color: string; // any CSS color string
}

export interface RectParams {
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius?: number;
}

// ─── CSS Color -> rgba ────────────────────────────────────────────────────────

/**
 * Resolves any CSS color string to a normalized rgba(...) value
 * by rendering it off-screen through a temporary canvas.
 */
function resolveCssColor(color: string): string {
    if (typeof document === 'undefined') return color; // SSR guard

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}

// ─── CSS Unit -> px ───────────────────────────────────────────────────────────

function cssSizeToPx(value: string): number {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;

    if (value.endsWith('rem')) return num * 16;
    if (value.endsWith('em')) return num * 16;
    if (value.endsWith('pt')) return num * (96 / 72);
    if (value.endsWith('cm')) return num * (96 / 2.54);
    if (value.endsWith('mm')) return num * (96 / 25.4);
    // px or bare number
    return num;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

const BORDER_STYLES = new Set<BorderStyle>(['solid', 'dashed', 'dotted', 'double', 'none', 'hidden']);

/** Splits border string respecting parentheses (for color functions). */
function tokenizeBorder(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let depth = 0;

    for (const ch of input) {
        if (ch === '(') {
            depth++;
            current += ch;
        } else if (ch === ')') {
            depth--;
            current += ch;
        } else if (ch === ' ' && depth === 0) {
            if (current) tokens.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    if (current) tokens.push(current);
    return tokens;
}

/**
 * Parses a CSS shorthand border string.
 *
 * @example
 * parseCssBorder("2px solid red")
 * parseCssBorder("thick dashed rgba(0,128,255,0.8)")
 * parseCssBorder("none")
 */
export function parseCssBorder(border: string): ParsedBorder {
    const defaults: ParsedBorder = { width: 0, style: 'none', color: 'transparent' };

    const trimmed = border.trim().toLowerCase();
    if (trimmed === 'none' || trimmed === 'hidden') return defaults;

    // Split while preserving functional color notations: rgb(...), rgba(...), hsl(...)
    const tokens = tokenizeBorder(border.trim());

    let width = 3; // medium ≈ 3px
    let style: BorderStyle = 'solid';
    let color = '#000000';

    for (const token of tokens) {
        const lower = token.toLowerCase();

        // Named widths
        if (lower === 'thin') {
            width = 1;
            continue;
        }
        if (lower === 'medium') {
            width = 3;
            continue;
        }
        if (lower === 'thick') {
            width = 5;
            continue;
        }

        // Numeric width with unit
        if (/^[\d.]+/.test(lower)) {
            width = cssSizeToPx(lower);
            continue;
        }

        // Border style keyword
        if (BORDER_STYLES.has(lower as BorderStyle)) {
            style = lower as BorderStyle;
            continue;
        }

        // Everything else is treated as color
        color = token;
    }

    return { width, style, color };
}

// ─── Line-dash patterns ───────────────────────────────────────────────────────

function getDashPattern(style: BorderStyle, lineWidth: number): number[] {
    switch (style) {
        case 'dashed':
            return [lineWidth * 4, lineWidth * 3];
        case 'dotted':
            return [lineWidth, lineWidth * 2];
        case 'double':
            return []; // handled separately
        case 'none':
        case 'hidden':
            return [];
        default:
            return []; // solid
    }
}

// ─── Apply border to Canvas context ──────────────────────────────────────────

/** Builds a (rounded) rect path inset by `inset` pixels. */
function strokeRect(
    ctx: CanvasRenderingContext2D,
    { x, y, width, height, borderRadius = 0 }: RectParams,
    inset: number,
): void {
    const ix = x + inset;
    const iy = y + inset;
    const iw = width - inset * 2;
    const ih = height - inset * 2;
    const r = Math.max(0, borderRadius - inset);

    if (r > 0 && ctx.roundRect) {
        ctx.roundRect(ix, iy, iw, ih, r);
    } else {
        ctx.rect(ix, iy, iw, ih);
    }
}

/**
 * Applies a parsed border to a CanvasRenderingContext2D and strokes a rect.
 *
 * @param ctx   - 2D canvas context
 * @param rect  - Rectangle parameters (x, y, width, height, optional borderRadius)
 * @param border - Parsed border object or raw CSS string
 */
export function applyBorderToCanvas(ctx: CanvasRenderingContext2D, rect: RectParams, border: ParsedBorder | string): void {
    const parsed = typeof border === 'string' ? parseCssBorder(border) : border;
    const { width, style, color } = parsed;

    if (style === 'none' || style === 'hidden' || width <= 0) return;

    const resolvedColor = resolveCssColor(color);

    ctx.save();

    // double border: draw outer + inner strokes
    if (style === 'double') {
        const gap = Math.max(1, Math.floor(width / 3));
        const outerW = gap;
        const innerW = gap;

        for (const [lw, inset] of [
            [outerW, outerW / 2],
            [innerW, width - innerW / 2],
        ] as [number, number][]) {
            ctx.beginPath();
            ctx.lineWidth = lw;
            ctx.strokeStyle = resolvedColor;
            ctx.setLineDash([]);
            strokeRect(ctx, rect, inset);
            ctx.stroke();
        }
        ctx.restore();
        return;
    }

    ctx.lineWidth = width;
    ctx.strokeStyle = resolvedColor;
    ctx.setLineDash(getDashPattern(style, width));
    ctx.lineDashOffset = 0;

    ctx.beginPath();
    strokeRect(ctx, rect, width / 2);
    ctx.stroke();

    ctx.setLineDash([]); // reset dash
    ctx.restore();
}

// ─── Convenience: parse individual border-* properties ───────────────────────

/**
 * Assembles individual CSS border properties into a unified ParsedBorder.
 *
 * @example
 * parseBorderProperties({
 *   borderWidth: "2px",
 *   borderStyle: "dashed",
 *   borderColor: "#ff0000",
 * });
 */
export function parseBorderProperties(props: {
    borderWidth?: string;
    borderStyle?: string;
    borderColor?: string;
}): ParsedBorder {
    return parseCssBorder(
        [props.borderWidth ?? '1px', props.borderStyle ?? 'solid', props.borderColor ?? '#000000'].join(' '),
    );
}
