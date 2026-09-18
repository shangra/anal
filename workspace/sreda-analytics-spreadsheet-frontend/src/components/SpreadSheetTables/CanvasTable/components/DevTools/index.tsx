import React, { useEffect, useState } from 'react';

import { profiler } from '../../utils/profiler';
import styles from './styles.module.css';

interface DevToolsProps {
    enabled?: boolean;
}

export const DevTools: React.FC<DevToolsProps> = ({ enabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [stats, setStats] = useState<any>({});
    const [fps, setFps] = useState(0);

    useEffect(() => {
        if (!enabled) return;

        const interval = setInterval(() => {
            setStats(profiler.getAllStats());
        }, 1000);

        // FPS counter
        let frames = 0;
        let lastTime = performance.now();

        const countFrames = () => {
            frames++;
            const currentTime = performance.now();

            if (currentTime >= lastTime + 1000) {
                setFps(Math.round((frames * 1000) / (currentTime - lastTime)));
                frames = 0;
                lastTime = currentTime;
            }

            requestAnimationFrame(countFrames);
        };

        const rafId = requestAnimationFrame(countFrames);

        return () => {
            clearInterval(interval);
            cancelAnimationFrame(rafId);
        };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <>
            <button className={styles.toggleButton} onClick={() => setIsOpen(!isOpen)} title="Toggle DevTools">
                🔧
            </button>

            {isOpen && (
                <div className={styles.panel}>
                    <div className={styles.header}>
                        <h3>Canvas DevTools</h3>
                        <button onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    <div className={styles.section}>
                        <h4>Performance</h4>
                        <div className={styles.metric}>
                            <span>FPS:</span>
                            <span className={fps < 30 ? styles.warning : styles.good}>{fps}</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h4>Render Times (ms)</h4>
                        {Object.entries(stats).map(([label, stat]: [string, any]) => (
                            <div key={label} className={styles.metric}>
                                <span>{label}:</span>
                                <div>
                                    <div>Avg: {stat?.avg.toFixed(2)}</div>
                                    <div>P95: {stat?.p95.toFixed(2)}</div>
                                    <div>Max: {stat?.max.toFixed(2)}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.section}>
                        <h4>Actions</h4>
                        <button onClick={() => profiler.reset()}>Reset Stats</button>
                        <button onClick={() => profiler.report()}>Log to Console</button>
                    </div>
                </div>
            )}
        </>
    );
};
