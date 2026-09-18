import { resolveEasing } from './easings';
import type { Keyframe } from './types';

type NumericKeyframe = { offset: number; easing: (t: number) => number } & Record<string, number | ((t: number) => number)>;

/** Нормализует кейфреймы: расставляет offset, как CSS */
export function normalizeKeyframes(frames: Keyframe[]): NumericKeyframe[] {
    const result = frames.map((f, i) => ({
        ...f,
        offset: f.offset ?? i / (frames.length - 1),
        easing: resolveEasing(f.easing as any),
    })) as NumericKeyframe[];

    return result.sort((a, b) => a.offset - b.offset);
}

/** Линейная интерполяция числа */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function extractNumericProps(frame: NumericKeyframe): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(frame)) {
        if (k !== 'offset' && k !== 'easing' && typeof v === 'number') result[k] = v;
    }
    return result;
}

/**
 * Вычисляет текущие значения всех свойств по прогрессу [0..1].
 * Аналог того, что браузер делает для CSS-анимаций.
 */
export function interpolateKeyframes(frames: NumericKeyframe[], progress: number): Record<string, number> {
    // Найти соседние кейфреймы
    let fromIdx = 0;
    for (let i = frames.length - 1; i >= 0; i--) {
        if (frames[i].offset <= progress) {
            fromIdx = i;
            break;
        }
    }
    const toIdx = Math.min(fromIdx + 1, frames.length - 1);

    if (fromIdx === toIdx) {
        return extractNumericProps(frames[fromIdx]);
    }

    const from = frames[fromIdx];
    const to = frames[toIdx];

    // Локальный прогресс внутри сегмента
    const segLen = to.offset - from.offset;
    const localT = segLen === 0 ? 1 : (progress - from.offset) / segLen;
    const easedT = from.easing(localT); // easing сегмента

    const result: Record<string, number> = {};
    const allProps = new Set([...Object.keys(from), ...Object.keys(to)]);

    for (const prop of allProps) {
        if (prop === 'offset' || prop === 'easing') continue;
        const a = typeof from[prop] === 'number' ? (from[prop] as number) : 0;
        const b = typeof to[prop] === 'number' ? (to[prop] as number) : 0;
        result[prop] = lerp(a, b, easedT);
    }

    return result;
}
