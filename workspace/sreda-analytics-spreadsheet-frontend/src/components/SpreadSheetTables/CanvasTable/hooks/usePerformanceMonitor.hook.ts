import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
    fps: number;
    renderTime: number;
    memory?: number;
}

export const usePerformanceMonitor = (enabled: boolean = false) => {
    const metricsRef = useRef<PerformanceMetrics>({ fps: 0, renderTime: 0 });
    const frameTimesRef = useRef<number[]>([]);
    const lastFrameTimeRef = useRef<number>(performance.now());

    useEffect(() => {
        if (!enabled) return () => {};

        let rafId: number;

        const measureFrame = () => {
            const now = performance.now();
            const delta = now - lastFrameTimeRef.current;

            frameTimesRef.current.push(delta);

            // Хран им только последние 60 кадров
            if (frameTimesRef.current.length > 60) {
                frameTimesRef.current.shift();
            }

            // Вычисляем средний FPS
            const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
            metricsRef.current.fps = Math.round(1000 / avgDelta);
            metricsRef.current.renderTime = Math.round(avgDelta * 100) / 100;

            // Получаем информацию о памяти (если доступно)
            if ((performance as any).memory) {
                metricsRef.current.memory = Math.round((performance as any).memory.usedJSHeapSize / 1048576);
            }

            lastFrameTimeRef.current = now;
            rafId = requestAnimationFrame(measureFrame);
        };

        rafId = requestAnimationFrame(measureFrame);

        return () => cancelAnimationFrame(rafId);
    }, [enabled]);

    const getMetrics = () => metricsRef.current;

    const logMetrics = () => {
        const metrics = getMetrics();
        console.log(`FPS: ${metrics.fps} | Render: ${metrics.renderTime}ms | Memory: ${metrics.memory}MB`);
    };

    return { getMetrics, logMetrics };
};
