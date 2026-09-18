import { ICellStyles } from '../../../../../../AdapterSpreadSheet/types';
import {
    DEFAULT_COLOR,
    DEFAULT_FONT_FAMILY,
    DEFAULT_FONT_SIZE,
    DEFAULT_HORIZONTAL_ALIGN,
    DEFAULT_HYPHENATION,
    DEFAULT_VERTICAL_ALIGN,
    LINE_HEIGHT_FACTOR,
} from '../../../../const';
import { getLines } from '../../../../utils';

interface Marging {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

interface IOptions extends ICellStyles {
    x: number;
    y: number;
    width: number;
    height: number;
    marging?: Marging;
    value: string;
    lines?: string[];
    cellSize?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

const _getAlignOffset = (align: string, start: number, content: number, max: number) => {
    let offset = start;
    if (align === 'center') {
        offset = Math.max(start + (max - content) / 2 + content / 2, start) - content / 2;
    } else if (align === 'end') {
        offset = start + (max - content);
    }
    return offset;
};

const drawDecoration = (ctx: CanvasRenderingContext2D, options: IOptions) => {
    const { fontDecoration, fontSize = DEFAULT_FONT_SIZE, color = DEFAULT_COLOR, x, y, width } = options;

    if (fontDecoration?.isUnderline) {
        ctx.beginPath();
        ctx.save();
        ctx.strokeStyle = color ?? DEFAULT_COLOR;
        ctx.lineWidth = 1;
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x + width, y + 2);
        ctx.stroke();
        ctx.restore();
        ctx.closePath();
    }
    if (fontDecoration?.isStrikeThrough) {
        ctx.beginPath();
        ctx.save();
        ctx.strokeStyle = color ?? DEFAULT_COLOR;
        ctx.lineWidth = 1;
        ctx.moveTo(x, y - Math.ceil(fontSize / 2) + 2);
        ctx.lineTo(x + width, y - Math.ceil(fontSize / 2) + 2);
        ctx.stroke();
        ctx.restore();
        ctx.closePath();
    }
};

export const drawText = (ctx: CanvasRenderingContext2D, options: IOptions): void => {
    const { x, y, width, height, value, lines: precomputedLines, cellSize } = options;

    const fontSize = options.fontSize || DEFAULT_FONT_SIZE;
    const fontFamily = options.fontFamily || DEFAULT_FONT_FAMILY;
    const color = options.color || DEFAULT_COLOR;
    const verticalAlign = options.verticalAlign || DEFAULT_VERTICAL_ALIGN;
    const horizontalAlign = options.horizontalAlign || DEFAULT_HORIZONTAL_ALIGN;
    const hyphenation = options.hyphenation || DEFAULT_HYPHENATION;
    // Пока закомменчу, это заливка фона самого текста, а не ячейки
    // const backgroundColor = options.backgroundColor;

    ctx.save();
    ctx.beginPath();

    if (cellSize && hyphenation !== 'ncrop') {
        ctx.rect(cellSize.x, cellSize.y, cellSize.width, cellSize.height);
        ctx.clip();
    }

    ctx.fillStyle = color as string;

    let fontString = `${fontSize}px ${fontFamily}`;
    if (options.fontWeight) fontString = `${options.fontWeight} ${fontString}`;
    if (options.fontStyle) fontString = `${options.fontStyle} ${fontString}`;

    ctx.font = fontString;

    // if (backgroundColor) {
    //     ctx.fillStyle = backgroundColor;
    //     ctx.fillRect(x, y, width, height);
    // }
    let lines = [];
    switch (hyphenation) {
        case 'transfer': {
            lines = precomputedLines ?? getLines(ctx, value, cellSize?.width ?? width);
            break;
        }
        case 'crop':
        default: {
            lines = [value];
            break;
        }
    }

    const lineHeight = fontSize * LINE_HEIGHT_FACTOR;

    const textHeight = lineHeight * lines.length;
    const textOffsetY = _getAlignOffset(verticalAlign, y, textHeight, height);

    lines.forEach((line, index) => {
        const { width: lineWidth } = ctx.measureText(line);

        const lineX = _getAlignOffset(horizontalAlign, x, lineWidth, width);
        const lineY = textOffsetY + fontSize * (index + 1); // Text renders from left-bottom coors

        drawDecoration(ctx, {
            ...options,
            x: lineX,
            y: lineY,
            width: lineWidth,
        });

        ctx.fillText(line, lineX, lineY);

        const _debugLineColor = localStorage.getItem('DBG_CVS_CONTENT_LINE_STROKE_COLOR');
        if (_debugLineColor) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(lineX, lineY - fontSize, lineWidth, lineHeight);
            ctx.strokeStyle = _debugLineColor;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }
    });

    const _debugColor = localStorage.getItem('DBG_CVS_CONTENT_STROKE_COLOR');
    if (_debugColor) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.strokeStyle = _debugColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }

    ctx.closePath();
    ctx.restore();
};
