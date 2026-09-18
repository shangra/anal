// utils/animationManager.ts
type FrameCallback = (timestamp: number) => void;

class AnimationManager {
    private rafId: number | null = null;

    private callbacks = new Map<string, FrameCallback>();

    register(id: string, callback: FrameCallback): void {
        this.callbacks.set(id, callback);
        if (this.rafId === null) this.start();
    }

    unregister(id: string): void {
        this.callbacks.delete(id);
        if (this.callbacks.size === 0) this.stop();
    }

    isRegistered(id: string): boolean {
        return this.callbacks.has(id);
    }

    private start(): void {
        const loop = (timestamp: number) => {
            this.callbacks.forEach((cb) => cb(timestamp));
            // Повторяем только если ещё есть активные анимации
            if (this.callbacks.size > 0) {
                this.rafId = requestAnimationFrame(loop);
            } else {
                this.rafId = null;
            }
        };
        this.rafId = requestAnimationFrame(loop);
    }

    private stop(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
}

export const animationManager = new AnimationManager();
