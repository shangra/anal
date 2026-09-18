import { IBorder, IGradientColor } from '../../../../../../AdapterSpreadSheet/types';
import { drawGradient } from '../../../../utils';

interface IOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    /** Пользовательский цвет ячейки */
    backgroundColor?: string | IGradientColor;
    /** Цвет границы ячейки */
    borderColor: string | IBorder<string>; // TODO: задача от Саши - изменить формат
    /** Цвет границы ячейки */
    borderWidth?: number;
}

const DEFAULT_CELL_BORDER_WIDTH = 1;
export const drawCell = (ctx: CanvasRenderingContext2D, options: IOptions) => {
    const { x, y, width, height } = options;

    const borderWidth = options.borderWidth ?? DEFAULT_CELL_BORDER_WIDTH;

    ctx.beginPath();

    // Граница ячейки
    ctx.save();
    ctx.rect(x + borderWidth / 2, y + borderWidth / 2, width - borderWidth, height - borderWidth);
    ctx.strokeStyle = options.borderColor as string;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
    ctx.restore();

    // Пользовательская заливка ячейки
    if (options.backgroundColor) {
        const style =
            typeof options.backgroundColor === 'object'
                ? drawGradient(ctx, options.backgroundColor, x, y, width, height)
                : (options.backgroundColor as string | CanvasGradient);
        ctx.save();
        ctx.rect(x + borderWidth / 2, y + borderWidth / 2, width - borderWidth, height - borderWidth);
        ctx.fillStyle = style;
        ctx.fill();
        ctx.restore();
    }

    ctx.closePath();
};
