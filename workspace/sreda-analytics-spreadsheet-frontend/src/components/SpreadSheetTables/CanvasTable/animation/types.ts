export type EasingName =
    | 'linear'
    | 'ease'
    | 'ease-in'
    | 'ease-out'
    | 'ease-in-out'
    | 'ease-in-back'
    | 'ease-out-back'
    | 'ease-in-out-back'
    | 'ease-in-elastic'
    | 'ease-out-elastic'
    | 'ease-in-bounce'
    | 'ease-out-bounce';

export type EasingFn = (t: number) => number;

export type AnimationDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';

export type AnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';

/** Кейфрейм — аналог CSS @keyframes step */
export interface Keyframe {
    /** 0.0 – 1.0 (0% – 100%) */
    offset?: number;
    /** easing до следующего кейфрейма */
    easing?: EasingName | EasingFn;
    [property: string]: number | string | EasingFn | undefined;
}

/** Аналог CSS animation-* свойств */
export interface AnimationOptions {
    /** мс */
    duration: number;
    /** глобальный easing */
    easing?: EasingName | EasingFn;
    /** мс */
    delay?: number;
    /** мс */
    endDelay?: number;
    /** Infinity = бесконечно */
    iterations?: number;
    direction?: AnimationDirection;
    fillMode?: AnimationFillMode;
    onUpdate: (values: Record<string, number>, progress: number) => void;
    onComplete?: () => void;
    onIteration?: (iteration: number) => void;
}
