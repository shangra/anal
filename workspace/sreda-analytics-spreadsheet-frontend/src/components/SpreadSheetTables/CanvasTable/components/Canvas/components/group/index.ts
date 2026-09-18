interface IOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    collapsed: boolean;
    /** Цвет границы ячейки */
    borderColor: string;
    /** Цвет границы ячейки */
    borderWidth?: number;
}

export const drawGroup = (ctx: CanvasRenderingContext2D, type: 'rows' | 'columns', options: IOptions) => {
    const { x, y, height, collapsed } = options;

    // Draw bracket in row header
    ctx.beginPath();
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x - 5, y);
    ctx.moveTo(x - 15, y + height);
    ctx.lineTo(x - 5, y + height);
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x - 15, y + height);
    ctx.stroke();

    // Draw collapse/expand icon
    ctx.fillStyle = options.borderColor;
    ctx.beginPath();
    ctx.arc(x - 15, (y * 2 + height) / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.beginPath();
    if (collapsed) {
        // Plus sign
        ctx.moveTo(x - 13, (y * 2 + height) / 2);
        ctx.lineTo(x - 7, (y * 2 + height) / 2);
        ctx.moveTo(x - 10, (y * 2 + height) / 2 - 3);
        ctx.lineTo(x - 10, (y * 2 + height) / 2 + 3);
    } else {
        // Minus sign
        ctx.moveTo(x - 13, (y * 2 + height) / 2);
        ctx.lineTo(x - 7, (y * 2 + height) / 2);
    }
    ctx.stroke();
};
