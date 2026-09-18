import { CanvasAnimation } from '../animation/CanvasAnimation';
import type { AnimationOptions, Keyframe } from '../animation/types';

export type AnimEntry = {
    anim: CanvasAnimation;
    values: Record<string, number>;
};

export type AnimCache = WeakMap<object, AnimEntry>;

export type RunAnimationOptions = Omit<AnimationOptions, 'onUpdate' | 'onComplete'> & {
    onComplete?: () => void;
};

export function runAnimation(
    cache: AnimCache,
    key: object,
    keyframes: Keyframe[],
    options: RunAnimationOptions,
    onRedraw: () => void,
): Record<string, number> | undefined {
    if (cache.has(key)) return cache.get(key)!.values;

    const entry: AnimEntry = { anim: null!, values: {} };

    entry.anim = new CanvasAnimation(keyframes, {
        ...options,
        onUpdate(values) {
            entry.values = values;
            onRedraw();
        },
        onComplete() {
            cache.delete(key);
            options.onComplete?.();
        },
    });

    cache.set(key, entry);
    entry.anim.play();

    return undefined;
}

export function stopAnimation(cache: AnimCache, key: object): void {
    const entry = cache.get(key);
    if (!entry) return;
    entry.anim.cancel();
    cache.delete(key);
}
