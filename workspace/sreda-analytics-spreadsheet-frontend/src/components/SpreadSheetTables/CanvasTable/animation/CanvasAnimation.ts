import { animationManager } from '../utils/animationManager';
import { interpolateKeyframes, normalizeKeyframes } from './interpolate';
import type { AnimationDirection, AnimationOptions, Keyframe } from './types';

type PlayState = 'idle' | 'running' | 'paused' | 'finished';

export class CanvasAnimation {
    private readonly animId = `ca_${++CanvasAnimation._counter}`;

    private static _counter = 0;

    private frames;

    private opts: Required<AnimationOptions>;

    private startTime = 0;

    private pausedAt = 0;

    private currentIteration = 0;

    private _completing = false;

    private _state: PlayState = 'idle';

    readonly finished: Promise<void>;

    private _resolve!: () => void;

    private _reject!: (r?: unknown) => void;

    constructor(keyframes: Keyframe[], options: AnimationOptions) {
        this.frames = normalizeKeyframes(keyframes);
        this.opts = {
            delay: 0,
            endDelay: 0,
            iterations: 1,
            direction: 'normal',
            fillMode: 'none',
            easing: 'ease',
            onComplete: () => {},
            onIteration: () => {},
            ...options,
        };
        this.finished = new Promise((res, rej) => {
            this._resolve = res;
            this._reject = rej;
        });
        // Подавляем unhandled rejection если finished никто не слушает
        this.finished.catch(() => {});
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    play(): this {
        if (this._state === 'paused') {
            this.startTime = performance.now() - this.pausedAt;
        } else {
            this.startTime = performance.now();
            this.currentIteration = 0;
            this._completing = false;
            this._applyFill(0);
        }
        this._state = 'running';
        // Саморегистрация — никакого внешнего RAF не нужно
        animationManager.register(this.animId, (ts) => this._processFrame(ts));
        return this;
    }

    pause(): this {
        if (this._state !== 'running') return this;
        this._state = 'paused';
        this.pausedAt = performance.now() - this.startTime;
        animationManager.unregister(this.animId);
        return this;
    }

    cancel(): this {
        this._state = 'idle';
        animationManager.unregister(this.animId);
        this._reject(new DOMException('Animation cancelled', 'AbortError'));
        return this;
    }

    finish(): this {
        this._complete();
        return this;
    }

    get playState(): PlayState {
        return this._state;
    }

    // ─── Внутренний тик (вызывается animationManager) ─────────────────────────

    private _processFrame(now: number): void {
        // Ждём endDelay — не обрабатываем новые кадры
        if (this._completing) return;

        const { duration, delay, endDelay, iterations, direction } = this.opts;
        const elapsed = now - this.startTime;

        // Период delay
        if (elapsed < delay) {
            if (this.opts.fillMode === 'backwards' || this.opts.fillMode === 'both') {
                const p = this._directed(0, 0, direction);
                this.opts.onUpdate(interpolateKeyframes(this.frames, p), p);
            }
            return;
        }

        const active = elapsed - delay;
        const totalDur = duration * (iterations === Infinity ? 1 : iterations);
        const clamped = Math.min(active, totalDur);
        const rawIter = clamped / duration;
        const newIter = Math.floor(rawIter);

        if (newIter > this.currentIteration && newIter < iterations) {
            this.currentIteration = newIter;
            this.opts.onIteration(this.currentIteration);
        }

        const iterProgress =
            // eslint-disable-next-line no-nested-ternary
            iterations === Infinity
                ? (active % duration) / duration
                : clamped >= totalDur
                ? 1
                : (clamped % duration) / duration;

        const directed = this._directed(iterProgress, newIter, direction);
        this.opts.onUpdate(interpolateKeyframes(this.frames, directed), directed);

        // Анимация завершена
        if (clamped >= totalDur && iterations !== Infinity) {
            this._completing = true;
            if (endDelay > 0) {
                setTimeout(() => this._complete(), endDelay);
            } else {
                // Синхронно, но вне текущего стека animationManager
                Promise.resolve().then(() => this._complete());
            }
        }
    }

    private _directed(t: number, iter: number, dir: AnimationDirection): number {
        const even = iter % 2 === 0;
        switch (dir) {
            case 'reverse':
                return 1 - t;
            case 'alternate':
                return even ? t : 1 - t;
            case 'alternate-reverse':
                return even ? 1 - t : t;
            default:
                return t;
        }
    }

    private _applyFill(progress: number): void {
        const { fillMode } = this.opts;
        if (fillMode === 'backwards' || fillMode === 'both') {
            this.opts.onUpdate(interpolateKeyframes(this.frames, progress), progress);
        }
    }

    private _complete(): void {
        this._state = 'finished';
        animationManager.unregister(this.animId);

        if (this.opts.fillMode === 'forwards' || this.opts.fillMode === 'both') {
            const endT = this._directed(1, (this.opts.iterations as number) - 1, this.opts.direction);
            this.opts.onUpdate(interpolateKeyframes(this.frames, endT), endT);
        }

        this.opts.onComplete();
        this._resolve();
    }
}
