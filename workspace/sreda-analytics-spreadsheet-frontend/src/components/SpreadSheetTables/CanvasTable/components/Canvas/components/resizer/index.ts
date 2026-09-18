import { getCSSColor } from '../../../../utils';

interface IDrawResizerOptions {
    x: number;
    y: number;
    type: 'column' | 'row';
    mode: 'normal' | 'dragging';
    width?: number;
    height?: number;
    resizerColor?: string;
    indicatorColor?: string;
}

export const drawResizer = (ctx: CanvasRenderingContext2D, options: IDrawResizerOptions) => {
    const { x, y, type, mode, width, height, resizerColor = '#808080', indicatorColor = '#4786FF' } = options;

    ctx.save();

    if (type === 'column') {
        // Рисуем вертикальный ресайзер
        const handleWidth = 4;
        const handleHeight = 16;

        // Ручка ресайзера
        let color = getCSSColor(resizerColor);
        if (typeof color === 'object') color = '#808080';

        ctx.fillStyle = color as string;
        ctx.fillRect(x - handleWidth / 2, y - handleHeight / 2, handleWidth, handleHeight);

        // Индикатор при перетаскивании
        if (mode === 'dragging' && height) {
            let indicColor = getCSSColor(indicatorColor);
            if (typeof indicColor === 'object') indicColor = '#4786FF';

            ctx.strokeStyle = indicColor as string;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    } else {
        // Рисуем горизонтальный ресайзер
        const handleWidth = 16;
        const handleHeight = 4;

        // Ручка ресайзера
        let color = getCSSColor(resizerColor);
        if (typeof color === 'object') color = '#808080';

        ctx.fillStyle = color as string;
        ctx.fillRect(x - handleWidth / 2, y - handleHeight / 2, handleWidth, handleHeight);

        // Индикатор при перетаскивании
        if (mode === 'dragging' && width) {
            let indicColor = getCSSColor(indicatorColor);
            if (typeof indicColor === 'object') indicColor = '#4786FF';

            ctx.strokeStyle = indicColor as string;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    ctx.restore();
};
