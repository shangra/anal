import type { EasingFn, EasingName } from './types';

/** Реализация cubic-bezier — аналог CSS cubic-bezier(x1,y1,x2,y2) */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
    const NEWTON_ITERATIONS = 8;
    const NEWTON_MIN_SLOPE = 0.001;
    const SUBDIVISION_PRECISION = 0.0000001;
    const SUBDIVISION_MAX_ITERATIONS = 12;
    const kSplineTableSize = 11;
    const kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

    function A(a1: number, a2: number) {
        return 1.0 - 3.0 * a2 + 3.0 * a1;
    }
    function B(a1: number, a2: number) {
        return 3.0 * a2 - 6.0 * a1;
    }
    function C(a1: number) {
        return 3.0 * a1;
    }

    function calcBezier(t: number, a1: number, a2: number) {
        return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
    }
    function getSlope(t: number, a1: number, a2: number) {
        return 3.0 * A(a1, a2) * t * t + 2.0 * B(a1, a2) * t + C(a1);
    }

    // Кэш семплов для быстрого поиска T
    const sampleValues = new Float32Array(kSplineTableSize);
    if (x1 !== y1 || x2 !== y2) {
        for (let i = 0; i < kSplineTableSize; ++i) {
            sampleValues[i] = calcBezier(i * kSampleStepSize, x1, x2);
        }
    }

    function getTForX(aX: number): number {
        let intervalStart = 0.0;
        let currentSample = 1;
        const lastSample = kSplineTableSize - 1;

        for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
            intervalStart += kSampleStepSize;
        }
        --currentSample;

        const dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
        let guessForT = intervalStart + dist * kSampleStepSize;
        const initialSlope = getSlope(guessForT, x1, x2);

        if (initialSlope >= NEWTON_MIN_SLOPE) {
            for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
                const currentSlope = getSlope(guessForT, x1, x2);
                if (currentSlope === 0.0) return guessForT;
                guessForT -= (calcBezier(guessForT, x1, x2) - aX) / currentSlope;
            }
            return guessForT;
        }
        if (initialSlope === 0.0) return guessForT;

        // Бинарный поиск
        let aB = intervalStart + kSampleStepSize;
        let currentX: number;
        let i = 0;
        do {
            guessForT = intervalStart + (aB - intervalStart) / 2.0;
            currentX = calcBezier(guessForT, x1, x2) - aX;
            if (currentX > 0.0) aB = guessForT;
            else intervalStart = guessForT;
        } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
        return guessForT;
    }

    return x1 === y1 && x2 === y2 ? (t: number) => t : (t: number) => calcBezier(getTForX(t), y1, y2);
}

export const EASINGS: Record<EasingName, EasingFn> = {
    linear: (t) => t,
    ease: cubicBezier(0.25, 0.1, 0.25, 1.0),
    'ease-in': cubicBezier(0.42, 0.0, 1.0, 1.0),
    'ease-out': cubicBezier(0.0, 0.0, 0.58, 1.0),
    'ease-in-out': cubicBezier(0.42, 0.0, 0.58, 1.0),
    'ease-in-back': cubicBezier(0.36, 0.0, 0.66, -0.56),
    'ease-out-back': cubicBezier(0.34, 1.56, 0.64, 1.0),
    'ease-in-out-back': cubicBezier(0.68, -0.6, 0.32, 1.6),
    'ease-in-elastic': (t) =>
        // eslint-disable-next-line no-nested-ternary
        t === 0 ? 0 : t === 1 ? 1 : -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
    'ease-out-elastic': (t) =>
        // eslint-disable-next-line no-nested-ternary
        t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
    'ease-in-bounce': (t) => 1 - EASINGS['ease-out-bounce'](1 - t),
    'ease-out-bounce': (t) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        // eslint-disable-next-line no-return-assign
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        // eslint-disable-next-line no-return-assign
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        // eslint-disable-next-line no-return-assign
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
};

export function resolveEasing(e?: EasingName | EasingFn): EasingFn {
    if (!e) return EASINGS.ease;
    if (typeof e === 'function') return e;
    return EASINGS[e] ?? EASINGS.linear;
}
