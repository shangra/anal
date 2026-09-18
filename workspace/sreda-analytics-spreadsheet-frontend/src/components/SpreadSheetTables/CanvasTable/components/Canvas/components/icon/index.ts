import { DEFAULT_FONT_SIZE, LINE_HEIGHT_FACTOR } from '../../../../const';

export interface IIconAnimatableValues {
    opacity?: number; // 0–1       -> globalAlpha
    rotation?: number; // градусы   -> rotate() вокруг центра
    scale?: number; // 1 = 100%  -> равномерный scale
    scaleX?: number; // переопределяет scale по X
    scaleY?: number; // переопределяет scale по Y
    translateX?: number; // px смещение по X
    translateY?: number; // px смещение по Y
    size?: number; // px — размер иконки
    blur?: number; // px — ctx.filter blur
    borderWidth?: number; // px — ширина stroke
}

interface IOptions {
    x: number;
    y: number;
    size: number;
    icon: string;
    verticalAlign?: 'left' | 'start' | 'center' | 'end';
    fontSize?: number;
    active?: boolean;
    color?: string;
    backgroundColor?: string;
    borderWidth?: number;
    borderColor?: string;
}

export const drawIcon = (ctx: CanvasRenderingContext2D, options: IOptions, animValues?: Record<string, number>) => {
    const { x, icon } = options;
    let { y } = options;

    // ── 1. Разрешаем анимированные значения (с CSS-подобными дефолтами) ──────
    const opacity = animValues?.opacity ?? 1;
    const rotation = animValues?.rotation ?? 0;
    const uniScale = animValues?.scale ?? 1;
    const scaleX = animValues?.scaleX ?? uniScale;
    const scaleY = animValues?.scaleY ?? uniScale;
    const translateX = animValues?.translateX ?? 0;
    const translateY = animValues?.translateY ?? 0;
    const size = animValues?.size ?? options.size; // анимированный размер
    const blur = animValues?.blur ?? 0;
    const aBorderWidth = animValues?.borderWidth;

    const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
    const lineHeight = fontSize * LINE_HEIGHT_FACTOR;

    // ── 2. Debug: область строки ─────────────────────────────────────────────
    const _debugLineColor = localStorage.getItem('DBG_CVS_COMPONENT_LINE_STROKE_COLOR');
    if (_debugLineColor) {
        ctx.save();
        ctx.rect(x, y, size, lineHeight);
        ctx.strokeStyle = _debugLineColor;
        ctx.stroke();
        ctx.restore();
    }

    // Вертикальное центрирование иконки в строке
    y += (lineHeight - size) / 2;

    // ── 3. Вычисляем позицию с учётом трансляции ─────────────────────────────
    //       translateX/Y добавляют смещение поверх базовой позиции
    const drawX = x + translateX;
    const drawY = y + translateY;

    // Пивот — центр иконки (аналог transform-origin: 50% 50%)
    const pivotX = drawX + size / 2;
    const pivotY = drawY + size / 2;

    // ── 4. Внешний save: применяем opacity + blur + transform ─────────────────
    ctx.save();

    // blur -> filter (сбрасывается при restore)
    if (blur > 0) {
        ctx.filter = `blur(${blur}px)`;
    }

    // opacity -> globalAlpha
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

    // rotate + scale вокруг центра иконки — аналог CSS:
    //   transform-origin: center;
    //   transform: translateX() translateY() rotate() scaleX() scaleY();
    ctx.translate(pivotX, pivotY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-pivotX, -pivotY);

    // ── 5. Debug: область иконки ─────────────────────────────────────────────
    const _debugIconColor = localStorage.getItem('DBG_CVS_COMPONENT_ICON_STROKE_COLOR');
    if (_debugIconColor) {
        ctx.save();
        ctx.rect(drawX, drawY, size, size);
        ctx.strokeStyle = _debugIconColor;
        ctx.stroke();
        ctx.restore();
    }

    // ── 6. Парсим SVG ─────────────────────────────────────────────────────────
    const parser = new DOMParser();
    const doc = parser.parseFromString(icon, 'image/svg+xml');
    const svgElement = doc.documentElement;

    // Фоновая заливка корня SVG
    const bgFill = options.backgroundColor ?? svgElement.getAttribute('fill');
    if (bgFill && bgFill !== 'none') {
        ctx.fillStyle = bgFill;
        ctx.fill();
    }

    const [vbX = 0, vbY = 0, vbW = size, vbH = size] = (svgElement.getAttribute('viewBox')?.split(' ') ?? []).map(Number);

    // Fit SVG viewBox в квадрат size×size (object-fit: contain)
    const svgScale = Math.min(size / vbW, size / vbH);
    const scaledW = vbW * svgScale;
    const scaledH = vbH * svgScale;
    const originX = drawX + (size - scaledW) / 2;
    const originY = drawY + (size - scaledH) / 2;

    // ── 7. Внутренний save: SVG coordinate space ──────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.translate(originX, originY);
    ctx.scale(svgScale, svgScale);
    ctx.translate(-vbX, -vbY);

    const paths = svgElement.getElementsByTagName('path');
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const d = path.getAttribute('d');
        if (!d) continue;

        const path2d = new Path2D(d);

        // Fill
        const fillColor = options.color ?? path.getAttribute('fill');
        if (fillColor && fillColor !== 'none') {
            const fillOpacity = path.getAttribute('fill-opacity');
            // Перемножаем fill-opacity SVG с анимированным opacity
            if (fillOpacity != null) {
                ctx.globalAlpha = Math.max(0, Math.min(1, +fillOpacity * opacity));
            }
            ctx.fillStyle = fillColor;
            ctx.fill(path2d, (path.getAttribute('fill-rule') as CanvasFillRule) ?? undefined);
            // Восстанавливаем opacity после fill-opacity конкретного path
            if (fillOpacity != null) {
                ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
            }
        }

        // Stroke
        const strokeColor = options.borderColor ?? path.getAttribute('stroke');
        if (strokeColor && strokeColor !== 'none') {
            const strokeWidth =
                aBorderWidth ?? // анимированный
                options.borderWidth ?? // из options
                parseFloat(path.getAttribute('stroke-width') ?? '0'); // из SVG
            if (strokeWidth > 0) ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = strokeColor;
            ctx.stroke(path2d);
        }
    }

    ctx.restore(); // SVG coordinate space
    ctx.restore(); // opacity + blur + transforms
    ctx.closePath();
};
