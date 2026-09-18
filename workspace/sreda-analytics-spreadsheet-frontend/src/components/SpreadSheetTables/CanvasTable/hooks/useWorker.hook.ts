import { useCallback, useEffect, useRef } from 'react';

export const useWorker = () => {
    const workerRef = useRef<Worker | null>(null);
    const callbacksRef = useRef<Map<string, (data: any) => void>>(new Map());

    useEffect(() => {
        // Создаем worker
        workerRef.current = new Worker(new URL('../workers/calculation.worker.ts', import.meta.url));

        workerRef.current.onmessage = (event) => {
            const { type, ...data } = event.data;
            const callback = callbacksRef.current.get(type);
            if (callback) {
                callback(data);
                callbacksRef.current.delete(type);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const postMessage = useCallback(<T>(type: string, payload: any, callback?: (data: T) => void) => {
        if (!workerRef.current) return;

        if (callback) {
            callbacksRef.current.set(type, callback);
        }

        workerRef.current.postMessage({ type, payload });
    }, []);

    return { postMessage };
};
