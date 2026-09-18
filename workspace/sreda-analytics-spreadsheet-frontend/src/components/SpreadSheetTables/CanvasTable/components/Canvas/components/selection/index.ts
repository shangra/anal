import { DEFAULT_SELECTION_BORDER_WIDTH } from '../../../../const';

interface IOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    borderColor: string;
    borderStyle?: 'solid' | 'dotted' | 'dashed';
    animated?: boolean;
    timestamp?: number;
}

export const drawSelection = (ctx: CanvasRenderingContext2D, options: IOptions) => {
    const { x, y, width, height, borderColor, animated, borderStyle, timestamp } = options;

    const borderWidth = DEFAULT_SELECTION_BORDER_WIDTH;

    ctx.save();

    // Draw fill if specified
    // if (options.fillColor) {
    //     ctx.fillStyle = options.fillColor;
    //     ctx.fillRect(x, y, width, height);
    // }

    // Draw border
    ctx.beginPath();
    // ctx.globalAlpha = 1;
    ctx.rect(x, y, width, height);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;

    let dashPattern: number[] = [];
    // Обычная граница
    if (borderStyle === 'dashed') {
        dashPattern = [5, 5];
    } else if (borderStyle === 'dotted') {
        dashPattern = [2, 2];
    }

    // Анимированная граница
    if (animated && timestamp !== undefined) {
        if (!dashPattern.length) dashPattern = [5, 5];
        const speed = 50;
        const offset = ((timestamp / 1000) * speed) % (dashPattern[0] + dashPattern[1]);
        ctx.lineDashOffset = -offset;
    }

    ctx.setLineDash(dashPattern);
    ctx.stroke();

    if (borderStyle || animated) {
        ctx.setLineDash([]);
    }

    ctx.restore();
};
